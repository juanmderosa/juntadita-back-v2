import type { EventParticipant } from "./events.js";

export type PaymentStatus = "active" | "voided";

export type PaymentRow = {
  id: string;
  event_id: string;
  from_participant_id: string;
  to_participant_id: string;
  created_by_user_id: string;
  amount: string | number;
  currency_code: string;
  paid_at: string;
  note: string | null;
  status: PaymentStatus;
  voided_at: string | null;
  voided_by_user_id: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  eventId: string;
  fromParticipantId: string;
  toParticipantId: string;
  fromParticipant: EventParticipant;
  toParticipant: EventParticipant;
  createdByUserId: string;
  amountCents: number;
  currencyCode: string;
  paidAt: string;
  note: string | null;
  status: PaymentStatus;
  voidedAt: string | null;
  voidedByUserId: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ParticipantBalance = {
  participant: EventParticipant;
  balanceCents: number;
};

export type PaymentSuggestion = {
  fromParticipantId: string;
  toParticipantId: string;
  amountCents: number;
};

export type PaymentOverview = {
  balances: ParticipantBalance[];
  suggestions: PaymentSuggestion[];
  payments: Payment[];
};
