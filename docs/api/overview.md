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

## Events

```text
POST /api/v1/events
GET /api/v1/events
GET /api/v1/events/:eventId
PATCH /api/v1/events/:eventId
GET /api/v1/events/:eventId/options
POST /api/v1/events/:eventId/options
PATCH /api/v1/events/:eventId/options/:optionId
DELETE /api/v1/events/:eventId/options/:optionId
GET /api/v1/events/:eventId/participants
POST /api/v1/events/:eventId/participants/invite
```

Ver [`events.md`](events.md) para contratos, permisos y validaciones.

Los endpoints protegidos usan `Authorization: Bearer <access_token>`.

## Infraestructura compartida

- Requests validados con Zod se leen desde `res.locals`.
- UUID, email, fecha ISO con offset, moneda, timezone, centavos y paginacion
  usan schemas base compartidos dentro del backend.
- Defaults del MVP: `ARS` y `America/Buenos_Aires`.
- Los contratos publicos son `SuccessResponse`, `PaginatedResponse` y
  `ErrorResponse`.

Las proximas tareas agregaran grupos, votacion, gastos y pagos.
