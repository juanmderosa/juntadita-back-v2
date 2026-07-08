import { Router } from "express";
import { eventsController } from "../controllers/events.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createEventSchema,
  eventParamsSchema,
  listEventsQuerySchema,
  updateEventSchema,
} from "../schemas/events.schemas.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth);
eventsRouter.post("/", validate({ body: createEventSchema }), eventsController.create);
eventsRouter.get("/", validate({ query: listEventsQuerySchema }), eventsController.list);
eventsRouter.get(
  "/:eventId",
  validate({ params: eventParamsSchema }),
  eventsController.getById,
);
eventsRouter.patch(
  "/:eventId",
  validate({ params: eventParamsSchema, body: updateEventSchema }),
  eventsController.update,
);
