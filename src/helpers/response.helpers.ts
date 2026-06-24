import type {
  ErrorItem,
  ErrorResponse,
  PaginatedResponse,
  PaginationMeta,
  SuccessResponse,
} from "../types/responses.js";

export const successResponse = <T>(
  data: T,
  options?: { message?: string },
): SuccessResponse<T> => ({
  status: "success",
  ...(options?.message ? { message: options.message } : {}),
  data,
});

export const paginatedResponse = <T>(
  data: T[],
  pagination: PaginationMeta,
  options?: { message?: string },
): PaginatedResponse<T> => ({
  status: "success",
  ...(options?.message ? { message: options.message } : {}),
  data,
  pagination,
});

export const errorResponse = (
  message: string,
  errors?: ErrorItem[],
): ErrorResponse => ({
  status: "error",
  message,
  ...(errors ? { errors } : {}),
});
