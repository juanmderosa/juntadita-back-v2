import { z } from "zod";
import {
  isoDateTimeSchema,
  normalizedEmailSchema,
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

const optionLabelSchema = z
  .string()
  .trim()
  .max(120, "Label must be at most 120 characters")
  .nullable()
  .optional();

export const createEventOptionSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("date"),
        label: optionLabelSchema,
        startAt: isoDateTimeSchema,
        endAt: z.never().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("datetime"),
        label: optionLabelSchema,
        startAt: isoDateTimeSchema,
        endAt: z.never().optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("range"),
        label: optionLabelSchema,
        startAt: isoDateTimeSchema,
        endAt: isoDateTimeSchema,
      })
      .strict()
      .refine(
        (value) =>
          new Date(value.endAt).getTime() > new Date(value.startAt).getTime(),
        {
          path: ["endAt"],
          message: "Option end must be after start",
        },
      ),
  ]);

export const createEventOptionsBatchSchema = z
  .object({
    options: z
      .array(createEventOptionSchema)
      .min(1, "At least one option is required")
      .max(60, "At most 60 options can be created at once"),
  })
  .strict();

export const updateEventOptionSchema = z
  .object({
    label: optionLabelSchema,
    startAt: isoDateTimeSchema.optional(),
    endAt: isoDateTimeSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.label !== undefined ||
      value.startAt !== undefined ||
      value.endAt !== undefined,
    "At least one option field is required",
  );

export const eventOptionParamsSchema = z.object({
  eventId: uuidSchema,
  optionId: uuidSchema,
});

export const inviteParticipantsSchema = z
  .object({
    emails: z
      .array(normalizedEmailSchema)
      .max(50, "At most 50 emails can be invited at once")
      .optional(),
    groupIds: z.array(uuidSchema).max(50, "At most 50 groups can be selected").optional(),
  })
  .strict()
  .refine(
    (value) => !value.emails || new Set(value.emails).size === value.emails.length,
    { path: ["emails"], message: "Emails must be unique" },
  )
  .refine(
    (value) => (value.emails?.length ?? 0) > 0 || (value.groupIds?.length ?? 0) > 0,
    "At least one email or group is required",
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export type CreateEventOptionInput = z.infer<typeof createEventOptionSchema>;
export type CreateEventOptionsBatchInput = z.infer<
  typeof createEventOptionsBatchSchema
>;
export type UpdateEventOptionInput = z.infer<typeof updateEventOptionSchema>;
export type EventOptionParams = z.infer<typeof eventOptionParamsSchema>;
export type InviteParticipantsInput = z.infer<typeof inviteParticipantsSchema>;
