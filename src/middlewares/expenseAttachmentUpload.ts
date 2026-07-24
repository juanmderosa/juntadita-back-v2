import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../types/httpError.js";

export const MAX_EXPENSE_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_EXPENSE_ATTACHMENTS = 5;

const allowedContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EXPENSE_ATTACHMENT_SIZE_BYTES, files: 1 },
  fileFilter(_request, file, callback) {
    if (!allowedContentTypes.has(file.mimetype)) {
      callback(new HttpError("Only PNG, JPEG, WebP, and PDF attachments are allowed", 400));
      return;
    }
    callback(null, true);
  },
});

export const uploadExpenseAttachment = upload.single("file");

export function requireExpenseAttachment(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (!request.file) {
    next(new HttpError("An expense attachment file is required", 400));
    return;
  }
  response.locals.file = request.file;
  next();
}
