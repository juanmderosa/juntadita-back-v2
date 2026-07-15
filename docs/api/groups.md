# Grupos

Todos los endpoints requieren `Authorization: Bearer <access_token>`. Los
grupos son privados: solo su duenio puede verlos, editarlos o usarlos al invitar.

```text
GET    /api/v1/groups
POST   /api/v1/groups
GET    /api/v1/groups/:groupId
PATCH  /api/v1/groups/:groupId
DELETE /api/v1/groups/:groupId
POST   /api/v1/groups/:groupId/members
DELETE /api/v1/groups/:groupId/members/:memberId
```

`POST /api/v1/groups` y `PATCH /api/v1/groups/:groupId` reciben:

```json
{ "name": "Amigos" }
```

`POST /api/v1/groups/:groupId/members` recibe hasta 50 emails normalizados:

```json
{ "emails": ["ana@example.com", "pepe@example.com"] }
```

La lista devuelve grupos con `memberCount`; el detalle incluye `members`. Un
grupo puede borrarse y elimina sus contactos en cascada.

## Invitaciones con grupos

`POST /api/v1/events/:eventId/participants/invite` acepta emails manuales,
grupos propios o ambos:

```json
{
  "emails": ["ana@example.com"],
  "groupIds": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

La API une los destinatarios, omite emails repetidos y limita el envio a 50
contactos resultantes. Pertenecer a un grupo no da acceso a un evento: el
acceso solo se crea al enviar la invitacion.
