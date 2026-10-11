import { expect, test } from "@playwright/test";

test("legacy single-vote endpoints still reject anonymous and cross-origin writes", async ({ request }) => {
  const anonymous = await request.post("/api/survival", { data: { captionId: "2f896623-076b-4bd0-ad53-58b23f5f08d1", vote: 1 } });
  expect(anonymous.status()).toBe(401);
  const crossOrigin = await request.post("/api/survival", { headers: { origin: "https://example.org" }, data: {} });
  expect(crossOrigin.status()).toBe(403);
});

test("the default experience explains image upload and AI captions in plain language", async ({ page }) => {
  await page.goto("/");
  const tools = page.getByRole("navigation", { name: "Caption tools" });
  await expect(tools.getByRole("link", { name: /Create captions/ })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("h1")).toContainText("A better punchline.");
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
