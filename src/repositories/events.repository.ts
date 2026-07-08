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

const eventSelect =
  "id,created_by,title,description,type,currency_code,timezone,voting_closes_at,fixed_start_at,fixed_end_at,finalized_at,created_at,updated_at";
const optionSelect = "id,event_id,type,label,start_at,end_at,created_at,updated_at";
const participantSelect =
  "id,event_id,user_id,email,display_name,role,status,invited_by,created_at,updated_at";

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
    return {
      data: (data ?? []).flatMap((membership) => {
        const event = getNestedEvent(membership.events);
        return event ? [mapEventRow(event, membership.role)] : [];
      }),
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

  async findOptionById(
    eventId: string,
    optionId: string,
  ): Promise<EventOption | null> {
    const { data, error } = await getSupabaseAdmin()
      .from("event_options")
      .select(optionSelect)
      .eq("event_id", eventId)
      .eq("id", optionId)
      .maybeSingle<EventOptionRow>();

    if (error) throw error;
    return data ? mapEventOptionRow(data) : null;
  },

  async createOption(
    eventId: string,
    input: CreateEventOptionInput,
  ): Promise<EventOption> {
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

  async createOptions(
    eventId: string,
    inputs: CreateEventOptionInput[],
  ): Promise<EventOption[]> {
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
