import { getSupabaseAdmin } from "../config/supabase.js";
import type { PaginatedData } from "../types/responses.js";
import {
  mapEventOptionRow,
  mapEventParticipantRow,
  mapEventRow,
  type EventDetail,
  type EventOption,
  type EventOptionRow,
  type EventParticipantRole,
  type EventParticipantRow,
  type EventRow,
  type EventSummary,
} from "../types/events.js";
import type {
  CreateEventInput,
  CreateEventOptionInput,
  UpdateEventOptionInput,
  UpdateEventInput,
} from "../schemas/events.schemas.js";

type CreatorData = {
  userId: string;
  email: string;
  displayName: string | null;
};

type EventMembershipRow = {
  role: EventParticipantRole;
  events: EventRow | EventRow[];
};
type EventResultWinnerRow = { event_id: string; winning_option_id: string };

const eventSelect =
  "id,created_by,title,description,type,currency_code,timezone,voting_closes_at,fixed_start_at,fixed_end_at,finalized_at,financial_status,financial_state_changed_at,financial_state_changed_by,financial_participants_locked_at,created_at,updated_at";
const optionSelect = "id,event_id,type,label,start_at,end_at,created_at,updated_at";
const participantSelect =
  "id,event_id,user_id,email,display_name,role,status,participates_in_expenses,invited_by,created_at,updated_at";

function getNestedEvent(value: EventMembershipRow["events"]) {
  return Array.isArray(value) ? value[0] : value;
}

function membershipFilter(userId: string, email: string) {
  const escapedEmail = email.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `user_id.eq.${userId},email.eq."${escapedEmail}"`;
}

