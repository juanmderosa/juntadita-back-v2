import { eventsService } from "./events.service.js";
import { expensesRepository } from "../repositories/expenses.repository.js";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from "../schemas/expenses.schemas.js";
import type { AuthContext } from "../types/auth.js";
import type { EventDetail, EventParticipant } from "../types/events.js";
import { HttpError } from "../types/httpError.js";

type ResolvedSplit = { participantId: string; amountCents: number };

export const expensesService = {
  async list(auth: AuthContext, eventId: string, page: number, limit: number) {
    await eventsService.getById(auth, eventId);
    return expensesRepository.listByEvent(eventId, page, limit);
  },

  async getById(auth: AuthContext, eventId: string, expenseId: string) {
    await eventsService.getById(auth, eventId);
    const expense = await expensesRepository.findById(eventId, expenseId);
    if (!expense) throw new HttpError("Expense not found", 404);
    return expense;
  },

  async create(auth: AuthContext, eventId: string, input: CreateExpenseInput) {
    const event = await eventsService.getById(auth, eventId);
    const splits = resolveSplits(event, input);
    const expenseId = await expensesRepository.create({
      eventId,
      createdByUserId: auth.userId,
      ...input,
      splits,
    });
    return this.getById(auth, eventId, expenseId);
  },

  async update(
    auth: AuthContext,
    eventId: string,
    expenseId: string,
    input: UpdateExpenseInput,
  ) {
    const [event, expense] = await Promise.all([
      eventsService.getById(auth, eventId),
      expensesRepository.findById(eventId, expenseId),
    ]);
    if (!expense) throw new HttpError("Expense not found", 404);
    ensureCanManageExpense(event, expense.createdByUserId, auth.userId);
    const splits = resolveSplits(event, input);
    const updated = await expensesRepository.update({
      expenseId,
      eventId,
      ...input,
      splits,
    });
    if (!updated) throw new HttpError("Expense not found", 404);
    return this.getById(auth, eventId, expenseId);
  },

  async delete(auth: AuthContext, eventId: string, expenseId: string) {
    const [event, expense] = await Promise.all([
      eventsService.getById(auth, eventId),
      expensesRepository.findById(eventId, expenseId),
    ]);
    if (!expense) throw new HttpError("Expense not found", 404);
    ensureCanManageExpense(event, expense.createdByUserId, auth.userId);
    await expensesRepository.delete(eventId, expenseId);
    return { deleted: true };
  },
};

function ensureCanManageExpense(
  event: EventDetail,
  createdByUserId: string,
  userId: string,
) {
  if (event.currentUserRole === "admin" || createdByUserId === userId) return;
  throw new HttpError(
    "Only the expense creator or event admin can manage this expense",
    403,
  );
}

function resolveSplits(
  event: EventDetail,
  input: CreateExpenseInput | UpdateExpenseInput,
): ResolvedSplit[] {
  const activeParticipants = new Map(
    event.participants
      .filter((participant) => participant.status !== "removed")
      .map((participant) => [participant.id, participant]),
  );
  const payer = activeParticipants.get(input.paidByParticipantId);
  if (!payer)
    throw new HttpError(
      "Expense payer must be an active event participant",
      400,
    );

  const eligibleParticipants = new Map(
    [...activeParticipants.values()]
      .filter((participant) => participant.participatesInExpenses)
      .map((participant) => [participant.id, participant]),
  );

  if (input.splitMethod === "equal") {
    const participants = input.participantIds.map((participantId) =>
      getEligibleParticipant(eligibleParticipants, participantId),
    );
    if (input.amountCents < participants.length) {
      throw new HttpError(
        "Expense amount is too small to split by whole cents",
        400,
      );
    }
    return splitEqually(input.amountCents, participants);
  }

  const splits = input.splits.map((split) => ({
    ...split,
    participant: getEligibleParticipant(
      eligibleParticipants,
      split.participantId,
    ),
  }));
  const totalCents = splits.reduce((sum, split) => sum + split.amountCents, 0);
  if (totalCents !== input.amountCents) {
    throw new HttpError(
      "Expense splits must add up to the expense amount",
      400,
    );
  }
  return splits.map(({ participantId, amountCents }) => ({
    participantId,
    amountCents,
  }));
}

function getEligibleParticipant(
  eligibleParticipants: Map<string, EventParticipant>,
  participantId: string,
) {
  const participant = eligibleParticipants.get(participantId);
  if (!participant) {
    throw new HttpError(
      "Expense splits must use active expense participants",
      400,
    );
  }
  return participant;
}

function splitEqually(
  amountCents: number,
  participants: EventParticipant[],
): ResolvedSplit[] {
  const sortedParticipants = [...participants].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const baseAmountCents = Math.floor(amountCents / sortedParticipants.length);
  const remainderCents = amountCents % sortedParticipants.length;

  return sortedParticipants.map((participant, index) => ({
    participantId: participant.id,
    amountCents: baseAmountCents + (index < remainderCents ? 1 : 0),
  }));
}
