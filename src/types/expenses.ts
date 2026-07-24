import type { EventParticipant } from "./events.js";

export type ExpenseSplitMethod = "equal" | "custom";

export type ExpenseRow = {
  id: string;
  event_id: string;
  paid_by_participant_id: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  amount: string | number;
  currency_code: string;
  split_method: ExpenseSplitMethod;
  spent_at: string;
  created_at: string;
  updated_at: string;
};

export type ExpenseSplitRow = {
  expense_id: string;
  participant_id: string;
  amount: string | number;
};

export type ExpenseSplit = {
  participantId: string;
  amountCents: number;
  participant: EventParticipant;
};

export type ExpenseAttachmentRow = {
  id: string;
  expense_id: string;
  uploaded_by_user_id: string;
  bucket: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type ExpenseAttachment = {
  id: string;
  expenseId: string;
  uploadedByUserId: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
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
  attachments: ExpenseAttachment[];
};

export function mapExpenseAttachmentRow(row: ExpenseAttachmentRow): ExpenseAttachment {
  return {
    id: row.id,
    expenseId: row.expense_id,
    uploadedByUserId: row.uploaded_by_user_id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

export function numericToCents(value: string | number) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Expense amount is invalid");
    return Math.round(value * 100);
  }
  const [wholePart, decimalPart = ""] = value.split(".");
  const sign = wholePart.startsWith("-") ? -1 : 1;
  const whole = wholePart.replace("-", "");
  const cents = `${whole}${decimalPart.padEnd(2, "0").slice(0, 2)}`;
  return sign * Number(cents);
}
