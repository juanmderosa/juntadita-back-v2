import type {
  CreateEventOptionsBatchInput,
  CreateEventOptionInput,
  CreateEventInput,
  InviteParticipantsInput,
  UpdateEventOptionInput,
  UpdateEventInput,
} from "../schemas/events.schemas.js";
import { config } from "../config/config.js";
import { eventsRepository } from "../repositories/events.repository.js";
import { usersRepository } from "../repositories/users.repository.js";
import { emailService } from "./email.service.js";
import type { AuthContext } from "../types/auth.js";
import type {
  EventOption,
  EventParticipant,
  InviteEmailDelivery,
} from "../types/events.js";
import { HttpError } from "../types/httpError.js";

async function getEventIdentity(auth: AuthContext) {
  const profile = await usersRepository.findProfileByUserId(auth.userId);

  if (!profile) {
    throw new HttpError("Authenticated user profile was not found", 404);
  }

  return {
    userId: auth.userId,
    email: (auth.email ?? profile.email).trim().toLowerCase(),
    displayName: profile.displayName,
  };
}

export const eventsService = {
  async create(auth: AuthContext, input: CreateEventInput) {
    const identity = await getEventIdentity(auth);
    const event = await eventsRepository.createWithAdmin(input, identity);
    const detail = await eventsRepository.findDetailAccessibleById(
      identity.userId,
      identity.email,
      event.id,
    );

    if (!detail) throw new HttpError("Event not found after creation", 500);
    return detail;
  },

  async list(auth: AuthContext, page: number, limit: number) {
    const identity = await getEventIdentity(auth);
    return eventsRepository.listForUser(
      identity.userId,
      identity.email,
      page,
      limit,
    );
  },

  async getById(auth: AuthContext, eventId: string) {
    const identity = await getEventIdentity(auth);
    const event = await eventsRepository.findDetailAccessibleById(
      identity.userId,
      identity.email,
      eventId,
    );

    if (!event) throw new HttpError("Event not found", 404);
    return event;
  },

  async update(auth: AuthContext, eventId: string, input: UpdateEventInput) {
    const event = await this.getById(auth, eventId);

    if (event.currentUserRole !== "admin") {
      throw new HttpError("Only event admins can edit this event", 403);
    }

    const updated = await eventsRepository.updateBasicData(
      eventId,
      input,
      event.currentUserRole,
    );
    return {
      ...updated,
      optionsLocked: event.optionsLocked,
      options: event.options,
      participants: event.participants,
    };
  },

  async listOptions(auth: AuthContext, eventId: string) {
    await this.getById(auth, eventId);
    return eventsRepository.listOptions(eventId);
  },

  async createOption(
    auth: AuthContext,
    eventId: string,
    input: CreateEventOptionInput,
  ) {
    const event = await requireEditablePollEvent(auth, eventId);
    void event;
    return eventsRepository.createOption(eventId, input);
  },

  async createOptionsBatch(
    auth: AuthContext,
    eventId: string,
    input: CreateEventOptionsBatchInput,
  ) {
    await requireEditablePollEvent(auth, eventId);
    const existingOptions = await eventsRepository.listOptions(eventId);
    const existingKeys = new Set(existingOptions.map(getOptionKey));
    const batchKeys = new Set<string>();
    const uniqueInputs: CreateEventOptionInput[] = [];

    for (const option of input.options) {
      const key = getOptionInputKey(option);

      if (existingKeys.has(key) || batchKeys.has(key)) continue;

      batchKeys.add(key);
      uniqueInputs.push(option);
    }

    return eventsRepository.createOptions(eventId, uniqueInputs);
  },

  async updateOption(
    auth: AuthContext,
    eventId: string,
    optionId: string,
    input: UpdateEventOptionInput,
  ) {
    const event = await requireEditablePollEvent(auth, eventId);
    const option = await eventsRepository.findOptionById(eventId, optionId);

    if (!option) throw new HttpError("Event option not found", 404);

    const merged = mergeOption(option, input);
    validateMergedOption(merged);

    return eventsRepository.updateOption(eventId, optionId, input);
  },

  async deleteOption(auth: AuthContext, eventId: string, optionId: string) {
    await requireEditablePollEvent(auth, eventId);
    const option = await eventsRepository.findOptionById(eventId, optionId);

    if (!option) throw new HttpError("Event option not found", 404);

    await eventsRepository.deleteOption(eventId, optionId);
    return { deleted: true };
  },

  async listParticipants(auth: AuthContext, eventId: string) {
    await this.getById(auth, eventId);
    return eventsRepository.listParticipants(eventId);
  },

  async inviteParticipants(
    auth: AuthContext,
    eventId: string,
    input: InviteParticipantsInput,
  ) {
    const event = await requireAdminEvent(auth, eventId);
    if (event.type === "poll" && event.options.length === 0) {
      throw new HttpError("Poll events require at least one option before inviting", 409);
    }

    const profiles = await usersRepository.findProfilesByEmails(input.emails);
    const profileByEmail = new Map(profiles.map((profile) => [profile.email, profile]));
    const existing = await eventsRepository.findParticipantsByEmails(
      eventId,
      input.emails,
    );
    const existingByEmail = new Map(existing.map((participant) => [
      participant.email,
      participant,
    ]));
    const participants: EventParticipant[] = [];
    const emailResults: InviteEmailDelivery[] = [];

    for (const email of input.emails) {
      const profile = profileByEmail.get(email);
      const participant = existingByEmail.get(email);
      let savedParticipant: EventParticipant;
      let shouldSendEmail = true;

      if (!participant) {
        savedParticipant = await eventsRepository.createParticipant({
          eventId,
          email,
          userId: profile?.id ?? null,
          displayName: profile?.displayName ?? null,
          invitedBy: auth.userId,
        });
      } else if (participant.role === "admin") {
        savedParticipant = participant;
        shouldSendEmail = false;
      } else {
        const shouldReactivate = participant.status === "removed";
        const shouldAttachProfile = !participant.userId && profile;
        const nextStatus = shouldReactivate ? "invited" : participant.status;
        savedParticipant =
          shouldReactivate || shouldAttachProfile
            ? await eventsRepository.updateParticipantInvitation(participant.id, {
                userId: participant.userId ?? profile?.id ?? null,
                displayName: participant.displayName ?? profile?.displayName ?? null,
                status: nextStatus === "removed" ? "invited" : nextStatus,
                invitedBy: auth.userId,
              })
            : participant;
        shouldSendEmail = shouldReactivate;
      }

      participants.push(savedParticipant);

      if (!shouldSendEmail) {
        emailResults.push({
          email,
          status: "skipped",
          providerMessageId: null,
          errorMessage: null,
        });
        continue;
      }

      emailResults.push(await sendAndLogInviteEmail(eventId, email, event.title));
    }

    return { participants, emails: emailResults };
  },
};

