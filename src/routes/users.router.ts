import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { validate } from "../middlewares/validation.middleware.js";
import { updateUserProfileSchema } from "../schemas/users.schemas.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, usersController.getMe);
usersRouter.patch(
  "/me/profile",
  requireAuth,
  validate({ body: updateUserProfileSchema }),
  usersController.updateProfile,
);
