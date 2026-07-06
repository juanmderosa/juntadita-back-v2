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

## Reglas

- Los endpoints de listado usan `page` desde 1 y `limit` con default 20 y
  maximo 100.
- Una respuesta exitosa sin contenido puede usar HTTP `204` sin body.
- Los importes monetarios publicos se expresan como centavos enteros seguros.
- La conversion desde y hacia columnas `numeric(12,2)` se realiza en backend;
  nunca se usan decimales de punto flotante como contrato HTTP.
