import { describe, expect, it, vi } from "vitest";
import {
  createEventSchema,
  updateEventSchema,
} from "../src/schemas/events.schemas.js";

describe("event schemas", () => {
  it("accepts a poll with a future close and rejects fixed fields", () => {
    const future = new Date(Date.now() + 60_000).toISOString();

    expect(
      createEventSchema.parse({
        type: "poll",
        title: "  Cena  ",
        votingClosesAt: future,
      }),
    ).toMatchObject({ type: "poll", title: "Cena", votingClosesAt: future });
    expect(
      createEventSchema.safeParse({
        type: "poll",
        title: "Cena",
        votingClosesAt: future,
        fixedStartAt: future,
      }).success,
    ).toBe(false);
  });

  it("rejects an expired poll close", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00Z"));

    expect(
      createEventSchema.safeParse({
        type: "poll",
        title: "Cena",
        votingClosesAt: "2026-07-06T11:59:59Z",
      }).success,
    ).toBe(false);

    vi.useRealTimers();
  });

  it("accepts fixed start with optional later end", () => {
    expect(
      createEventSchema.safeParse({
        type: "fixed",
        title: "Asado",
        fixedStartAt: "2026-08-01T20:00:00-03:00",
        fixedEndAt: "2026-08-01T23:00:00-03:00",
      }).success,
    ).toBe(true);
    expect(
      createEventSchema.safeParse({
        type: "fixed",
        title: "Asado",
        fixedStartAt: "2026-08-01T20:00:00-03:00",
        fixedEndAt: "2026-08-01T19:00:00-03:00",
      }).success,
    ).toBe(false);
  });

  it("only updates title or description", () => {
    expect(updateEventSchema.parse({ description: null })).toEqual({
      description: null,
    });
    expect(updateEventSchema.safeParse({}).success).toBe(false);
    expect(updateEventSchema.safeParse({ type: "fixed" }).success).toBe(false);
  });
});
