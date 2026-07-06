import type { ErrorItem } from "./responses.js";

export class HttpError extends Error {
  readonly statusCode: number;
  readonly errors?: ErrorItem[];

  constructor(message: string, statusCode = 500, errors?: ErrorItem[]) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
