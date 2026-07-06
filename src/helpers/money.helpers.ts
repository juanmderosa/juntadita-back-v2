const DECIMAL_MONEY_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export function decimalToCents(value: string) {
  const normalized = value.trim();

  if (!DECIMAL_MONEY_PATTERN.test(normalized)) {
    throw new Error("Amount must be a non-negative decimal with at most two decimals");
  }

  const [whole, fraction = ""] = normalized.replace(",", ".").split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Amount is outside the safe integer range");
  }

  return Number(cents);
}

export function centsToDecimal(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Amount must be a non-negative safe integer");
  }

  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0");

  return `${whole}.${fraction}`;
}