async function requireAdminEvent(auth: AuthContext, eventId: string) {
  const event = await eventsService.getById(auth, eventId);

  if (event.currentUserRole !== "admin") {
    throw new HttpError("Only event admins can manage this event", 403);
  }

  return event;
}

async function requireEditablePollEvent(auth: AuthContext, eventId: string) {
  const event = await requireAdminEvent(auth, eventId);

  if (event.type !== "poll") {
    throw new HttpError("Fixed events do not support voting options", 400);
  }

  if (event.finalizedAt) {
    throw new HttpError("Finalized events cannot be changed", 409);
  }

  if (
    event.votingClosesAt &&
    new Date(event.votingClosesAt).getTime() <= Date.now()
  ) {
    throw new HttpError("Voting is already closed", 409);
  }

  if (await eventsRepository.hasPublishedOptions(eventId)) {
    throw new HttpError(
      "Event options are locked after invitations or votes",
      409,
    );
  }

  return event;
}

function mergeOption(
  option: EventOption,
  input: UpdateEventOptionInput,
): EventOption {
  return {
    ...option,
    label: input.label !== undefined ? input.label || null : option.label,
    startAt: input.startAt ?? option.startAt,
    endAt: input.endAt !== undefined ? input.endAt : option.endAt,
  };
}

function validateMergedOption(option: EventOption) {
  if (option.type !== "range" && option.endAt) {
    throw new HttpError("Only range options can have an end date", 400);
  }

  if (option.type === "range" && !option.endAt) {
    throw new HttpError("Range options require an end date", 400);
  }

  if (
    option.endAt &&
    new Date(option.endAt).getTime() <= new Date(option.startAt).getTime()
  ) {
    throw new HttpError("Option end must be after start", 400);
  }
}

function getOptionKey(option: EventOption) {
  return [
    option.type,
    new Date(option.startAt).toISOString(),
    option.endAt ? new Date(option.endAt).toISOString() : "",
  ].join("|");
}

function getOptionInputKey(option: CreateEventOptionInput) {
  return [
    option.type,
    new Date(option.startAt).toISOString(),
    option.type === "range" ? new Date(option.endAt).toISOString() : "",
  ].join("|");
}

async function sendAndLogInviteEmail(
  eventId: string,
  email: string,
  eventTitle: string,
): Promise<InviteEmailDelivery> {
  const logId = await eventsRepository.createEmailLog({
    eventId,
    recipientEmail: email,
    template: "event_invitation",
    provider: "resend",
  });
  const eventUrl = new URL(`/events/${eventId}`, config.appPublicUrl).toString();
  const result = await emailService.sendInviteEmail({
    to: email,
    eventTitle,
    eventUrl,
  });

  if (result.ok) {
    await eventsRepository.markEmailLogSent(logId, result.providerMessageId);
    return {
      email,
      status: "sent",
      providerMessageId: result.providerMessageId,
      errorMessage: null,
    };
  }

  await eventsRepository.markEmailLogFailed(logId, result.errorMessage);
  return {
    email,
    status: "failed",
    providerMessageId: null,
    errorMessage: result.errorMessage,
  };
}
