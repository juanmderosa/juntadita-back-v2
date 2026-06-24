# Auth

La autenticacion se implementara con Supabase Auth.

El frontend enviara:

```text
Authorization: Bearer <access_token>
```

El backend resolvera el usuario y el `profile` asociado antes de ejecutar reglas
de negocio.

La implementacion real de auth queda fuera de la Tarea 1.
