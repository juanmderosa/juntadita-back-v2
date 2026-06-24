export interface BaseResponse {
  status: "success" | "error";
}

export interface SuccessResponse<T> extends BaseResponse {
  status: "success";
  message?: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginatedResponse<T> extends BaseResponse {
  status: "success";
  message?: string;
  data: T[];
  pagination: PaginationMeta;
}

export interface ErrorItem {
  field?: string;
  message: string;
}

export interface ErrorResponse extends BaseResponse {
  status: "error";
  message: string;
  errors?: ErrorItem[];
}
