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
  findOptionById: vi.fn(),
  updateOption: vi.fn(),
  deleteOption: vi.fn(),
  listOptions: vi.fn(),
  listParticipants: vi.fn(),
  findParticipantsByEmails: vi.fn(),
  createParticipant: vi.fn(),
  updateParticipantInvitation: vi.fn(),
  createEmailLog: vi.fn(),
  markEmailLogSent: vi.fn(),
  markEmailLogFailed: vi.fn(),
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
    findOptionById: mocks.findOptionById,
    updateOption: mocks.updateOption,
    deleteOption: mocks.deleteOption,
    listOptions: mocks.listOptions,
    listParticipants: mocks.listParticipants,
    findParticipantsByEmails: mocks.findParticipantsByEmails,
    createParticipant: mocks.createParticipant,
    updateParticipantInvitation: mocks.updateParticipantInvitation,
    createEmailLog: mocks.createEmailLog,
    markEmailLogSent: mocks.markEmailLogSent,
    markEmailLogFailed: mocks.markEmailLogFailed,
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
  currentUserRole: "admin",
  title: "Cena",
  type: "poll",
  votingClosesAt: "2026-08-01T20:00:00Z",
  finalizedAt: null,
  options: [],
  participants: [],
} as EventDetail;

beforeEach(() => {
  vi.clearAllMocks();
    mocks.findProfileByUserId.mockResolvedValue({
      email: "profile@example.com",
      displayName: "Juan",
    });
    mocks.findDetailAccessibleById.mockResolvedValue(adminEvent);
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
});