export const eventsRepository = {
  async createWithAdmin(input: CreateEventInput, creator: CreatorData) {
    const isPoll = input.type === "poll";
    const { data, error } = await getSupabaseAdmin()
      .rpc("create_event_with_admin", {
        p_created_by: creator.userId,
        p_creator_email: creator.email,
        p_creator_display_name: creator.displayName,
        p_title: input.title,
        p_description: input.description || null,
        p_type: input.type,
        p_voting_closes_at: isPoll ? input.votingClosesAt : null,
        p_fixed_start_at: isPoll ? null : input.fixedStartAt,
        p_fixed_end_at: isPoll ? null : (input.fixedEndAt ?? null),
      })
      .single<EventRow>();

    if (error) throw error;
    return mapEventRow(data, "admin");
  },

  async listForUser(
    userId: string,
    email: string,
    page: number,
    limit: number,
  ): Promise<PaginatedData<EventSummary>> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, error, count } = await getSupabaseAdmin()
      .from("event_participants")
      .select(`role,events!inner(${eventSelect})`, { count: "exact" })
      .neq("status", "removed")
      .or(membershipFilter(userId, email))
      .order("created_at", { referencedTable: "events", ascending: false })
      .range(from, to)
      .overrideTypes<EventMembershipRow[]>();

    if (error) throw error;

    const total = count ?? 0;
    const summaries = (data ?? []).flatMap((membership) => {
      const event = getNestedEvent(membership.events);
      return event ? [mapEventRow(event, membership.role)] : [];
    });
    const summariesWithWinner = await addWinningOptions(summaries);
    return {
      data: summariesWithWinner,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },

  async findAccessibleById(userId: string, email: string, eventId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .select(`role,events!inner(${eventSelect})`)
      .eq("event_id", eventId)
      .neq("status", "removed")
      .or(membershipFilter(userId, email))
      .limit(1)
      .maybeSingle<EventMembershipRow>();

    if (error) throw error;
    if (!data) return null;

    const event = getNestedEvent(data.events);
    return event ? mapEventRow(event, data.role) : null;
  },

  async findDetailAccessibleById(
    userId: string,
    email: string,
    eventId: string,
  ): Promise<EventDetail | null> {
    const event = await this.findAccessibleById(userId, email, eventId);
    if (!event) return null;

    const [options, participants, optionsLocked] = await Promise.all([
      this.listOptions(eventId),
      this.listParticipants(eventId),
      this.hasPublishedOptions(eventId),
    ]);

    return { ...event, optionsLocked, options, participants };
  },

  async updateBasicData(
    eventId: string,
    input: UpdateEventInput,
    role: EventParticipantRole,
  ): Promise<EventSummary> {
    const updates: { title?: string; description?: string | null } = {};
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) {
      updates.description = input.description || null;
    }

    const { data, error } = await getSupabaseAdmin()
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select(eventSelect)
      .single<EventRow>();

    if (error) throw error;
    return mapEventRow(data, role);
  },

  async listOptions(eventId: string): Promise<EventOption[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("event_options")
      .select(optionSelect)
      .eq("event_id", eventId)
      .order("start_at", { ascending: true })
      .overrideTypes<EventOptionRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapEventOptionRow);
  },

  async findOptionById(eventId: string, optionId: string): Promise<EventOption | null> {
    const { data, error } = await getSupabaseAdmin()
      .from("event_options")
      .select(optionSelect)
      .eq("event_id", eventId)
      .eq("id", optionId)
      .maybeSingle<EventOptionRow>();

    if (error) throw error;
    return data ? mapEventOptionRow(data) : null;
  },

  async createOption(eventId: string, input: CreateEventOptionInput): Promise<EventOption> {
    const { data, error } = await getSupabaseAdmin()
      .from("event_options")
      .insert({
        event_id: eventId,
        type: input.type,
        label: input.label || null,
        start_at: input.startAt,
        end_at: input.type === "range" ? input.endAt : null,
      })
      .select(optionSelect)
      .single<EventOptionRow>();

    if (error) throw error;
    return mapEventOptionRow(data);
  },

  async createOptions(eventId: string, inputs: CreateEventOptionInput[]): Promise<EventOption[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await getSupabaseAdmin()
      .from("event_options")
      .insert(
        inputs.map((input) => ({
          event_id: eventId,
          type: input.type,
          label: input.label || null,
          start_at: input.startAt,
          end_at: input.type === "range" ? input.endAt : null,
        })),
      )
      .select(optionSelect)
      .order("start_at", { ascending: true })
      .overrideTypes<EventOptionRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapEventOptionRow);
  },

  async updateOption(
    eventId: string,
    optionId: string,
    input: UpdateEventOptionInput,
  ): Promise<EventOption> {
    const updates: {
      label?: string | null;
      start_at?: string;
      end_at?: string | null;
    } = {};

    if (input.label !== undefined) updates.label = input.label || null;
    if (input.startAt !== undefined) updates.start_at = input.startAt;
    if (input.endAt !== undefined) updates.end_at = input.endAt;

    const { data, error } = await getSupabaseAdmin()
      .from("event_options")
      .update(updates)
      .eq("event_id", eventId)
      .eq("id", optionId)
      .select(optionSelect)
      .single<EventOptionRow>();

    if (error) throw error;
    return mapEventOptionRow(data);
  },

  async deleteOption(eventId: string, optionId: string) {
    const { error } = await getSupabaseAdmin()
      .from("event_options")
      .delete()
      .eq("event_id", eventId)
      .eq("id", optionId);

    if (error) throw error;
  },

  async hasPublishedOptions(eventId: string) {
    const [hasSentInvitations, hasVotes] = await Promise.all([
      this.hasSentInvitations(eventId),
      this.hasVotes(eventId),
    ]);

    return hasSentInvitations || hasVotes;
  },

  async hasSentInvitations(eventId: string) {
    const { error, count } = await getSupabaseAdmin()
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("template", "event_invitation")
      .eq("status", "sent");

    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async hasVotes(eventId: string) {
    const { error, count } = await getSupabaseAdmin()
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId);

    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async findActiveParticipant(eventId: string, userId: string, email: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .select(participantSelect)
      .eq("event_id", eventId)
      .neq("status", "removed")
      .or(membershipFilter(userId, email))
      .limit(1)
      .maybeSingle<EventParticipantRow>();
    if (error) throw error;
    return data ? mapEventParticipantRow(data) : null;
  },

  async replaceVotes(eventId: string, participantId: string, optionIds: string[]) {
    const { error } = await getSupabaseAdmin().rpc("replace_poll_votes", {
      p_event_id: eventId,
      p_participant_id: participantId,
      p_option_ids: optionIds,
    });
    if (error) throw error;
  },

  async finalizeIfDue(eventId: string) {
    const { error } = await getSupabaseAdmin().rpc("finalize_poll_event_if_due", {
      p_event_id: eventId,
    });
    if (error) throw error;
  },

  async resolveTie(eventId: string, optionId: string, adminUserId: string) {
    const { error } = await getSupabaseAdmin().rpc("resolve_poll_tie", {
      p_event_id: eventId,
      p_option_id: optionId,
      p_admin_user_id: adminUserId,
    });
    if (error) throw error;
  },

  async listVoteRows(eventId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("votes")
      .select("participant_id,option_id")
      .eq("event_id", eventId)
      .overrideTypes<Array<{ participant_id: string; option_id: string }>>();
    if (error) throw error;
    return data ?? [];
  },

  async getResult(eventId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_results")
      .select("status,winning_option_id,total_votes,decided_by,decided_at")
      .eq("event_id", eventId)
      .maybeSingle<{
        status: "finalized" | "tie_pending" | "no_winner";
        winning_option_id: string | null;
        total_votes: number;
        decided_by: "system" | "admin";
        decided_at: string;
      }>();
    if (error) throw error;
    return data;
  },

  async listTiedOptionIds(eventId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_result_ties")
      .select("option_id")
      .eq("event_id", eventId)
      .is("resolved_at", null)
      .overrideTypes<Array<{ option_id: string }>>();
    if (error) throw error;
    return (data ?? []).map((row) => row.option_id);
  },

  async listParticipants(eventId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .select(participantSelect)
      .eq("event_id", eventId)
      .neq("status", "removed")
      .order("created_at", { ascending: true })
      .overrideTypes<EventParticipantRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapEventParticipantRow);
  },

  async setFinancialStatus(
    eventId: string,
    userId: string,
    financialStatus: "collecting_expenses" | "payments_enabled",
  ) {
    const { data, error } = await getSupabaseAdmin()
      .rpc("set_event_financial_status", {
        p_event_id: eventId,
        p_changed_by: userId,
        p_financial_status: financialStatus,
      })
      .single<EventRow>();
    if (error) throw error;
    return data;
  },

  async findParticipantById(eventId: string, participantId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .select(participantSelect)
      .eq("event_id", eventId)
      .eq("id", participantId)
      .neq("status", "removed")
      .maybeSingle<EventParticipantRow>();

    if (error) throw error;
    return data ? mapEventParticipantRow(data) : null;
  },

  async setExpenseParticipation(
    eventId: string,
    participantId: string,
    participatesInExpenses: boolean,
  ) {
    const { data, error } = await getSupabaseAdmin()
      .rpc("set_event_participant_expense_participation", {
        p_event_id: eventId,
        p_participant_id: participantId,
        p_participates: participatesInExpenses,
      })
      .single<ExpenseParticipationUpdateResult>();

    if (error) throw error;
    return data;
  },

  async findParticipantsByEmails(eventId: string, emails: string[]) {
    if (emails.length === 0) return [];

    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .select(participantSelect)
      .eq("event_id", eventId)
      .in("email", emails)
      .overrideTypes<EventParticipantRow[]>();

    if (error) throw error;
    return (data ?? []).map(mapEventParticipantRow);
  },

  async createParticipant(input: {
    eventId: string;
    email: string;
    userId: string | null;
    displayName: string | null;
    invitedBy: string;
  }) {
    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .insert({
        event_id: input.eventId,
        user_id: input.userId,
        email: input.email,
        display_name: input.displayName,
        role: "guest",
        status: "invited",
        invited_by: input.invitedBy,
      })
      .select(participantSelect)
      .single<EventParticipantRow>();

    if (error) throw error;
    return mapEventParticipantRow(data);
  },

  async updateParticipantInvitation(
    participantId: string,
    input: {
      userId?: string | null;
      displayName?: string | null;
      status?: "invited" | "joined";
      invitedBy: string;
    },
  ) {
    const updates: {
      user_id?: string | null;
      display_name?: string | null;
      status?: "invited" | "joined";
      invited_by: string;
    } = { invited_by: input.invitedBy };

    if (input.userId !== undefined) updates.user_id = input.userId;
    if (input.displayName !== undefined) updates.display_name = input.displayName;
    if (input.status !== undefined) updates.status = input.status;

    const { data, error } = await getSupabaseAdmin()
      .from("event_participants")
      .update(updates)
      .eq("id", participantId)
      .select(participantSelect)
      .single<EventParticipantRow>();

    if (error) throw error;
    return mapEventParticipantRow(data);
  },

  async createEmailLog(input: {
    eventId: string;
    recipientEmail: string;
    template: string;
    provider: string;
  }) {
    const { data, error } = await getSupabaseAdmin()
      .from("email_logs")
      .insert({
        event_id: input.eventId,
        recipient_email: input.recipientEmail,
        template: input.template,
        provider: input.provider,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) throw error;
    return data.id;
  },

  async markEmailLogSent(logId: string, providerMessageId: string | null) {
    const { error } = await getSupabaseAdmin()
      .from("email_logs")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logId);

    if (error) throw error;
  },

  async markEmailLogFailed(logId: string, errorMessage: string) {
    const { error } = await getSupabaseAdmin()
      .from("email_logs")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", logId);

    if (error) throw error;
  },
};

