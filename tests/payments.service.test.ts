import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "../src/types/auth.js";

const mocks = vi.hoisted(() => ({
  getById: vi.fn(),
  listPayments: vi.fn(),
  listExpenses: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  void: vi.fn(),
}));
vi.mock("../src/services/events.service.js", () => ({
  eventsService: { getById: mocks.getById },
}));
vi.mock("../src/repositories/payments.repository.js", () => ({
  paymentsRepository: {
    listByEvent: mocks.listPayments,
    create: mocks.create,
    findById: mocks.findById,
    void: mocks.void,
  },
}));
vi.mock("../src/repositories/expenses.repository.js", () => ({
  expensesRepository: { listAllByEvent: mocks.listExpenses },
}));
import { paymentsService } from "../src/services/payments.service.js";

const auth = { userId: "user-a", email: "a@example.com" } as AuthContext;
const participant = (
  id: string,
  userId: string | null = id === "a" ? "user-a" : "user-b",
) => ({
  id,
  userId,
  email: `${id}@example.com`,
  status: "joined",
  participatesInExpenses: true,
});
const event = {
  id: "event-id",
  currentUserRole: "guest",
  financialStatus: "payments_enabled",
  participants: [participant("a"), participant("b")],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getById.mockResolvedValue(event);
  mocks.listExpenses.mockResolvedValue([]);
  mocks.listPayments.mockResolvedValue([]);
});

describe("payments service", () => {
  it("calculates balances from expenses and active payments, then suggests deterministic settlements", async () => {
    mocks.listExpenses.mockResolvedValue([
      {
        paidByParticipantId: "a",
        amountCents: 3000,
        splits: [
          { participantId: "a", amountCents: 1500 },
          { participantId: "b", amountCents: 1500 },
        ],
      },
    ]);
    mocks.listPayments.mockResolvedValue([
      {
        fromParticipantId: "b",
        toParticipantId: "a",
        amountCents: 500,
        status: "active",
      },
    ]);
    const overview = await paymentsService.getOverview(auth, "event-id");
    expect(
      overview.balances.map((item) => [item.participant.id, item.balanceCents]),
    ).toEqual([
      ["a", 1000],
      ["b", -1000],
    ]);
    expect(overview.suggestions).toEqual([
      { fromParticipantId: "b", toParticipantId: "a", amountCents: 1000 },
    ]);
  });

  it("only lets the payer register their own payment, except an admin for a guest without account", async () => {
    await expect(
      paymentsService.create(auth, "event-id", {
        fromParticipantId: "b",
        toParticipantId: "a",
        amountCents: 500,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    mocks.create.mockResolvedValue("payment-id");
    mocks.findById.mockResolvedValue({ id: "payment-id" });
    await expect(
      paymentsService.create(auth, "event-id", {
        fromParticipantId: "a",
        toParticipantId: "b",
        amountCents: 500,
      }),
    ).resolves.toMatchObject({ id: "payment-id" });
  });

  it("requires enabled payments and keeps a voided payment in history", async () => {
    mocks.getById.mockResolvedValueOnce({
      ...event,
      financialStatus: "collecting_expenses",
    });
    await expect(
      paymentsService.create(auth, "event-id", {
        fromParticipantId: "a",
        toParticipantId: "b",
        amountCents: 500,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    mocks.findById
      .mockResolvedValueOnce({
        id: "payment-id",
        status: "active",
        createdByUserId: auth.userId,
      })
      .mockResolvedValueOnce({ id: "payment-id", status: "voided" });
    await expect(
      paymentsService.void(auth, "event-id", "payment-id", {
        voidReason: "Duplicado",
      }),
    ).resolves.toMatchObject({ status: "voided" });
    expect(mocks.void).toHaveBeenCalledWith(
      "payment-id",
      auth.userId,
      "Duplicado",
    );
  });
});
