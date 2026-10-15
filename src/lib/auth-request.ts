import "server-only";

import { createClient } from "@supabase/supabase-js";

export async function authRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice(7).trim();

  if (!token) return null;

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } = await db.auth.getUser(token);

  if (error || !data.user) return null;

  return { db, user: data.user };
}
