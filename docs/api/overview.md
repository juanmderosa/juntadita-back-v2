# API Overview

La API de Juntadita expone endpoints versionados para frontend web.

## Health check

```text
GET /health
```

## Auth

```text
GET /api/v1/me
PATCH /api/v1/me/profile
```

Los endpoints protegidos usan `Authorization: Bearer <access_token>`.

## Infraestructura compartida

- Requests validados con Zod se leen desde `res.locals`.
- UUID, email, fecha ISO con offset, moneda, timezone, centavos y paginacion
  usan schemas base compartidos dentro del backend.
- Defaults del MVP: `ARS` y `America/Buenos_Aires`.
- Los contratos publicos son `SuccessResponse`, `PaginatedResponse` y
  `ErrorResponse`.

Las proximas tareas agregaran eventos, invitaciones, votacion, gastos y pagos.
