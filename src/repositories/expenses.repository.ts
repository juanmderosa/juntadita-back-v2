import { getSupabaseAdmin } from "../config/supabase.js";
import type { PaginatedData } from "../types/responses.js";
import {
  mapEventParticipantRow,
  type EventParticipant,
  type EventParticipantRow,
} from "../types/events.js";
import {
  mapExpenseAttachmentRow,
  numericToCents,
  type Expense,
  type ExpenseAttachment,
  type ExpenseAttachmentRow,
  type ExpenseRow,
  type ExpenseSplitRow,
} from "../types/expenses.js";

const expenseSelect =
  "id,event_id,paid_by_participant_id,created_by_user_id,title,description,amount,currency_code,split_method,spent_at,created_at,updated_at";
const participantSelect =
  "id,event_id,user_id,email,display_name,role,status,participates_in_expenses,invited_by,created_at,updated_at";
const attachmentSelect =
  "id,expense_id,uploaded_by_user_id,bucket,storage_path,file_name,content_type,size_bytes,created_at";
const expenseAttachmentsBucket = "expense-attachments";

export const expensesRepository = {
  async listAllByEvent(eventId: string): Promise<Expense[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("expenses")
      .select(expenseSelect)
      .eq("event_id", eventId)
      .order("spent_at", { ascending: false })
      .overrideTypes<ExpenseRow[]>();
    if (error) throw error;
    return hydrateExpenses(eventId, data ?? []);
  },

  async listByEvent(
    eventId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedData<Expense>> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await getSupabaseAdmin()
      .from("expenses")
      .select(expenseSelect, { count: "exact" })
      .eq("event_id", eventId)
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
      .overrideTypes<ExpenseRow[]>();

    if (error) throw error;
    const expenses = await hydrateExpenses(eventId, data ?? []);
    const total = count ?? 0;
    return {
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },

  async findById(eventId: string, expenseId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("expenses")
      .select(expenseSelect)
      .eq("event_id", eventId)
      .eq("id", expenseId)
      .maybeSingle<ExpenseRow>();

    if (error) throw error;
    if (!data) return null;
    const [expense] = await hydrateExpenses(eventId, [data]);
    return expense ?? null;
  },

  async create(input: {
    eventId: string;
    paidByParticipantId: string;
    createdByUserId: string;
    title: string;
    description?: string | null;
    amountCents: number;
    splitMethod: "equal" | "custom";
    spentAt?: string;
    splits: Array<{ participantId: string; amountCents: number }>;
  }) {
    const { data, error } = await getSupabaseAdmin()
      .rpc("create_event_expense", {
        p_event_id: input.eventId,
        p_paid_by_participant_id: input.paidByParticipantId,
        p_created_by_user_id: input.createdByUserId,
        p_title: input.title,
        p_description: input.description ?? "",
        p_amount_cents: input.amountCents,
        p_split_method: input.splitMethod,
        p_spent_at: input.spentAt ?? null,
        p_splits: input.splits.map((split) => ({
          participant_id: split.participantId,
          amount_cents: split.amountCents,
        })),
      })
      .single<string>();

    if (error) throw error;
    return data;
  },

  async update(input: {
    expenseId: string;
    eventId: string;
    paidByParticipantId: string;
    title: string;
    description?: string | null;
    amountCents: number;
    splitMethod: "equal" | "custom";
    spentAt?: string;
    splits: Array<{ participantId: string; amountCents: number }>;
  }) {
    const { data, error } = await getSupabaseAdmin()
      .rpc("update_event_expense", {
        p_expense_id: input.expenseId,
        p_event_id: input.eventId,
        p_paid_by_participant_id: input.paidByParticipantId,
        p_title: input.title,
        p_description: input.description ?? "",
        p_amount_cents: input.amountCents,
        p_split_method: input.splitMethod,
        p_spent_at: input.spentAt ?? null,
        p_splits: input.splits.map((split) => ({
          participant_id: split.participantId,
          amount_cents: split.amountCents,
        })),
      })
      .single<boolean>();

    if (error) throw error;
    return data;
  },

  async delete(eventId: string, expenseId: string) {
    const { error } = await getSupabaseAdmin()
      .from("expenses")
      .delete()
      .eq("event_id", eventId)
      .eq("id", expenseId);

    if (error) throw error;
  },

  async countAttachments(expenseId: string) {
    const { count, error } = await getSupabaseAdmin()
      .from("expense_attachments")
      .select("id", { count: "exact", head: true })
      .eq("expense_id", expenseId);
    if (error) throw error;
    return count ?? 0;
  },

  async createAttachment(input: {
    expenseId: string;
    uploadedByUserId: string;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }) {
    const { data, error } = await getSupabaseAdmin()
      .from("expense_attachments")
      .insert({
        expense_id: input.expenseId,
        uploaded_by_user_id: input.uploadedByUserId,
        bucket: expenseAttachmentsBucket,
        storage_path: input.storagePath,
        file_name: input.fileName,
        content_type: input.contentType,
        size_bytes: input.sizeBytes,
      })
      .select(attachmentSelect)
      .single<ExpenseAttachmentRow>();
    if (error) throw error;
    return mapExpenseAttachmentRow(data);
  },

  async listAttachments(expenseIds: string[]) {
    if (expenseIds.length === 0) return [];
    const { data, error } = await getSupabaseAdmin()
      .from("expense_attachments")
      .select(attachmentSelect)
      .in("expense_id", expenseIds)
      .order("created_at", { ascending: true })
      .overrideTypes<ExpenseAttachmentRow[]>();
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...mapExpenseAttachmentRow(row),
      storagePath: row.storage_path,
    }));
  },

  async findAttachment(expenseId: string, attachmentId: string) {
    const attachments = await this.listAttachments([expenseId]);
    return (
      attachments.find((attachment) => attachment.id === attachmentId) ?? null
    );
  },

  async deleteAttachment(expenseId: string, attachmentId: string) {
    const { error } = await getSupabaseAdmin()
      .from("expense_attachments")
      .delete()
      .eq("expense_id", expenseId)
      .eq("id", attachmentId);
    if (error) throw error;
  },

  async uploadAttachment(
    storagePath: string,
    file: Buffer,
    contentType: string,
  ) {
    const { error } = await getSupabaseAdmin()
      .storage.from(expenseAttachmentsBucket)
      .upload(storagePath, file, { contentType, upsert: false });
    if (error) throw error;
  },

  async removeAttachments(storagePaths: string[]) {
    if (storagePaths.length === 0) return;
    const { error } = await getSupabaseAdmin()
      .storage.from(expenseAttachmentsBucket)
      .remove(storagePaths);
    if (error) throw error;
  },

  async createAttachmentSignedUrl(storagePath: string) {
    const { data, error } = await getSupabaseAdmin()
      .storage.from(expenseAttachmentsBucket)
      .createSignedUrl(storagePath, 60);
    if (error) throw error;
    return data.signedUrl;
  },
};

