import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "../src/types/auth.js";
import type { EventDetail } from "../src/types/events.js";

const mocks = vi.hoisted(() => ({
  createWithAdmin: vi.fn(),
  listForUser: vi.fn(),
  findAccessibleById: vi.fn(),
  findDetailAccessibleById: vi.fn(),
  updateBasicData: vi.fn(),
  createOption: vi.fn(),
  createOptions: vi.fn(),
  findOptionById: vi.fn(),
  updateOption: vi.fn(),
  deleteOption: vi.fn(),
  hasPublishedOptions: vi.fn(),
  listOptions: vi.fn(),
  listParticipants: vi.fn(),
  findParticipantsByEmails: vi.fn(),
  createParticipant: vi.fn(),
  updateParticipantInvitation: vi.fn(),
  createEmailLog: vi.fn(),
  markEmailLogSent: vi.fn(),
  markEmailLogFailed: vi.fn(),
  findActiveParticipant: vi.fn(),
  replaceVotes: vi.fn(),
  finalizeIfDue: vi.fn(),
  listVoteRows: vi.fn(),
  getResult: vi.fn(),
  listTiedOptionIds: vi.fn(),
  resolveTie: vi.fn(),
  findProfileByUserId: vi.fn(),
  findProfilesByEmails: vi.fn(),
  sendInviteEmail: vi.fn(),
}));

vi.mock("../src/repositories/events.repository.js", () => ({
  eventsRepository: {
    createWithAdmin: mocks.createWithAdmin,
    listForUser: mocks.listForUser,
    findAccessibleById: mocks.findAccessibleById,
    findDetailAccessibleById: mocks.findDetailAccessibleById,
    updateBasicData: mocks.updateBasicData,
    createOption: mocks.createOption,
    createOptions: mocks.createOptions,
    findOptionById: mocks.findOptionById,
    updateOption: mocks.updateOption,
    deleteOption: mocks.deleteOption,
    hasPublishedOptions: mocks.hasPublishedOptions,
    listOptions: mocks.listOptions,
    listParticipants: mocks.listParticipants,
    findParticipantsByEmails: mocks.findParticipantsByEmails,
    createParticipant: mocks.createParticipant,
    updateParticipantInvitation: mocks.updateParticipantInvitation,
    createEmailLog: mocks.createEmailLog,
    markEmailLogSent: mocks.markEmailLogSent,
    markEmailLogFailed: mocks.markEmailLogFailed,
    findActiveParticipant: mocks.findActiveParticipant,
    replaceVotes: mocks.replaceVotes,
    finalizeIfDue: mocks.finalizeIfDue,
    listVoteRows: mocks.listVoteRows,
    getResult: mocks.getResult,
    listTiedOptionIds: mocks.listTiedOptionIds,
    resolveTie: mocks.resolveTie,
  },
}));

vi.mock("../src/repositories/users.repository.js", () => ({
  usersRepository: {
    findProfileByUserId: mocks.findProfileByUserId,
    findProfilesByEmails: mocks.findProfilesByEmails,
  },
}));

vi.mock("../src/services/email.service.js", () => ({
  emailService: {
    sendInviteEmail: mocks.sendInviteEmail,
  },
}));

import { eventsService } from "../src/services/events.service.js";

const auth = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "USER@example.com",
} as AuthContext;

const adminEvent = {
  id: "event-id",
  createdBy: auth.userId,
  currentUserRole: "admin",
  title: "Cena",
  description: null,
  type: "poll",
  currencyCode: "ARS",
  timezone: "America/Buenos_Aires",
  votingClosesAt: "2026-08-01T20:00:00Z",
  fixedStartAt: null,
  fixedEndAt: null,
  finalizedAt: null,
  createdAt: "2026-07-06T15:00:00Z",
  updatedAt: "2026-07-06T15:00:00Z",
  optionsLocked: false,
  options: [],
  participants: [],
} satisfies EventDetail;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findProfileByUserId.mockResolvedValue({
    email: "profile@example.com",
    displayName: "Juan",
  });
  mocks.findDetailAccessibleById.mockResolvedValue(adminEvent);
  mocks.hasPublishedOptions.mockResolvedValue(false);
  mocks.findActiveParticipant.mockResolvedValue({ id: "participant-id" });
  mocks.listVoteRows.mockResolvedValue([]);
  mocks.getResult.mockResolvedValue(null);
  mocks.listTiedOptionIds.mockResolvedValue([]);
});

