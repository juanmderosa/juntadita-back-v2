import type { NextFunction, Request, Response } from "express";
import { successResponse } from "../helpers/response.helpers.js";
import { paymentsService } from "../services/payments.service.js";
import type { AuthLocals } from "../types/auth.js";
import type {
  CreatePaymentInput,
  PaymentParams,
  VoidPaymentInput,
} from "../schemas/payments.schemas.js";

import type { EventParams } from "../schemas/events.schemas.js";
type PaymentsResponse<T extends object = object> = Response<unknown, AuthLocals & T>;

export const paymentsController = {
  async overview(
    _req: Request,
    res: PaymentsResponse<{ params: EventParams }>,
    next: NextFunction,
  ) {
    try {
      res.json(
        successResponse(
          await paymentsService.getOverview(res.locals.auth, res.locals.params.eventId),
        ),
      );
    } catch (error) {
      next(error);
    }
  },

  async create(
    _req: Request,
    res: PaymentsResponse<{ params: EventParams; body: CreatePaymentInput }>,
    next: NextFunction,
  ) {
    try {
      const payment = await paymentsService.create(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.body,
      );
      res.status(201).json(successResponse(payment));
    } catch (error) {
      next(error);
    }
  },

  async void(
    _req: Request,
    res: PaymentsResponse<{ params: PaymentParams; body: VoidPaymentInput }>,
    next: NextFunction,
  ) {
    try {
      res.json(
        successResponse(
          await paymentsService.void(
            res.locals.auth,
            res.locals.params.eventId,
            res.locals.params.paymentId,
            res.locals.body,
          ),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
};
