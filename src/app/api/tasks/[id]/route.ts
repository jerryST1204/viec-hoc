import { z } from "zod";
import { authRequest } from "@/lib/auth-request";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const taskId = z.string().uuid();

const patchInput = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    is_done: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type RouteContext = { params: Promise<{ id: string }> };

async function withErrorHandling(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch {
    return json({ error: "Đã xảy ra lỗi máy chủ" }, 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return withErrorHandling(async () => {
    const auth = await authRequest(request);

    if (!auth) return json({ error: "Chưa đăng nhập" }, 401);

    const { id } = await params;
    const parsedId = taskId.safeParse(id);

    if (!parsedId.success) {
      return json({ error: "ID công việc không hợp lệ" }, 400);
    }

    const parsedInput = patchInput.safeParse(
      await request.json().catch(() => null),
    );

    if (!parsedInput.success) {
      return json({ error: "Dữ liệu cập nhật không hợp lệ" }, 400);
    }

    const { data, error } = await auth.db
      .from("tasks")
      .update(parsedInput.data)
      .eq("id", parsedId.data)
      .eq("user_id", auth.user.id)
      .select("id,title,is_done,created_at")
      .maybeSingle();

    if (error) return json({ error: "Không cập nhật được công việc" }, 500);
    if (!data) return json({ error: "Không tìm thấy công việc" }, 404);

    return json({ data });
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return withErrorHandling(async () => {
    const auth = await authRequest(request);

    if (!auth) return json({ error: "Chưa đăng nhập" }, 401);

    const { id } = await params;
    const parsedId = taskId.safeParse(id);

    if (!parsedId.success) {
      return json({ error: "ID công việc không hợp lệ" }, 400);
    }

    const { data, error } = await auth.db
      .from("tasks")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", auth.user.id)
      .select("id")
      .maybeSingle();

    if (error) return json({ error: "Không xóa được công việc" }, 500);
    if (!data) return json({ error: "Không tìm thấy công việc" }, 404);

    return json({ data: { id: data.id } });
  });
}
