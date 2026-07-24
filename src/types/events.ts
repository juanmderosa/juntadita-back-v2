export type EventType = "poll" | "fixed";
export type EventParticipantRole = "admin" | "guest";
export type EventParticipantStatus = "invited" | "joined" | "removed";
export type EventOptionType = "date" | "datetime" | "range";

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
  winningOption: EventOption | null;
  createdAt: string;
  updatedAt: string;
};

export type EventOptionRow = {
  id: string;
  event_id: string;
  type: EventOptionType;
  label: string | null;
  start_at: string;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventOption = {
  id: string;
  eventId: string;
  type: EventOptionType;
  label: string | null;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventParticipantRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: EventParticipantRole;
  status: EventParticipantStatus;
  participates_in_expenses: boolean;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventParticipant = {
  id: string;
  eventId: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: EventParticipantRole;
  status: EventParticipantStatus;
  participatesInExpenses: boolean;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InviteEmailDeliveryStatus = "sent" | "failed" | "skipped";

export type InviteEmailDelivery = {
  email: string;
  status: InviteEmailDeliveryStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
};

export type InviteParticipantsResult = {
  participants: EventParticipant[];
  emails: InviteEmailDelivery[];
};

export type EventResultStatus = "finalized" | "tie_pending" | "no_winner";

export type EventResult = {
  status: EventResultStatus;
  winningOptionId: string | null;
  totalVotes: number;
  decidedBy: "system" | "admin";
  decidedAt: string;
};

export type VotingOption = EventOption & {
  votesCount: number;
  availabilityPercent: number;
};

export type VotingState = {
  isOpen: boolean;
  votingClosesAt: string;
  eligibleParticipants: number;
  selectedOptionIds: string[];
  options: VotingOption[];
  result: EventResult | null;
  tiedOptionIds: string[];
};

export type EventDetail = EventSummary & {
  optionsLocked: boolean;
  options: EventOption[];
  participants: EventParticipant[];
};

export function mapEventRow(
  row: EventRow,
  currentUserRole: EventParticipantRole,
): EventSummary {
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
    winningOption: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventOptionRow(row: EventOptionRow): EventOption {
  return {
    id: row.id,
    eventId: row.event_id,
    type: row.type,
    label: row.label,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventParticipantRow(
  row: EventParticipantRow,
): EventParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    participatesInExpenses: row.participates_in_expenses,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
