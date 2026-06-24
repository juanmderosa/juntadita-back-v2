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

Las proximas tareas agregaran eventos, invitaciones, votacion, gastos y pagos.
