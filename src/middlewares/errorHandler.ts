import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { errorResponse } from "../helpers/response.helpers.js";
import { HttpError } from "../types/httpError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json(errorResponse(err.message, err.errors));
  }

  if (err instanceof MulterError) {
    return res.status(400).json(errorResponse(err.message));
  }

  if (err instanceof ZodError) {
    return res.status(400).json(
      errorResponse(
        "Validation failed",
        err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      ),
    );
  }

  return res.status(500).json(errorResponse("Internal Server Error"));
}
