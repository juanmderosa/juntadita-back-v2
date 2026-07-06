# Errors

Los errores HTTP deben normalizarse con `ErrorResponse`.

Reglas:

- `HttpError` define status code y errores de campo opcionales.
- `ZodError` responde `400`.
- Errores inesperados responden `500` con `Internal Server Error`, sin exponer
  el mensaje o los detalles internos.
- Los controllers deben delegar errores con `next(error)`.
- Los errores de validacion pueden incluir `errors[]` con `field` y `message`.
- El frontend conserva el status HTTP y los errores de campo en `ApiError`.
