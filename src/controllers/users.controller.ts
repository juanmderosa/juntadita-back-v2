import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../helpers/response.helpers.js";
import { usersService } from "../services/users.service.js";
import type { AuthLocals } from "../types/auth.js";
import type { UpdateUserProfileInput } from "../schemas/users.schemas.js";

type AuthenticatedResponse = Response<unknown, AuthLocals>;
type UpdateProfileResponse = Response<unknown, AuthLocals & { body: UpdateUserProfileInput }>;

export const usersController = {
  async getMe(_req: Request, res: AuthenticatedResponse, next: NextFunction) {
    try {
      const data = await usersService.getCurrentUser(res.locals.auth);

      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(_req: Request, res: UpdateProfileResponse, next: NextFunction) {
    try {
      const data = await usersService.updateCurrentUserProfile(
        res.locals.auth,
        res.locals.body.displayName,
      );

      res.json(successResponse(data));
    } catch (error) {
      next(error);
    }
  },
};
