import { z } from "zod";
import {
  isoDateTimeSchema,
  paginationQuerySchema,
  positiveAmountInCentsSchema,
  uuidSchema,
} from "./common.schemas.js";

const expenseTitleSchema = z
  .string()
  .trim()
  .min(1, "Expense title is required")
  .max(120, "Expense title must be at most 120 characters");

const expenseDescriptionSchema = z
  .string()
  .trim()
  .max(2000, "Expense description must be at most 2000 characters")
  .nullable()
  .optional();

const participantIdsSchema = z
  .array(uuidSchema)
  .min(1, "At least one participant is required")
  .max(100, "At most 100 participants can be selected")
  .refine((participantIds) => new Set(participantIds).size === participantIds.length, {
    message: "Participants must be unique",
  });

const expenseBaseSchema = z.object({
  paidByParticipantId: uuidSchema,
  title: expenseTitleSchema,
  description: expenseDescriptionSchema,
  amountCents: positiveAmountInCentsSchema.max(
    999_999_999_999,
    "Expense amount is too large",
  ),
  spentAt: isoDateTimeSchema.optional(),
});

export const createExpenseSchema = z.discriminatedUnion("splitMethod", [
  expenseBaseSchema.extend({
    splitMethod: z.literal("equal"),
    participantIds: participantIdsSchema,
  }).strict(),
  expenseBaseSchema.extend({
    splitMethod: z.literal("custom"),
    splits: z.array(z.object({
      participantId: uuidSchema,
      amountCents: positiveAmountInCentsSchema,
    }).strict())
      .min(1, "At least one split is required")
      .max(100, "At most 100 splits can be created")
      .refine(
        (splits) => new Set(splits.map((split) => split.participantId)).size === splits.length,
        "Split participants must be unique",
      ),
  }).strict(),
]);

export const updateExpenseSchema = createExpenseSchema;
export const expenseParamsSchema = z.object({
  eventId: uuidSchema,
  expenseId: uuidSchema,
});
export const expenseAttachmentParamsSchema = expenseParamsSchema.extend({
  attachmentId: uuidSchema,
});
export const listExpensesQuerySchema = paginationQuerySchema;

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseParams = z.infer<typeof expenseParamsSchema>;
export type ExpenseAttachmentParams = z.infer<typeof expenseAttachmentParamsSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
