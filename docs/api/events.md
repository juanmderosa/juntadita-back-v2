# Events

Todos los endpoints requieren `Authorization: Bearer <access_token>`.

## Crear evento

```text
POST /api/v1/events
```

Evento con votacion:

```json
{
  "type": "poll",
  "title": "Cena de fin de ano",
  "description": "Elegimos la fecha entre todos.",
  "votingClosesAt": "2026-12-01T23:59:00-03:00"
}
```

Evento con fecha fija:

```json
{
  "type": "fixed",
  "title": "Asado con amigos",
  "description": null,
  "fixedStartAt": "2026-08-01T20:00:00-03:00",
  "fixedEndAt": "2026-08-01T23:00:00-03:00"
}
```

Responde `201 SuccessResponse<EventDetail>`. El backend usa `ARS` y
`America/Buenos_Aires` y crea al usuario como participante `admin` con estado
`joined` en la misma transaccion.

## Listar eventos

```text
GET /api/v1/events?page=1&limit=20
```

Responde `PaginatedResponse<EventSummary>` y ordena por creacion descendente.
Incluye eventos donde el `user_id` o email normalizado del participante coincide
con el usuario autenticado. Participantes `removed` quedan excluidos.

## Ver evento

```text
GET /api/v1/events/:eventId
```

Responde `SuccessResponse<EventDetail>`. Un usuario que no participa recibe
`404` sin revelar la existencia del evento.

## Editar datos basicos

```text
PATCH /api/v1/events/:eventId
```

```json
{
  "title": "Nuevo titulo",
  "description": null
}
```

Solo un participante `admin` puede editar. Tipo y calendario son inmutables en
esta etapa. Un participante no admin recibe `403`.

## EventDetail

```ts
type EventDetail = {
  id: string;
  createdBy: string;
  title: string;
  description: string | null;
  type: "poll" | "fixed";
  currentUserRole: "admin" | "guest";
  currencyCode: string;
  timezone: string;
  votingClosesAt: string | null;
  fixedStartAt: string | null;
  fixedEndAt: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

## Validaciones

- Titulo requerido, maximo 120 caracteres.
- Descripcion opcional, maximo 2000 caracteres.
- `poll` requiere cierre futuro y rechaza campos fixed.
- `fixed` requiere inicio; el fin opcional debe ser posterior.
- La edicion requiere titulo o descripcion.
