import type { NextFunction, Request, Response } from "express";
import {
  paginatedResponse,
  successResponse,
} from "../helpers/response.helpers.js";
import { expensesService } from "../services/expenses.service.js";
import type {
  CreateExpenseInput,
  ExpenseParams,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "../schemas/expenses.schemas.js";
import type { AuthLocals } from "../types/auth.js";

type ExpensesResponse<T extends object = object> = Response<
  unknown,
  AuthLocals & T
>;

export const expensesController = {
  async list(
    _req: Request,
    res: ExpensesResponse<{
      params: { eventId: string };
      query: ListExpensesQuery;
    }>,
    next: NextFunction,
  ) {
    try {
      const result = await expensesService.list(
        res.locals.auth,
        res.locals.params.eventId,
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
    res: ExpensesResponse<{ params: ExpenseParams }>,
    next: NextFunction,
  ) {
    try {
      const expense = await expensesService.getById(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.params.expenseId,
      );
      res.json(successResponse(expense));
    } catch (error) {
      next(error);
    }
  },

  async create(
    _req: Request,
    res: ExpensesResponse<{
      params: { eventId: string };
      body: CreateExpenseInput;
    }>,
    next: NextFunction,
  ) {
    try {
      const expense = await expensesService.create(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.body,
      );
      res.status(201).json(successResponse(expense));
    } catch (error) {
      next(error);
    }
  },

  async update(
    _req: Request,
    res: ExpensesResponse<{ params: ExpenseParams; body: UpdateExpenseInput }>,
    next: NextFunction,
  ) {
    try {
      const expense = await expensesService.update(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.params.expenseId,
        res.locals.body,
      );
      res.json(successResponse(expense));
    } catch (error) {
      next(error);
    }
  },

  async delete(
    _req: Request,
    res: ExpensesResponse<{ params: ExpenseParams }>,
    next: NextFunction,
  ) {
    try {
      const result = await expensesService.delete(
        res.locals.auth,
        res.locals.params.eventId,
        res.locals.params.expenseId,
      );
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },
};
