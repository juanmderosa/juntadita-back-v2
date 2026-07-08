export type EventType = "poll" | "fixed";
export type EventParticipantRole = "admin" | "guest";

export type EventRow = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  type: EventType;
  currency_code: string;
  timezone: string;
  voting_closes_at: string | null;
  fixed_start_at: string | null;
  fixed_end_at: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventSummary = {
  id: string;
  createdBy: string;
  title: string;
  description: string | null;
  type: EventType;
  currentUserRole: EventParticipantRole;
  currencyCode: string;
  timezone: string;
  votingClosesAt: string | null;
  fixedStartAt: string | null;
  fixedEndAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventDetail = EventSummary;

export function mapEventRow(
  row: EventRow,
  currentUserRole: EventParticipantRole,
): EventDetail {
  return {
    id: row.id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    type: row.type,
    currentUserRole,
    currencyCode: row.currency_code,
    timezone: row.timezone,
    votingClosesAt: row.voting_closes_at,
    fixedStartAt: row.fixed_start_at,
    fixedEndAt: row.fixed_end_at,
    finalizedAt: row.finalized_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
