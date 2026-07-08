import type { NextFunction, Request, Response } from "express";
import { paginatedResponse, successResponse } from "../helpers/response.helpers.js";
import type {
  CreateEventInput,
  EventParams,
  ListEventsQuery,
  UpdateEventInput,
} from "../schemas/events.schemas.js";
import { eventsService } from "../services/events.service.js";
import type { AuthLocals } from "../types/auth.js";

type EventsResponse<T extends object = object> = Response<
  unknown,
  AuthLocals & T
>;

export const eventsController = {
  async create(
    _req: Request,
    res: EventsResponse<{ body: CreateEventInput }>,
    next: NextFunction,
  ) {
    try {
      const event = await eventsService.create(
        res.locals.auth,
        res.locals.body,
      );
      res.status(201).json(successResponse(event));
    } catch (error) {
      next(error);
    }
  },

  async list(
    _req: Request,
    res: EventsResponse<{ query: ListEventsQuery }>,
    next: NextFunction,
  ) {
    try {
      const result = await eventsService.list(
        res.locals.auth,
        res.locals.query.page,
        res.locals.query.limit,
      );
      res.json(paginatedResponse(result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  },

  async getById(
    _req: Request,
    res: EventsResponse<{ params: EventParams }>,
    next: NextFunction,
  ) {
    try {
      const event = await eventsService.getById(
        res.locals.auth,
        res.locals.params.eventId,
      );
      res.json(successResponse(event));
    } catch (error) {
      next(error);
    }
  },

  async update(
    _req: Request,
    res: EventsResponse<{ params: EventParams; body: UpdateEventInput }>,
    next: NextFunction,
  ) {
    try {
      const event = await eventsService.update(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.body,
      );
      res.json(successResponse(event));
    } catch (error) {
      next(error);
    }
  },
};
