import type { ErrorItem } from "./responses.js";

export class HttpError extends Error {
  statusCode: number;
  errors?: ErrorItem[];

  constructor(message: string, statusCode = 500, errors?: ErrorItem[]) {
    super(message);
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
