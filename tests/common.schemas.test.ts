import { describe, expect, it } from "vitest";
import {
  amountInCentsSchema,
  currencyCodeSchema,
  isoDateTimeSchema,
  normalizedEmailSchema,
  paginationQuerySchema,
  timeZoneSchema,
  uuidSchema,
} from "../src/schemas/common.schemas.js";

describe("common schemas", () => {
  it("normalizes email and currency", () => {
    expect(normalizedEmailSchema.parse(" USER@Example.COM ")).toBe(
      "user@example.com",
    );
    expect(currencyCodeSchema.parse(" ars ")).toBe("ARS");
  });

  it("validates UUID, ISO date-time and IANA timezone", () => {
    expect(uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(
      true,
    );
    expect(isoDateTimeSchema.safeParse("2026-07-06T15:30:00-03:00").success).toBe(
      true,
    );
    expect(timeZoneSchema.safeParse("America/Buenos_Aires").success).toBe(true);
    expect(timeZoneSchema.safeParse("Mars/Olympus").success).toBe(false);
  });

  it("applies pagination defaults and limits", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(paginationQuerySchema.parse({ page: "2", limit: "100" })).toEqual({
      page: 2,
      limit: 100,
    });
    expect(paginationQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("only accepts non-negative safe integer cents", () => {
    expect(amountInCentsSchema.parse(1250)).toBe(1250);
    expect(amountInCentsSchema.safeParse(-1).success).toBe(false);
    expect(amountInCentsSchema.safeParse(1.5).success).toBe(false);
    expect(amountInCentsSchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(
      false,
    );
  });
});
