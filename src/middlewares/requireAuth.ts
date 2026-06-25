import type { NextFunction, Request, Response } from "express";
import { getSupabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../types/httpError.js";
import type { AuthLocals } from "../types/auth.js";

export function parseBearerToken(authorization: string | undefined) {
  if (!authorization) return null;

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme !== "Bearer" || !token || extra) return null;

  return token;
}

export async function requireAuth(
  req: Request,
  res: Response<unknown, Partial<AuthLocals>>,
  next: NextFunction,
) {
  try {
    const accessToken = parseBearerToken(req.get("authorization"));

    if (!accessToken) {
      throw new HttpError("Authorization bearer token is required", 401);
    }

    const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);

    if (error || !data.user) {
      throw new HttpError("Invalid or expired access token", 401);
    }

    res.locals.auth = {
      userId: data.user.id,
      email: data.user.email ?? null,
      accessToken,
      user: data.user,
    };

    next();
  } catch (error) {
    next(error);
  }
}
