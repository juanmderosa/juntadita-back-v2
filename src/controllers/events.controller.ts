import type { NextFunction, Request, Response } from "express";
import { paginatedResponse, successResponse } from "../helpers/response.helpers.js";
import type {
  CreateEventOptionsBatchInput,
  CreateEventOptionInput,
  CreateEventInput,
  EventOptionParams,
  EventParams,
  InviteParticipantsInput,
  ReplaceVotesInput,
  ResolveTieInput,
  VoteParams,
  ListEventsQuery,
  UpdateEventOptionInput,
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

  async listOptions(
    _req: Request,
    res: EventsResponse<{ params: EventParams }>,
    next: NextFunction,
  ) {
    try {
      const options = await eventsService.listOptions(
        res.locals.auth,
        res.locals.params.eventId,
      );
      res.json(successResponse(options));
    } catch (error) {
      next(error);
    }
  },

  async createOption(
    _req: Request,
    res: EventsResponse<{ params: EventParams; body: CreateEventOptionInput }>,
    next: NextFunction,
  ) {
    try {
      const option = await eventsService.createOption(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.body,
      );
      res.status(201).json(successResponse(option));
    } catch (error) {
      next(error);
    }
  },

  async createOptionsBatch(
    _req: Request,
    res: EventsResponse<{
      params: EventParams;
      body: CreateEventOptionsBatchInput;
    }>,
    next: NextFunction,
  ) {
    try {
      const options = await eventsService.createOptionsBatch(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.body,
      );
      res.status(201).json(successResponse(options));
    } catch (error) {
      next(error);
    }
  },

  async updateOption(
    _req: Request,
    res: EventsResponse<{
      params: EventOptionParams;
      body: UpdateEventOptionInput;
    }>,
    next: NextFunction,
  ) {
    try {
      const option = await eventsService.updateOption(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.params.optionId,
        res.locals.body,
      );
      res.json(successResponse(option));
    } catch (error) {
      next(error);
    }
  },

  async deleteOption(
    _req: Request,
    res: EventsResponse<{ params: EventOptionParams }>,
    next: NextFunction,
  ) {
    try {
      const result = await eventsService.deleteOption(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.params.optionId,
      );
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async listParticipants(
    _req: Request,
    res: EventsResponse<{ params: EventParams }>,
    next: NextFunction,
  ) {
    try {
      const participants = await eventsService.listParticipants(
        res.locals.auth,
        res.locals.params.eventId,
      );
      res.json(successResponse(participants));
    } catch (error) {
      next(error);
    }
  },

  async inviteParticipants(
    _req: Request,
    res: EventsResponse<{
      params: EventParams;
      body: InviteParticipantsInput;
    }>,
    next: NextFunction,
  ) {
    try {
      const result = await eventsService.inviteParticipants(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.body,
      );
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  async replaceVotes(_req: Request, res: EventsResponse<{ params: VoteParams; body: ReplaceVotesInput }>, next: NextFunction) {
    try {
      const result = await eventsService.replaceVotes(res.locals.auth, res.locals.params.eventId, res.locals.body);
      res.json(successResponse(result));
    } catch (error) { next(error); }
  },

  async getVoting(_req: Request, res: EventsResponse<{ params: VoteParams }>, next: NextFunction) {
    try {
      const result = await eventsService.getVoting(res.locals.auth, res.locals.params.eventId);
      res.json(successResponse(result));
    } catch (error) { next(error); }
  },

  async resolveTie(_req: Request, res: EventsResponse<{ params: VoteParams; body: ResolveTieInput }>, next: NextFunction) {
    try {
      const result = await eventsService.resolveTie(res.locals.auth, res.locals.params.eventId, res.locals.body);
      res.json(successResponse(result));
    } catch (error) { next(error); }
  },
};
