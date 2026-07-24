import { z } from "zod";
import {
  isoDateTimeSchema,
  positiveAmountInCentsSchema,
  uuidSchema,
} from "./common.schemas.js";

export const paymentParamsSchema = z.object({
  eventId: uuidSchema,
  paymentId: uuidSchema,
});

export const createPaymentSchema = z
  .object({
    fromParticipantId: uuidSchema,
    toParticipantId: uuidSchema,
    amountCents: positiveAmountInCentsSchema,
    paidAt: isoDateTimeSchema.optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((value) => value.fromParticipantId !== value.toParticipantId, {
    path: ["toParticipantId"],
    message: "Payment participants must be different",
  });

export const voidPaymentSchema = z
  .object({ voidReason: z.string().trim().min(1).max(500) })
  .strict();

export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
