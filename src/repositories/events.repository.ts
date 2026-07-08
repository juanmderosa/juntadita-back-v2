import { getSupabaseAdmin } from "../config/supabase.js";
import type { PaginatedData } from "../types/responses.js";
import {
  mapEventRow,
  type EventDetail,
  type EventParticipantRole,
  type EventRow,
  type EventSummary,
} from "../types/events.js";
import type {
  CreateEventInput,
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

  async updateBasicData(
    eventId: string,
    input: UpdateEventInput,
    role: EventParticipantRole,
  ): Promise<EventDetail> {
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
};
