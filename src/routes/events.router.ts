import { Router } from "express";
import { eventsController } from "../controllers/events.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createEventOptionSchema,
  createEventSchema,
  eventOptionParamsSchema,
  eventParamsSchema,
  inviteParticipantsSchema,
  listEventsQuerySchema,
  updateEventOptionSchema,
  updateEventSchema,
} from "../schemas/events.schemas.js";

export const eventsRouter = Router();

eventsRouter.use(requireAuth);
eventsRouter.post("/", validate({ body: createEventSchema }), eventsController.create);
eventsRouter.get("/", validate({ query: listEventsQuerySchema }), eventsController.list);
eventsRouter.get(
  "/:eventId/options",
  validate({ params: eventParamsSchema }),
  eventsController.listOptions,
);
eventsRouter.post(
  "/:eventId/options",
  validate({ params: eventParamsSchema, body: createEventOptionSchema }),
  eventsController.createOption,
);
eventsRouter.patch(
  "/:eventId/options/:optionId",
  validate({ params: eventOptionParamsSchema, body: updateEventOptionSchema }),
  eventsController.updateOption,
);
eventsRouter.delete(
  "/:eventId/options/:optionId",
  validate({ params: eventOptionParamsSchema }),
  eventsController.deleteOption,
);
eventsRouter.get(
  "/:eventId/participants",
  validate({ params: eventParamsSchema }),
  eventsController.listParticipants,
);
eventsRouter.post(
  "/:eventId/participants/invite",
  validate({ params: eventParamsSchema, body: inviteParticipantsSchema }),
  eventsController.inviteParticipants,
);
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
