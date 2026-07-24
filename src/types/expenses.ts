import type { EventParticipant } from "./events.js";

export type ExpenseSplitMethod = "equal" | "custom";

export type ExpenseRow = {
  id: string;
  event_id: string;
  paid_by_participant_id: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  amount: string;
  currency_code: string;
  split_method: ExpenseSplitMethod;
  spent_at: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplitRow = {
  expense_id: string;
  participant_id: string;
  amount: string;
};

export type ExpenseSplit = {
  participantId: string;
  amountCents: number;
  participant: EventParticipant;
};

export type Expense = {
  id: string;
  eventId: string;
  paidByParticipantId: string;
  paidBy: EventParticipant;
  createdByUserId: string;
  title: string;
  description: string | null;
  amountCents: number;
  currencyCode: string;
  splitMethod: ExpenseSplitMethod;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
  splits: ExpenseSplit[];
};

export function numericToCents(value: string) {
  const [wholePart, decimalPart = ""] = value.split(".");
  const sign = wholePart.startsWith("-") ? -1 : 1;
  const whole = wholePart.replace("-", "");
  const cents = `${whole}${decimalPart.padEnd(2, "0").slice(0, 2)}`;
  return sign * Number(cents);
}
