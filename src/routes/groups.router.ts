import { Router } from "express";
import { groupsController } from "../controllers/groups.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  addGroupMembersSchema,
  createGroupSchema,
  groupMemberParamsSchema,
  groupParamsSchema,
  updateGroupSchema,
} from "../schemas/groups.schemas.js";

export const groupsRouter = Router();
groupsRouter.use(requireAuth);
groupsRouter.get("/", groupsController.list);
groupsRouter.post("/", validate({ body: createGroupSchema }), groupsController.create);
groupsRouter.get("/:groupId", validate({ params: groupParamsSchema }), groupsController.getById);
groupsRouter.patch(
  "/:groupId",
  validate({ params: groupParamsSchema, body: updateGroupSchema }),
  groupsController.update,
);
groupsRouter.delete("/:groupId", validate({ params: groupParamsSchema }), groupsController.delete);
groupsRouter.post(
  "/:groupId/members",
  validate({ params: groupParamsSchema, body: addGroupMembersSchema }),
  groupsController.addMembers,
);
groupsRouter.delete(
  "/:groupId/members/:memberId",
  validate({ params: groupMemberParamsSchema }),
  groupsController.deleteMember,
);
