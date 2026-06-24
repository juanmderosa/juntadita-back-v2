# Errors

Los errores HTTP deben normalizarse con `ErrorResponse`.

Reglas:

- `HttpError` define status code y errores de campo opcionales.
- `ZodError` responde `400`.
- Errores inesperados responden `500`.
- Los controllers deben delegar errores con `next(error)`.