type ExpenseParticipationUpdateResult = {
  status: "updated" | "participant_not_found" | "payments_exist" | "sole_splits";
  expenses?: Array<{ id: string; title: string }>;
};

async function addWinningOptions(events: EventSummary[]) {
  if (events.length === 0) return events;
  const { data: resultRows, error: resultsError } = await getSupabaseAdmin()
    .from("event_results")
    .select("event_id,winning_option_id")
    .in(
      "event_id",
      events.map((event) => event.id),
    )
    .eq("status", "finalized")
    .not("winning_option_id", "is", null)
    .overrideTypes<EventResultWinnerRow[]>();
  if (resultsError) throw resultsError;
  const optionIds = (resultRows ?? []).map((row) => row.winning_option_id);
  if (optionIds.length === 0) return events;
  const { data: optionRows, error: optionsError } = await getSupabaseAdmin()
    .from("event_options")
    .select(optionSelect)
    .in("id", optionIds)
    .overrideTypes<EventOptionRow[]>();
  if (optionsError) throw optionsError;
  const optionsById = new Map((optionRows ?? []).map((row) => [row.id, mapEventOptionRow(row)]));
  const winnerIdByEvent = new Map(
    (resultRows ?? []).map((row) => [row.event_id, row.winning_option_id]),
  );
  return events.map((event) => ({
    ...event,
    winningOption: optionsById.get(winnerIdByEvent.get(event.id) ?? "") ?? null,
  }));
}
