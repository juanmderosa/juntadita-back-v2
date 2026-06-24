import type { Request, Response } from "express";
import { successResponse } from "../helpers/response.helpers.js";

export const healthController = {
  getHealth(_req: Request, res: Response) {
    res.json(
      successResponse({
        ok: true,
        service: "juntadita-backend",
      }),
    );
  },
};
