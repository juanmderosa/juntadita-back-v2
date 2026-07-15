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
`404` sin revelar la existencia del evento. El detalle incluye `options` y
`participants`, excluyendo participantes `removed`.

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

## Opciones de votacion

```text
GET /api/v1/events/:eventId/options
POST /api/v1/events/:eventId/options
PATCH /api/v1/events/:eventId/options/:optionId
DELETE /api/v1/events/:eventId/options/:optionId
```

Participantes pueden listar opciones. Solo `admin` puede crear, editar o
eliminar. Los eventos `fixed` no admiten opciones. Si la votacion ya cerro o el
evento esta finalizado, los cambios responden `409`.

Crear opcion por dia:

```json
{
  "type": "date",
  "label": "Sabado",
  "startAt": "2026-08-01T00:00:00-03:00"
}
```

Crear opcion por dia y hora:

```json
{
  "type": "datetime",
  "label": "Despues del trabajo",
  "startAt": "2026-08-01T20:00:00-03:00"
}
```

Crear franja:

```json
{
  "type": "range",
  "label": "Noche",
  "startAt": "2026-08-01T20:00:00-03:00",
  "endAt": "2026-08-01T23:00:00-03:00"
}
```

## Invitados y participantes

```text
GET /api/v1/events/:eventId/participants
POST /api/v1/events/:eventId/participants/invite
```

Participantes pueden listar invitados visibles. Solo `admin` puede invitar por
emails en lote. Los emails se normalizan, no se duplican por evento y un
participante `removed` se reactiva como `invited`.

```json
{
  "emails": ["ana@example.com", "pepe@example.com"],
  "groupIds": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

Los grupos son privados del organizador; el backend combina sus contactos con
los emails manuales, elimina repetidos y limita el envio a 50 destinatarios.

El backend intenta enviar emails reales con Resend y audita cada intento en
`email_logs` usando `template = event_invitation`. El link apunta a
`/events/:eventId`; no hay links publicos ni tokens de invitacion en esta etapa.

Variables requeridas para envio real:

- `RESEND_API_KEY`
- `INVITE_FROM_EMAIL`
- `APP_PUBLIC_URL`

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
  options: EventOption[];
  participants: EventParticipant[];
};

type EventOption = {
  id: string;
  eventId: string;
  type: "date" | "datetime" | "range";
  label: string | null;
  startAt: string;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EventParticipant = {
  id: string;
  eventId: string;
  userId: string | null;
  email: string;
  displayName: string | null;
  role: "admin" | "guest";
  status: "invited" | "joined" | "removed";
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type InviteParticipantsResult = {
  participants: EventParticipant[];
  emails: Array<{
    email: string;
    status: "sent" | "failed" | "skipped";
    providerMessageId: string | null;
    errorMessage: string | null;
  }>;
};
```

## Validaciones

- Titulo requerido, maximo 120 caracteres.
- Descripcion opcional, maximo 2000 caracteres.
- `poll` requiere cierre futuro y rechaza campos fixed.
- `fixed` requiere inicio; el fin opcional debe ser posterior.
- La edicion requiere titulo o descripcion.
- Opciones `range` requieren `endAt > startAt`.
- Emails de invitacion deben ser validos y unicos dentro del request.
