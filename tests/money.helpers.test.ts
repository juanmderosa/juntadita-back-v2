import { describe, expect, it } from "vitest";
import { centsToDecimal, decimalToCents } from "../src/helpers/money.helpers.js";

describe("money helpers", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["12.3", 1230],
    ["12,34", 1234],
  ])("converts %s to cents", (value, expected) => {
    expect(decimalToCents(value)).toBe(expected);
  });

  it("converts cents to a database decimal", () => {
    expect(centsToDecimal(1234)).toBe("12.34");
  });

  it.each(["-1", "1.234", "1,2.3", "text"])("rejects invalid decimal %s", (value) => {
    expect(() => decimalToCents(value)).toThrow();
  });

  it("rejects unsafe values", () => {
    expect(() => decimalToCents("90071992547410")).toThrow(RangeError);
    expect(() => centsToDecimal(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
