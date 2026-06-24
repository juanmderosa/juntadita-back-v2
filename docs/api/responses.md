# Responses

## SuccessResponse

```ts
interface SuccessResponse<T> {
  status: "success";
  message?: string;
  data: T;
}
```

## PaginatedResponse

```ts
interface PaginatedResponse<T> {
  status: "success";
  message?: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## ErrorResponse

```ts
interface ErrorResponse {
  status: "error";
  message: string;
  errors?: {
    field?: string;
    message: string;
  }[];
}
```
