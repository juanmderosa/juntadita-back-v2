import { z } from "zod";
import {
  isoDateTimeSchema,
  paginationQuerySchema,
  uuidSchema,
} from "./common.schemas.js";

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(120, "Title must be at most 120 characters");

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, "Description must be at most 2000 characters")
  .nullable()
  .optional();

const pollEventSchema = z
  .object({
    type: z.literal("poll"),
    title: titleSchema,
    description: descriptionSchema,
    votingClosesAt: isoDateTimeSchema,
    fixedStartAt: z.never().optional(),
    fixedEndAt: z.never().optional(),
  })
  .strict()
  .refine((value) => new Date(value.votingClosesAt).getTime() > Date.now(), {
    path: ["votingClosesAt"],
    message: "Voting close must be in the future",
  });

const fixedEventSchema = z
  .object({
    type: z.literal("fixed"),
    title: titleSchema,
    description: descriptionSchema,
    fixedStartAt: isoDateTimeSchema,
    fixedEndAt: isoDateTimeSchema.nullable().optional(),
    votingClosesAt: z.never().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.fixedEndAt &&
      new Date(value.fixedEndAt).getTime() <=
        new Date(value.fixedStartAt).getTime()
    ) {
      context.addIssue({
        code: "custom",
        path: ["fixedEndAt"],
        message: "Fixed end must be after fixed start",
      });
    }
  });

export const createEventSchema = z.discriminatedUnion("type", [
  pollEventSchema,
  fixedEventSchema,
]);

export const updateEventSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
  })
  .strict()
  .refine(
    (value) => value.title !== undefined || value.description !== undefined,
    "At least title or description is required",
  );

export const eventParamsSchema = z.object({ eventId: uuidSchema });
export const listEventsQuerySchema = paginationQuerySchema;

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
