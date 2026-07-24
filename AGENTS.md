# AGENTS.md

Guia breve para agentes en `juntadita-backend`. Mantener este archivo liviano:
las reglas largas viven en la documentacion enlazada.

## Nombre del proyecto

Juntadita Backend.

## Stack

Express 5 + TypeScript ESM + Supabase service role + Zod + pnpm.

## Comandos

```text
pnpm dev
pnpm build
pnpm test
pnpm format
pnpm format:check
pnpm start
```

## Estructura del proyecto

```text
src/routes        rutas y middlewares por endpoint
src/controllers   capa HTTP, res.locals, helpers, next(error)
src/services      reglas de negocio, sin Express
src/repositories  acceso a datos, sin HTTP ni responses
src/schemas       validaciones Zod
src/middlewares   auth, validacion y errores
src/helpers       helpers compartidos
src/types         tipos transversales
docs/api          contrato tecnico de la API
```

## Convenciones

- El frontend no consulta tablas de negocio; todo pasa por Express.
- Supabase service role solo se usa desde backend.
- Mantener separacion `route -> controller -> service -> repository`.
- Controllers usan datos validados desde `res.locals`, no `req.body`,
  `req.query` o `req.params` si ya pasaron por `validate()`.
- Responses publicas siguen `SuccessResponse`, `PaginatedResponse` o
  `ErrorResponse`.
- Si cambia el contrato HTTP, actualizar `docs/api` en el mismo cambio.

## No hagas

- No poner HTTP/Express en services o repositories.
- No armar JSON responses fuera de controllers/helpers/middleware de error.
- No crear paquete compartido con frontend durante el MVP.
- No guardar secretos reales en el repo.
- No marcar tareas como `Hecha` sin aceptacion explicita de Juan.

## flujo de trabajo

1. Para tareas grandes, revisar plan y decisiones globales.
2. Revisar README y docs API del area tocada.
3. Revisar si hay skills disponibles que ayuden a cumplir la tarea.
4. Implementar cambios chicos y mantener capas.
5. Ejecutar `pnpm build` y `pnpm test` cuando aplique.
6. Cerrar con resumen, pruebas, riesgos y propuesta de commit.

## Documentación

- [`README.md`](README.md)
- [`docs/api/overview.md`](docs/api/overview.md)
- [`docs/api/auth.md`](docs/api/auth.md)
- [`docs/api/responses.md`](docs/api/responses.md)
- [`docs/api/errors.md`](docs/api/errors.md)
- [`../juntadita-project/docs/mvp-plan.md`](../juntadita-project/docs/mvp-plan.md)
- [`../juntadita-project/docs/decisions.md`](../juntadita-project/docs/decisions.md)
