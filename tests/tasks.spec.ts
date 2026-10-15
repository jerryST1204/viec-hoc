import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const emailA = process.env.TEST_EMAIL_A;
const passwordA = process.env.TEST_PASSWORD_A;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!emailA || !passwordA) {
  throw new Error(
    "Task tests require TEST_EMAIL_A and TEST_PASSWORD_A in the project .env.local file.",
  );
}

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    "Task tests require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
  );
}

const createdTaskIds = new Set<string>();
const uniqueTitle = `Playwright task ${crypto.randomUUID()}`;

async function getAccessToken() {
  const supabase = createClient(supabaseUrl!, publishableKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailA!,
    password: passwordA!,
  });

  if (error || !data.session) {
    throw new Error("Could not authenticate the configured Playwright test account.");
  }

  return { supabase, user: data.user, accessToken: data.session.access_token };
}

test.afterEach(async () => {
  if (createdTaskIds.size === 0) return;

  const { supabase, user } = await getAccessToken();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", user.id)
    .in("id", [...createdTaskIds]);

  if (error) {
    throw new Error("Could not clean up the task created by the Playwright test.");
  }

  createdTaskIds.clear();
});

test("A can create, reload, edit, complete, and delete a task", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(emailA!);
  await page.getByLabel(/Mật khẩu/).fill(passwordA!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/tasks") &&
      response.request().method() === "POST",
  );
  await page.getByLabel("Tên công việc").fill(uniqueTitle);
  await page.getByRole("button", { name: "Thêm vào danh sách" }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const createBody = (await createResponse.json()) as {
    data: { id: string; title: string };
  };
  if (typeof createBody.data?.id === "string") {
    createdTaskIds.add(createBody.data.id);
  }
  expect(createBody.data.title).toBe(uniqueTitle);

  let taskRow = page.locator(
    `[data-testid="task-item"][data-task-id="${createBody.data.id}"]`,
  );
  await expect(taskRow).toBeVisible();

  await page.reload();
  taskRow = page.locator(
    `[data-testid="task-item"][data-task-id="${createBody.data.id}"]`,
  );
  await expect(taskRow).toBeVisible();

  const updatedTitle = `${uniqueTitle} updated`;
  await taskRow.getByRole("button", { name: `Sửa ${uniqueTitle}` }).click();
  await taskRow.getByRole("textbox", { name: "Tên công việc" }).fill(updatedTitle);
  await taskRow.getByRole("button", { name: "Lưu tên công việc" }).click();
  taskRow = page.locator(
    `[data-testid="task-item"][data-task-id="${createBody.data.id}"]`,
  );
  await expect(taskRow).toBeVisible();

  const checkbox = taskRow.getByRole("checkbox");
  await expect(checkbox).toBeEnabled();
  const completionResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/tasks/${createBody.data.id}`) &&
      response.request().method() === "PATCH",
  );
  await checkbox.click();
  const completionResponse = await completionResponsePromise;
  expect(completionResponse.status()).toBe(200);
  await expect(checkbox).toBeChecked();

  page.once("dialog", (dialog) => dialog.accept());
  await taskRow.getByRole("button", { name: `Xóa ${updatedTitle}` }).click();
  await expect(
    page.locator(
      `[data-testid="task-item"][data-task-id="${createBody.data.id}"]`,
    ),
  ).toHaveCount(0);
});

test("tasks API rejects missing bearer token", async ({ request }) => {
  const response = await request.get("/api/tasks");

  expect(response.status()).toBe(401);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ error: "Chưa đăng nhập" });
});

test("tasks API rejects invalid task titles", async ({ request }) => {
  const { accessToken } = await getAccessToken();
  const response = await request.post("/api/tasks", {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { title: "   " },
  });

  expect(response.status()).toBe(400);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ error: "Tên phải có 1–120 ký tự" });
});
