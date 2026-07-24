import { eventsService } from "./events.service.js";
import { paymentsRepository } from "../repositories/payments.repository.js";
import { expensesRepository } from "../repositories/expenses.repository.js";
import type { AuthContext } from "../types/auth.js";
import { HttpError } from "../types/httpError.js";
import type {
  CreatePaymentInput,
  VoidPaymentInput,
} from "../schemas/payments.schemas.js";
import type { EventDetail, EventParticipant } from "../types/events.js";
import type {
  ParticipantBalance,
  PaymentOverview,
  PaymentSuggestion,
} from "../types/payments.js";

export const paymentsService = {
  async getOverview(
    auth: AuthContext,
    eventId: string,
  ): Promise<PaymentOverview> {
    const event = await eventsService.getById(auth, eventId);
    const [payments, expenses] = await Promise.all([
      paymentsRepository.listByEvent(eventId),
      expensesRepository.listAllByEvent(eventId),
    ]);
    const balances = calculateBalances(event, expenses, payments);
    return { balances, suggestions: suggestSettlements(balances), payments };
  },
  async create(auth: AuthContext, eventId: string, input: CreatePaymentInput) {
    const event = await eventsService.getById(auth, eventId);
    ensurePaymentsEnabled(event);

    const participants = new Map(
      event.participants
        .filter(
          (participant) =>
            participant.status !== "removed" &&
            participant.participatesInExpenses,
        )
        .map((participant) => [participant.id, participant]),
    );

    const from = participants.get(input.fromParticipantId);
    const to = participants.get(input.toParticipantId);

    if (!from || !to)
      throw new HttpError(
        "Payment participants must be active financial participants",
        400,
      );

    const currentParticipant = event.participants.find(
      (participant) =>
        participant.userId === auth.userId && participant.status !== "removed",
    );

    const isAdmin = event.currentUserRole === "admin";
    const canRegister =
      currentParticipant?.id === from.id || (isAdmin && from.userId === null);

    if (!canRegister)
      throw new HttpError(
        "Only the payer can register this payment, except an admin for guests without an account",
        403,
      );

    const paymentId = await paymentsRepository.create({
      eventId,
      createdByUserId: auth.userId,
      ...input,
    });

    const payment = await paymentsRepository.findById(eventId, paymentId);

    if (!payment) throw new HttpError("Payment not found after creation", 500);

    return payment;
  },

  async void(
    auth: AuthContext,
    eventId: string,
    paymentId: string,
    input: VoidPaymentInput,
  ) {
    const [event, payment] = await Promise.all([
      eventsService.getById(auth, eventId),
      paymentsRepository.findById(eventId, paymentId),
    ]);

    if (!payment) throw new HttpError("Payment not found", 404);

    if (payment.status === "voided")
      throw new HttpError("Payment is already voided", 409);

    if (
      event.currentUserRole !== "admin" &&
      payment.createdByUserId !== auth.userId
    )
      throw new HttpError(
        "Only the payment creator or event admin can void this payment",
        403,
      );

    await paymentsRepository.void(paymentId, auth.userId, input.voidReason);
    const updated = await paymentsRepository.findById(eventId, paymentId);

    if (!updated) throw new HttpError("Payment not found", 404);
    return updated;
  },
};

function ensurePaymentsEnabled(event: EventDetail) {
  if (event.financialStatus !== "payments_enabled")
    throw new HttpError("Payments are not enabled for this event", 409);
}

function calculateBalances(
  event: EventDetail,
  expenses: Array<{
    paidByParticipantId: string;
    amountCents: number;
    splits: Array<{ participantId: string; amountCents: number }>;
  }>,
  payments: PaymentOverview["payments"],
): ParticipantBalance[] {
  const participants = event.participants.filter(
    (participant) =>
      participant.status !== "removed" && participant.participatesInExpenses,
  );

  const balances = new Map(
    participants.map((participant) => [participant.id, 0]),
  );

  for (const expense of expenses) {
    balances.set(
      expense.paidByParticipantId,
      (balances.get(expense.paidByParticipantId) ?? 0) + expense.amountCents,
    );
    for (const split of expense.splits)
      balances.set(
        split.participantId,
        (balances.get(split.participantId) ?? 0) - split.amountCents,
      );
  }

  for (const payment of payments) {
    if (payment.status !== "active") continue;
    balances.set(
      payment.fromParticipantId,
      (balances.get(payment.fromParticipantId) ?? 0) - payment.amountCents,
    );
    balances.set(
      payment.toParticipantId,
      (balances.get(payment.toParticipantId) ?? 0) + payment.amountCents,
    );
  }

  return participants.map((participant) => ({
    participant,
    balanceCents: balances.get(participant.id) ?? 0,
  }));
}

function suggestSettlements(
  balances: ParticipantBalance[],
): PaymentSuggestion[] {
  const debtors = balances
    .filter((item) => item.balanceCents < 0)
    .map((item) => ({ ...item, remaining: -item.balanceCents }))
    .sort((a, b) => a.participant.id.localeCompare(b.participant.id));

  const creditors = balances
    .filter((item) => item.balanceCents > 0)
    .map((item) => ({ ...item, remaining: item.balanceCents }))
    .sort((a, b) => a.participant.id.localeCompare(b.participant.id));

  const suggestions: PaymentSuggestion[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remaining, creditor.remaining);

    suggestions.push({
      fromParticipantId: debtor.participant.id,
      toParticipantId: creditor.participant.id,
      amountCents,
    });

    debtor.remaining -= amountCents;
    creditor.remaining -= amountCents;

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return suggestions;
}
