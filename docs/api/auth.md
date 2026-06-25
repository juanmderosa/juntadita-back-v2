# Auth

La autenticacion usa Supabase Auth. El frontend obtiene el `access_token` con
Supabase y lo envia al backend en cada request protegida.

## Header

```text
Authorization: Bearer <access_token>
```

Si el header falta, esta mal formado, expiro o no corresponde a un usuario de
Supabase, la API responde `401`.

## GET /api/v1/me

Devuelve el usuario autenticado, su profile y si debe completar onboarding.

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "00000000-0000-0000-0000-000000000000",
      "email": "juan@example.com"
    },
    "profile": {
      "id": "00000000-0000-0000-0000-000000000000",
      "email": "juan@example.com",
      "displayName": null,
      "avatarUrl": null,
      "onboardingCompletedAt": null,
      "createdAt": "2026-06-24T12:00:00.000Z",
      "updatedAt": "2026-06-24T12:00:00.000Z"
    },
    "requiresProfileOnboarding": true
  }
}
```

## PATCH /api/v1/me/profile

Completa o actualiza el nombre visible del usuario autenticado.

Body:

```json
{
  "displayName": "Juan"
}
```

Validaciones:

- `displayName` es requerido.
- Se normaliza con trim.
- Debe tener entre 2 y 80 caracteres.

Respuesta: mismo shape que `GET /api/v1/me`, con
`requiresProfileOnboarding: false`.

## Errores

- `400`: body invalido.
- `401`: bearer token faltante, invalido o expirado.
- `404`: el usuario autenticado no tiene profile asociado.
- `500`: configuracion Supabase faltante o error inesperado.
