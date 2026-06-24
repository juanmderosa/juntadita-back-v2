# Juntadita Backend

API Express + TypeScript para el MVP de Juntadita.

El backend centraliza reglas de negocio, permisos, validaciones Zod y acceso a
Supabase con service role. El frontend no consulta tablas directamente.

## Scripts

```text
pnpm install
pnpm dev
pnpm build
pnpm start
```

## Health check

```text
GET /health
```

Respuesta:

```json
{
  "status": "success",
  "data": {
    "ok": true,
    "service": "juntadita-backend"
  }
}
```

## Arquitectura

- `routes`: definicion de rutas.
- `controllers`: capa HTTP/API.
- `services`: reglas de negocio.
- `repositories`: acceso a datos.
- `schemas`: validaciones Zod.
- `middlewares`: auth, validacion y errores.
- `helpers`: responses compartidos.
- `types`: tipos transversales.

## Commit propuesto

```text
chore(backend): crear estructura inicial de API Express
```

Descripcion:

- Agrega estructura base de capas backend.
- Incluye health check inicial.
- Crea documentacion tecnica inicial de API.