describe("events service", () => {
  it("creates an event with normalized creator identity", async () => {
    mocks.createWithAdmin.mockResolvedValue(adminEvent);
    const input = {
      type: "poll" as const,
      title: "Cena",
      votingClosesAt: "2026-08-01T20:00:00Z",
    };

    await expect(eventsService.create(auth, input)).resolves.toBe(adminEvent);
    expect(mocks.createWithAdmin).toHaveBeenCalledWith(input, {
      userId: auth.userId,
      email: "user@example.com",
      displayName: "Juan",
    });
  });

  it("uses profile email when auth email is absent", async () => {
    mocks.listForUser.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await eventsService.list({ ...auth, email: null } as AuthContext, 1, 20);

    expect(mocks.listForUser).toHaveBeenCalledWith(
      auth.userId,
      "profile@example.com",
      1,
      20,
    );
  });

  it("returns 404 without revealing a private event", async () => {
    mocks.findDetailAccessibleById.mockResolvedValue(null);

    await expect(eventsService.getById(auth, "private-id")).rejects.toMatchObject({
      statusCode: 404,
      message: "Event not found",
    });
  });

  it("allows admins and rejects guests when editing", async () => {
    mocks.findDetailAccessibleById
      .mockResolvedValueOnce(adminEvent)
      .mockResolvedValueOnce({ ...adminEvent, currentUserRole: "guest" });
    mocks.updateBasicData.mockResolvedValue({ ...adminEvent, title: "Nueva" });

    await expect(
      eventsService.update(auth, "event-id", { title: "Nueva" }),
    ).resolves.toMatchObject({ title: "Nueva" });
    expect(mocks.updateBasicData).toHaveBeenCalledWith(
      "event-id",
      { title: "Nueva" },
      "admin",
    );

    await expect(
      eventsService.update(auth, "event-id", { title: "No permitido" }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("blocks option management for guests, fixed events and closed polls", async () => {
    mocks.findDetailAccessibleById.mockResolvedValueOnce({
      ...adminEvent,
      currentUserRole: "guest",
    });
    await expect(
      eventsService.createOption(auth, "event-id", {
        type: "date",
        startAt: "2026-08-01T03:00:00Z",
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    mocks.findDetailAccessibleById.mockResolvedValueOnce({
      ...adminEvent,
      type: "fixed",
    });
    await expect(
      eventsService.createOption(auth, "event-id", {
        type: "date",
        startAt: "2026-08-01T03:00:00Z",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    mocks.findDetailAccessibleById.mockResolvedValueOnce({
      ...adminEvent,
      votingClosesAt: "2020-01-01T00:00:00Z",
    });
    await expect(
      eventsService.createOption(auth, "event-id", {
        type: "date",
        startAt: "2026-08-01T03:00:00Z",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("blocks option management after invitations or votes", async () => {
    mocks.hasPublishedOptions.mockResolvedValue(true);

    await expect(
      eventsService.createOption(auth, "event-id", {
        type: "date",
        startAt: "2026-08-01T03:00:00Z",
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Event options are locked after invitations or votes",
    });

    await expect(
      eventsService.createOptionsBatch(auth, "event-id", {
        options: [{ type: "date", startAt: "2026-08-01T03:00:00Z" }],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("creates batch options omitting duplicated existing and request options", async () => {
    mocks.listOptions.mockResolvedValue([
      {
        id: "existing-id",
        eventId: "event-id",
        type: "datetime",
        label: null,
        startAt: "2026-08-02T00:00:00.000Z",
        endAt: null,
        createdAt: "2026-07-06T15:00:00Z",
        updatedAt: "2026-07-06T15:00:00Z",
      },
    ]);
    mocks.createOptions.mockResolvedValue([
      {
        id: "new-id",
        eventId: "event-id",
        type: "datetime",
        label: null,
        startAt: "2026-08-03T00:00:00.000Z",
        endAt: null,
        createdAt: "2026-07-06T15:00:00Z",
        updatedAt: "2026-07-06T15:00:00Z",
      },
    ]);

    await expect(
      eventsService.createOptionsBatch(auth, "event-id", {
        options: [
          {
            type: "datetime",
            startAt: "2026-08-02T00:00:00Z",
          },
          {
            type: "datetime",
            startAt: "2026-08-03T00:00:00Z",
          },
          {
            type: "datetime",
            startAt: "2026-08-03T00:00:00.000Z",
          },
        ],
      }),
    ).resolves.toHaveLength(1);

    expect(mocks.createOptions).toHaveBeenCalledWith("event-id", [
      {
        type: "datetime",
        startAt: "2026-08-03T00:00:00Z",
      },
    ]);
  });

  it("blocks batch option management for guests, fixed events and closed polls", async () => {
    const input = {
      options: [{ type: "date" as const, startAt: "2026-08-01T03:00:00Z" }],
    };

    mocks.findDetailAccessibleById.mockResolvedValueOnce({
      ...adminEvent,
      currentUserRole: "guest",
    });
    await expect(
      eventsService.createOptionsBatch(auth, "event-id", input),
    ).rejects.toMatchObject({ statusCode: 403 });

    mocks.findDetailAccessibleById.mockResolvedValueOnce({
      ...adminEvent,
      type: "fixed",
    });
    await expect(
      eventsService.createOptionsBatch(auth, "event-id", input),
    ).rejects.toMatchObject({ statusCode: 400 });

    mocks.findDetailAccessibleById.mockResolvedValueOnce({
      ...adminEvent,
      votingClosesAt: "2020-01-01T00:00:00Z",
    });
    await expect(
      eventsService.createOptionsBatch(auth, "event-id", input),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("validates merged option range updates", async () => {
    mocks.findOptionById.mockResolvedValue({
      id: "option-id",
      eventId: "event-id",
      type: "range",
      label: null,
      startAt: "2026-08-01T20:00:00Z",
      endAt: "2026-08-01T22:00:00Z",
      createdAt: "2026-07-06T15:00:00Z",
      updatedAt: "2026-07-06T15:00:00Z",
    });

    await expect(
      eventsService.updateOption(auth, "event-id", "option-id", {
        endAt: "2026-08-01T19:00:00Z",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("invites participants and logs sent email", async () => {
    mocks.findDetailAccessibleById.mockResolvedValue({
      ...adminEvent,
      options: [
        {
          id: "option-id",
          eventId: "event-id",
          type: "date",
          label: null,
          startAt: "2026-08-01T03:00:00Z",
          endAt: null,
          createdAt: "2026-07-06T15:00:00Z",
          updatedAt: "2026-07-06T15:00:00Z",
        },
      ],
    });
    mocks.findProfilesByEmails.mockResolvedValue([
      {
        id: "550e8400-e29b-41d4-a716-446655440099",
        email: "ana@example.com",
        displayName: "Ana",
      },
    ]);
    mocks.findParticipantsByEmails.mockResolvedValue([]);
    mocks.createParticipant.mockResolvedValue({
      id: "participant-id",
      eventId: "event-id",
      userId: "550e8400-e29b-41d4-a716-446655440099",
      email: "ana@example.com",
      displayName: "Ana",
      role: "guest",
      status: "invited",
      invitedBy: auth.userId,
      createdAt: "2026-07-06T15:00:00Z",
      updatedAt: "2026-07-06T15:00:00Z",
    });
    mocks.createEmailLog.mockResolvedValue("log-id");
    mocks.sendInviteEmail.mockResolvedValue({
      ok: true,
      providerMessageId: "resend-id",
    });

    await expect(
      eventsService.inviteParticipants(auth, "event-id", {
        emails: ["ana@example.com"],
      }),
    ).resolves.toMatchObject({
      emails: [{ email: "ana@example.com", status: "sent" }],
    });
    expect(mocks.markEmailLogSent).toHaveBeenCalledWith("log-id", "resend-id");
  });

  it("blocks inviting participants to an empty poll", async () => {
    await expect(
      eventsService.inviteParticipants(auth, "event-id", {
        emails: ["ana@example.com"],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Poll events require at least one option before inviting",
    });
  });

  it("replaces a participant's selected poll options and returns the voting state", async () => {
    const event = {
      ...adminEvent,
      participants: [{ id: "participant-id", status: "joined" }],
      options: [{
        id: "option-id",
        eventId: "event-id",
        type: "date" as const,
        label: null,
        startAt: "2026-08-01T03:00:00Z",
        endAt: null,
        createdAt: "2026-07-06T15:00:00Z",
        updatedAt: "2026-07-06T15:00:00Z",
      }],
    };
    mocks.findDetailAccessibleById.mockResolvedValue(event);
    mocks.listVoteRows.mockResolvedValue([
      { participant_id: "participant-id", option_id: "option-id" },
    ]);

    await expect(
      eventsService.replaceVotes(auth, "event-id", { optionIds: ["option-id"] }),
    ).resolves.toMatchObject({ selectedOptionIds: ["option-id"] });
    expect(mocks.replaceVotes).toHaveBeenCalledWith("event-id", "participant-id", ["option-id"]);
  });

  it("finalizes a due poll when its voting state is requested", async () => {
    const dueEvent = { ...adminEvent, votingClosesAt: "2020-01-01T00:00:00Z" };
    mocks.findDetailAccessibleById.mockResolvedValue(dueEvent);

    await expect(eventsService.getVoting(auth, "event-id")).resolves.toMatchObject({
      isOpen: false,
    });
    expect(mocks.finalizeIfDue).toHaveBeenCalledWith("event-id");
  });

  it("only allows an admin to resolve a pending tie", async () => {
    mocks.getResult.mockResolvedValue({
      status: "finalized",
      winning_option_id: "option-id",
      total_votes: 3,
      decided_by: "admin",
      decided_at: "2026-08-02T00:00:00Z",
    });

    await eventsService.resolveTie(auth, "event-id", { optionId: "option-id" });
    expect(mocks.resolveTie).toHaveBeenCalledWith("event-id", "option-id", auth.userId);
  });
});
