import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  errorResponse,
  paginatedResponse,
  successResponse,
} from "../src/helpers/response.helpers.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { HttpError } from "../src/types/httpError.js";

function createResponseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("response contracts", () => {
  it("builds success, pagination and error responses", () => {
    expect(successResponse({ id: "1" })).toEqual({
      status: "success",
      data: { id: "1" },
    });
    expect(
      paginatedResponse(["item"], {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      }),
    ).toEqual({
      status: "success",
      data: ["item"],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(errorResponse("Invalid", [{ field: "name", message: "Required" }])).toEqual(
      {
        status: "error",
        message: "Invalid",
        errors: [{ field: "name", message: "Required" }],
      },
    );
  });

  it("normalizes HttpError", () => {
    const response = createResponseMock();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    errorHandler(
      new HttpError("Not found", 404),
      {} as never,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      status: "error",
      message: "Not found",
    });
  });

  it("normalizes Zod errors and hides unexpected details", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const validationResponse = createResponseMock();
    const unexpectedResponse = createResponseMock();
    const schema = z.object({ name: z.string().min(1) });
    const validationError = schema.safeParse({ name: "" }).error;

    errorHandler(
      validationError,
      {} as never,
      validationResponse as unknown as Response,
      vi.fn(),
    );
    errorHandler(
      new Error("database password leaked"),
      {} as never,
      unexpectedResponse as unknown as Response,
      vi.fn(),
    );

    expect(validationResponse.status).toHaveBeenCalledWith(400);
    expect(validationResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", message: "Validation failed" }),
    );
    expect(unexpectedResponse.status).toHaveBeenCalledWith(500);
    expect(unexpectedResponse.json).toHaveBeenCalledWith({
      status: "error",
      message: "Internal Server Error",
    });
    consoleError.mockRestore();
  });
});
