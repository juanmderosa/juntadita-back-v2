import { getSupabaseAdmin } from "../config/supabase.js";
import {
  mapEventParticipantRow,
  type EventParticipantRow,
} from "../types/events.js";
import { numericToCents } from "../types/expenses.js";
import type { Payment, PaymentRow } from "../types/payments.js";

const paymentSelect =
  "id,event_id,from_participant_id,to_participant_id,created_by_user_id,amount,currency_code,paid_at,note,status,voided_at,voided_by_user_id,void_reason,created_at,updated_at";
const participantSelect =
  "id,event_id,user_id,email,display_name,role,status,participates_in_expenses,invited_by,created_at,updated_at";

export const paymentsRepository = {
  async listByEvent(eventId: string): Promise<Payment[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("payments")
      .select(paymentSelect)
      .eq("event_id", eventId)
      .order("paid_at", { ascending: false })
      .overrideTypes<PaymentRow[]>();

    if (error) throw error;
    return hydrate(eventId, data ?? []);
  },

  async create(input: {
    eventId: string;
    fromParticipantId: string;
    toParticipantId: string;
    createdByUserId: string;
    amountCents: number;
    paidAt?: string;
    note?: string | null;
  }) {
    const { data, error } = await getSupabaseAdmin()
      .rpc("create_event_payment", {
        p_event_id: input.eventId,
        p_from_participant_id: input.fromParticipantId,
        p_to_participant_id: input.toParticipantId,
        p_created_by_user_id: input.createdByUserId,
        p_amount_cents: input.amountCents,
        p_paid_at: input.paidAt ?? null,
        p_note: input.note ?? null,
      })
      .single<string>();

    if (error) throw error;
    return data;
  },

  async findById(eventId: string, paymentId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("payments")
      .select(paymentSelect)
      .eq("event_id", eventId)
      .eq("id", paymentId)
      .maybeSingle<PaymentRow>();

    if (error) throw error;
    if (!data) return null;

    return (await hydrate(eventId, [data]))[0] ?? null;
  },

  async void(paymentId: string, userId: string, reason: string) {
    const { error } = await getSupabaseAdmin()
      .from("payments")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by_user_id: userId,
        void_reason: reason,
      })
      .eq("id", paymentId)
      .eq("status", "active");
    if (error) throw error;
  },
};

async function hydrate(eventId: string, rows: PaymentRow[]) {
  if (rows.length === 0) return [];
  const participantIds = [
    ...new Set(
      rows.flatMap((row) => [row.from_participant_id, row.to_participant_id]),
    ),
  ];

  const { data, error } = await getSupabaseAdmin()
    .from("event_participants")
    .select(participantSelect)
    .eq("event_id", eventId)
    .in("id", participantIds)
    .overrideTypes<EventParticipantRow[]>();

  if (error) throw error;
  const participants = new Map(
    (data ?? []).map((row) => [row.id, mapEventParticipantRow(row)]),
  );

  return rows.map((row) => {
    const fromParticipant = participants.get(row.from_participant_id);
    const toParticipant = participants.get(row.to_participant_id);

    if (!fromParticipant || !toParticipant)
      throw new Error("Payment participant is missing from the event");

    return {
      id: row.id,
      eventId: row.event_id,
      fromParticipantId: row.from_participant_id,
      toParticipantId: row.to_participant_id,
      fromParticipant,
      toParticipant,
      createdByUserId: row.created_by_user_id,
      amountCents: numericToCents(row.amount),
      currencyCode: row.currency_code,
      paidAt: row.paid_at,
      note: row.note,
      status: row.status,
      voidedAt: row.voided_at,
      voidedByUserId: row.voided_by_user_id,
      voidReason: row.void_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}
