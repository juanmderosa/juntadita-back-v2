import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const uuidSchema = z.uuid("Invalid UUID");

export const normalizedEmailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email("Invalid email"));

export const isoDateTimeSchema = z.iso.datetime({
  offset: true,
  message: "Invalid ISO date-time",
});

export const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, "Invalid currency code"));

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required")
  .refine(isValidTimeZone, "Invalid IANA timezone");

export const amountInCentsSchema = z
  .number()
  .int("Amount must be an integer number of cents")
  .nonnegative("Amount cannot be negative")
  .refine(Number.isSafeInteger, "Amount is outside the safe integer range");

export const positiveAmountInCentsSchema = amountInCentsSchema.refine(
  (value) => value > 0,
  "Amount must be greater than zero",
);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_LIMIT)
    .default(DEFAULT_PAGE_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
