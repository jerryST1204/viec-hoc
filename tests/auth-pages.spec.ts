import { expect, test } from "@playwright/test";

test("login page offers registration", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Việc học của tôi" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng ký" })).toHaveAttribute(
    "href",
    "/register",
  );
});

test("register page links back to login", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByRole("heading", { name: "Tạo tài khoản" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
    "href",
    "/login",
  );
});
