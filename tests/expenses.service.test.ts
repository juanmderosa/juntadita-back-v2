import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "../src/types/auth.js";
import type { EventDetail } from "../src/types/events.js";

const mocks = vi.hoisted(() => ({
  getEventById: vi.fn(),
  listByEvent: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  countAttachments: vi.fn(),
  listAttachments: vi.fn(),
  uploadAttachment: vi.fn(),
  createAttachment: vi.fn(),
  findAttachment: vi.fn(),
  removeAttachments: vi.fn(),
  deleteAttachment: vi.fn(),
  createAttachmentSignedUrl: vi.fn(),
}));

vi.mock("../src/services/events.service.js", () => ({
  eventsService: { getById: mocks.getEventById },
}));

vi.mock("../src/repositories/expenses.repository.js", () => ({
  expensesRepository: {
    listByEvent: mocks.listByEvent,
    findById: mocks.findById,
    create: mocks.create,
    update: mocks.update,
    delete: mocks.delete,
    countAttachments: mocks.countAttachments,
    listAttachments: mocks.listAttachments,
    uploadAttachment: mocks.uploadAttachment,
    createAttachment: mocks.createAttachment,
    findAttachment: mocks.findAttachment,
    removeAttachments: mocks.removeAttachments,
    deleteAttachment: mocks.deleteAttachment,
    createAttachmentSignedUrl: mocks.createAttachmentSignedUrl,
  },
}));

import { expensesService } from "../src/services/expenses.service.js";

const auth = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "juan@example.com",
} as AuthContext;

const participant = (id: string, participatesInExpenses = true) => ({
  id,
  eventId: "event-id",
  userId: null,
  email: `${id}@example.com`,
  displayName: null,
  role: id === "payer" ? "admin" : "guest",
  status: "invited",
  participatesInExpenses,
  invitedBy: auth.userId,
  createdAt: "2026-07-17T00:00:00Z",
  updatedAt: "2026-07-17T00:00:00Z",
});

const event = {
  id: "event-id",
  createdBy: auth.userId,
  title: "Cena",
  description: null,
  type: "fixed",
  currentUserRole: "admin",
  currencyCode: "ARS",
  timezone: "America/Buenos_Aires",
  votingClosesAt: null,
  fixedStartAt: "2026-08-01T20:00:00Z",
  fixedEndAt: null,
  finalizedAt: null,
  winningOption: null,
  createdAt: "2026-07-17T00:00:00Z",
  updatedAt: "2026-07-17T00:00:00Z",
  optionsLocked: false,
  options: [],
  participants: [participant("payer"), participant("a"), participant("b"), participant("excluded", false)],
} satisfies EventDetail;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEventById.mockResolvedValue(event);
  mocks.create.mockResolvedValue("expense-id");
  mocks.countAttachments.mockResolvedValue(0);
  mocks.listAttachments.mockResolvedValue([]);
  mocks.createAttachment.mockResolvedValue({ id: "attachment-id", fileName: "ticket.pdf" });
  mocks.findById.mockResolvedValue({
    id: "expense-id",
    createdByUserId: auth.userId,
    amountCents: 101,
  });
});

describe("expenses service", () => {
  it("creates equal splits with a deterministic cent remainder", async () => {
    await expensesService.create(auth, "event-id", {
      paidByParticipantId: "payer",
      title: "Cena",
      amountCents: 101,
      splitMethod: "equal",
      participantIds: ["b", "a"],
    });

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      splits: [
        { participantId: "a", amountCents: 51 },
        { participantId: "b", amountCents: 50 },
      ],
    }));
  });

  it("rejects excluded participants and custom splits with an invalid total", async () => {
    await expect(
      expensesService.create(auth, "event-id", {
        paidByParticipantId: "payer",
        title: "Cena",
        amountCents: 100,
        splitMethod: "equal",
        participantIds: ["excluded"],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      expensesService.create(auth, "event-id", {
        paidByParticipantId: "payer",
        title: "Cena",
        amountCents: 100,
        splitMethod: "custom",
        splits: [{ participantId: "a", amountCents: 99 }],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Expense splits must add up to the expense amount",
    });
  });

  it("only lets an expense creator or admin update and delete", async () => {
    const guestEvent = { ...event, currentUserRole: "guest" as const };
    mocks.getEventById.mockResolvedValue(guestEvent);
    mocks.findById.mockResolvedValue({ id: "expense-id", createdByUserId: "other-user" });

    const input = {
      paidByParticipantId: "payer",
      title: "Cena",
      amountCents: 100,
      splitMethod: "equal" as const,
      participantIds: ["a"],
    };
    await expect(expensesService.update(auth, "event-id", "expense-id", input)).rejects.toMatchObject({ statusCode: 403 });
    await expect(expensesService.delete(auth, "event-id", "expense-id")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("uploads one attachment and removes the storage object if metadata fails", async () => {
    const file = {
      buffer: Buffer.from("receipt"),
      originalname: "ticket.pdf",
      mimetype: "application/pdf",
      size: 7,
    } as Express.Multer.File;

    await expect(
      expensesService.uploadAttachment(auth, "event-id", "expense-id", file),
    ).resolves.toMatchObject({ id: "attachment-id" });
    expect(mocks.uploadAttachment).toHaveBeenCalledWith(
      expect.stringMatching(/^event-id\/expense-id\/.+\.pdf$/),
      file.buffer,
      "application/pdf",
    );

    mocks.createAttachment.mockRejectedValueOnce(new Error("metadata failed"));
    await expect(
      expensesService.uploadAttachment(auth, "event-id", "expense-id", file),
    ).rejects.toThrow("metadata failed");
    expect(mocks.removeAttachments).toHaveBeenCalledWith([
      expect.stringMatching(/^event-id\/expense-id\/.+\.pdf$/),
    ]);
  });

  it("limits attachments and only creates signed download URLs for event participants", async () => {
    const file = {
      buffer: Buffer.from("receipt"),
      originalname: "ticket.pdf",
      mimetype: "application/pdf",
      size: 7,
    } as Express.Multer.File;
    mocks.countAttachments.mockResolvedValueOnce(5);
    await expect(
      expensesService.uploadAttachment(auth, "event-id", "expense-id", file),
    ).rejects.toMatchObject({ statusCode: 400 });

    mocks.findAttachment.mockResolvedValue({
      id: "attachment-id",
      storagePath: "event-id/expense-id/file.pdf",
    });
    mocks.createAttachmentSignedUrl.mockResolvedValue("https://signed.example/file.pdf");
    await expect(
      expensesService.getAttachmentDownloadUrl(
        auth,
        "event-id",
        "expense-id",
        "attachment-id",
      ),
    ).resolves.toMatchObject({ url: "https://signed.example/file.pdf" });
  });
});