async function hydrateExpenses(eventId: string, expenseRows: ExpenseRow[]) {
  if (expenseRows.length === 0) return [];
  const expenseIds = expenseRows.map((expense) => expense.id);
  const { data: splitRows, error: splitsError } = await getSupabaseAdmin()
    .from("expense_splits")
    .select("expense_id,participant_id,amount")
    .in("expense_id", expenseIds)
    .overrideTypes<ExpenseSplitRow[]>();
  if (splitsError) throw splitsError;
  const attachments = await expensesRepository.listAttachments(expenseIds);

  const participantIds = new Set<string>();
  for (const expense of expenseRows)
    participantIds.add(expense.paid_by_participant_id);
  for (const split of splitRows ?? []) participantIds.add(split.participant_id);
  const { data: participantRows, error: participantsError } =
    await getSupabaseAdmin()
      .from("event_participants")
      .select(participantSelect)
      .eq("event_id", eventId)
      .in("id", [...participantIds])
      .overrideTypes<EventParticipantRow[]>();
  if (participantsError) throw participantsError;

  const participantsById = new Map(
    (participantRows ?? []).map((row) => [row.id, mapEventParticipantRow(row)]),
  );
  const splitsByExpenseId = new Map<string, ExpenseSplitRow[]>();
  for (const split of splitRows ?? []) {
    const splits = splitsByExpenseId.get(split.expense_id) ?? [];
    splits.push(split);
    splitsByExpenseId.set(split.expense_id, splits);
  }
  const attachmentsByExpenseId = new Map<
    string,
    Array<ExpenseAttachment & { storagePath: string }>
  >();

  for (const attachment of attachments) {
    const expenseAttachments =
      attachmentsByExpenseId.get(attachment.expenseId) ?? [];
    expenseAttachments.push(attachment);
    attachmentsByExpenseId.set(attachment.expenseId, expenseAttachments);
  }

  return expenseRows.map((row) =>
    mapExpenseRow(
      row,
      participantsById,
      splitsByExpenseId.get(row.id) ?? [],
      attachmentsByExpenseId.get(row.id) ?? [],
    ),
  );
}

function mapExpenseRow(
  row: ExpenseRow,
  participantsById: Map<string, EventParticipant>,
  splitRows: ExpenseSplitRow[],
  attachments: Array<ExpenseAttachment & { storagePath: string }>,
): Expense {
  const paidBy = participantsById.get(row.paid_by_participant_id);
  if (!paidBy) throw new Error("Expense payer is missing from the event");

  return {
    id: row.id,
    eventId: row.event_id,
    paidByParticipantId: row.paid_by_participant_id,
    paidBy,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description,
    amountCents: numericToCents(row.amount),
    currencyCode: row.currency_code,
    splitMethod: row.split_method,
    spentAt: row.spent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    splits: splitRows.map((split) => {
      const participant = participantsById.get(split.participant_id);
      if (!participant)
        throw new Error("Expense split participant is missing from the event");
      return {
        participantId: split.participant_id,
        amountCents: numericToCents(split.amount),
        participant,
      };
    }),
    attachments: attachments.map(
      ({ storagePath: _storagePath, ...attachment }) => attachment,
    ),
  };
}
