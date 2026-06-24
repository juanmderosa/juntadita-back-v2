import type { User } from "@supabase/supabase-js";

export type AuthContext = {
  userId: string;
  email: string | null;
  accessToken: string;
  user: User;
};

export type AuthLocals = {
  auth: AuthContext;
};
