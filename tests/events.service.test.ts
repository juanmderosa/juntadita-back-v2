import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "../src/types/auth.js";
import type { EventDetail } from "../src/types/events.js";

const mocks = vi.hoisted(() => ({
  createWithAdmin: vi.fn(),
  listForUser: vi.fn(),
  findAccessibleById: vi.fn(),
  updateBasicData: vi.fn(),
  findProfileByUserId: vi.fn(),
}));

vi.mock("../src/repositories/events.repository.js", () => ({
  eventsRepository: {
    createWithAdmin: mocks.createWithAdmin,
    listForUser: mocks.listForUser,
    findAccessibleById: mocks.findAccessibleById,
    updateBasicData: mocks.updateBasicData,
  },
}));

vi.mock("../src/repositories/users.repository.js", () => ({
  usersRepository: {
    findProfileByUserId: mocks.findProfileByUserId,
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
} as EventDetail;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findProfileByUserId.mockResolvedValue({
    email: "profile@example.com",
    displayName: "Juan",
  });
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
    mocks.findAccessibleById.mockResolvedValue(null);

    await expect(eventsService.getById(auth, "private-id")).rejects.toMatchObject({
      statusCode: 404,
      message: "Event not found",
    });
  });

  it("allows admins and rejects guests when editing", async () => {
    mocks.findAccessibleById
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
});
