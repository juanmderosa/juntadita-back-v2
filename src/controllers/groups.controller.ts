import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../helpers/response.helpers.js";
import type {
  AddGroupMembersInput,
  CreateGroupInput,
  GroupMemberParams,
  GroupParams,
  UpdateGroupInput,
} from "../schemas/groups.schemas.js";
import { groupsService } from "../services/groups.service.js";
import type { AuthLocals } from "../types/auth.js";

type GroupsResponse<T extends object = object> = Response<unknown, AuthLocals & T>;

export const groupsController = {
  async list(_req: Request, res: GroupsResponse, next: NextFunction) {
    try {
      res.json(successResponse(await groupsService.list(res.locals.auth)));
    } catch (error) {
      next(error);
    }
  },
  async getById(_req: Request, res: GroupsResponse<{ params: GroupParams }>, next: NextFunction) {
    try {
      res.json(
        successResponse(await groupsService.getById(res.locals.auth, res.locals.params.groupId)),
      );
    } catch (error) {
      next(error);
    }
  },
  async create(_req: Request, res: GroupsResponse<{ body: CreateGroupInput }>, next: NextFunction) {
    try {
      res
        .status(201)
        .json(successResponse(await groupsService.create(res.locals.auth, res.locals.body)));
    } catch (error) {
      next(error);
    }
  },
  async update(
    _req: Request,
    res: GroupsResponse<{ params: GroupParams; body: UpdateGroupInput }>,
    next: NextFunction,
  ) {
    try {
      res.json(
        successResponse(
          await groupsService.update(res.locals.auth, res.locals.params.groupId, res.locals.body),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
  async delete(_req: Request, res: GroupsResponse<{ params: GroupParams }>, next: NextFunction) {
    try {
      res.json(
        successResponse(await groupsService.delete(res.locals.auth, res.locals.params.groupId)),
      );
    } catch (error) {
      next(error);
    }
  },
  async addMembers(
    _req: Request,
    res: GroupsResponse<{ params: GroupParams; body: AddGroupMembersInput }>,
    next: NextFunction,
  ) {
    try {
      res.json(
        successResponse(
          await groupsService.addMembers(
            res.locals.auth,
            res.locals.params.groupId,
            res.locals.body,
          ),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
  async deleteMember(
    _req: Request,
    res: GroupsResponse<{ params: GroupMemberParams }>,
    next: NextFunction,
  ) {
    try {
      res.json(
        successResponse(
          await groupsService.deleteMember(
            res.locals.auth,
            res.locals.params.groupId,
            res.locals.params.memberId,
          ),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
};
