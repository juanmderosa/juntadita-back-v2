import { getSupabaseAdmin } from "../config/supabase.js";
import type { PaginatedData } from "../types/responses.js";
import {
  mapEventParticipantRow,
  type EventParticipant,
  type EventParticipantRow,
} from "../types/events.js";
import {
  numericToCents,
  type Expense,
  type ExpenseRow,
  type ExpenseSplitRow,
} from "../types/expenses.js";

const expenseSelect =
  "id,event_id,paid_by_participant_id,created_by_user_id,title,description,amount,currency_code,split_method,spent_at,created_at,updated_at";
const participantSelect =
  "id,event_id,user_id,email,display_name,role,status,participates_in_expenses,invited_by,created_at,updated_at";

export const expensesRepository = {
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

  return expenseRows.map((row) =>
    mapExpenseRow(row, participantsById, splitsByExpenseId.get(row.id) ?? []),
  );
}

function mapExpenseRow(
  row: ExpenseRow,
  participantsById: Map<string, EventParticipant>,
  splitRows: ExpenseSplitRow[],
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
  };
}
