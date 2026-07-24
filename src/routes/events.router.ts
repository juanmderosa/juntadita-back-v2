import { Router } from "express";
import { eventsController } from "../controllers/events.controller.js";
import { expensesController } from "../controllers/expenses.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  requireExpenseAttachment,
  uploadExpenseAttachment,
} from "../middlewares/expenseAttachmentUpload.js";
import {
  createEventOptionsBatchSchema,
  createEventOptionSchema,
  createEventSchema,
  eventOptionParamsSchema,
  eventParticipantParamsSchema,
  eventParamsSchema,
  inviteParticipantsSchema,
  replaceVotesSchema,
  resolveTieSchema,
  voteParamsSchema,
  listEventsQuerySchema,
  updateEventOptionSchema,
  updateEventSchema,
  updateExpenseParticipationSchema,
} from "../schemas/events.schemas.js";
import {
  createExpenseSchema,
  expenseAttachmentParamsSchema,
  expenseParamsSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "../schemas/expenses.schemas.js";

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
eventsRouter.post(
  "/:eventId/options/batch",
  validate({ params: eventParamsSchema, body: createEventOptionsBatchSchema }),
  eventsController.createOptionsBatch,
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
eventsRouter.get("/:eventId/voting", validate({ params: voteParamsSchema }), eventsController.getVoting);
eventsRouter.put("/:eventId/votes", validate({ params: voteParamsSchema, body: replaceVotesSchema }), eventsController.replaceVotes);
eventsRouter.post("/:eventId/result/resolve-tie", validate({ params: voteParamsSchema, body: resolveTieSchema }), eventsController.resolveTie);
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
eventsRouter.patch(
  "/:eventId/participants/:participantId/expense-participation",
  validate({
    params: eventParticipantParamsSchema,
    body: updateExpenseParticipationSchema,
  }),
  eventsController.updateExpenseParticipation,
);
eventsRouter.get(
  "/:eventId/expenses",
  validate({ params: eventParamsSchema, query: listExpensesQuerySchema }),
  expensesController.list,
);
eventsRouter.post(
  "/:eventId/expenses",
  validate({ params: eventParamsSchema, body: createExpenseSchema }),
  expensesController.create,
);
eventsRouter.get(
  "/:eventId/expenses/:expenseId",
  validate({ params: expenseParamsSchema }),
  expensesController.getById,
);
eventsRouter.patch(
  "/:eventId/expenses/:expenseId",
  validate({ params: expenseParamsSchema, body: updateExpenseSchema }),
  expensesController.update,
);
eventsRouter.delete(
  "/:eventId/expenses/:expenseId",
  validate({ params: expenseParamsSchema }),
  expensesController.delete,
);
eventsRouter.post(
  "/:eventId/expenses/:expenseId/attachments",
  validate({ params: expenseParamsSchema }),
  uploadExpenseAttachment,
  requireExpenseAttachment,
  expensesController.uploadAttachment,
);
eventsRouter.get(
  "/:eventId/expenses/:expenseId/attachments/:attachmentId/download",
  validate({ params: expenseAttachmentParamsSchema }),
  expensesController.getAttachmentDownloadUrl,
);
eventsRouter.delete(
  "/:eventId/expenses/:expenseId/attachments/:attachmentId",
  validate({ params: expenseAttachmentParamsSchema }),
  expensesController.deleteAttachment,
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
