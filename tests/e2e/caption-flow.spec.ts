import { expect, test } from "@playwright/test";

test("the default experience explains image upload and AI captions in plain language", async ({ page }) => {
  await page.goto("/");
  const tools = page.getByRole("navigation", { name: "Caption tools" });
  await expect(tools.getByRole("link", { name: /Create captions/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("h1")).toContainText("Now with jokes.");
  await expect(page.getByRole("heading", { name: "Got a photo with potential?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Google" }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Lab sections" }).getByRole("link", { name: "Discover", exact: true })).toHaveCount(0);
  await expect(page.locator(".survival-card")).toHaveCount(0);
});

test("create and vote navigation work without organism selection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Caption tools" }).getByRole("link", { name: /Vote on captions/ }).click();
  await expect(page).toHaveURL(/mode=duel/);
  await expect(page.getByRole("heading", { name: "Which caption is funnier?" })).toBeVisible();
  await page.getByRole("navigation", { name: "Caption tools" }).getByRole("link", { name: /Create captions/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Got a photo with potential?" })).toBeVisible();
});

 test("the original icon is served and global navigation follows the current tool", async ({ page, request }) => {
  for (const path of ["/favicon.ico", "/icon.svg", "/apple-icon.png"]) {
    const icon = await request.get(path);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toMatch(/image/);
  }
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Lab sections" });
  await expect(navigation.getByRole("link", { name: "Create", exact: true })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "Vote", exact: true }).click();
  await expect(navigation.getByRole("link", { name: "Vote", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Create", exact: true })).not.toHaveAttribute("aria-current", "page");
});
