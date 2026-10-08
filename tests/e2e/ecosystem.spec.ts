import { expect, test } from "@playwright/test";

test("anonymous and cross-origin survival mutations are rejected", async ({ request }) => {
  const anonymous = await request.post("/api/survival", { data: { captionId: "2f896623-076b-4bd0-ad53-58b23f5f08d1", vote: 1, userId: "d5e151a0-a156-44cb-b676-36c0e503b6f0" } });
  expect(anonymous.status()).toBe(401);
  const crossOrigin = await request.post("/api/survival", { headers: { origin: "https://example.org" }, data: {} });
  expect(crossOrigin.status()).toBe(403);
});

test("survival is the default mode and visitors can read but cannot rate", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Rating mode" }).getByRole("link", { name: /Survival ratings/ })).toHaveAttribute("aria-current", "page");
  const chamber = page.getByRole("region", { name: "Survival ratings", exact: true });
  await expect(chamber.getByRole("heading", { name: "Does this field note survive?" })).toBeVisible();
  await expect(chamber.getByText("The organism is doing its best.")).toBeVisible();
  const note = chamber.locator(".survival-card");
  if (await note.count()) {
    await expect(note.locator("h3")).not.toBeEmpty();
    await expect(note.locator(".survival-description")).not.toBeEmpty();
    await expect(note.getByRole("button", { name: "Thrives — funny", exact: true })).toBeDisabled();
    await expect(note.getByRole("button", { name: "Extinct — not funny", exact: true })).toBeDisabled();
    await expect(note.getByRole("button", { name: "Keep observing S", exact: true })).toBeDisabled();
    let mutations = 0;
    page.on("request", request => { if (request.method() === "POST") mutations += 1; });
    await page.keyboard.press("t"); await page.keyboard.press("e"); await page.keyboard.press("s");
    expect(mutations).toBe(0);
  } else {
    await expect(chamber.locator(".chamber-error, .chamber-empty")).toBeVisible();
  }
  await expect(chamber.getByRole("button", { name: "Put on lab gloves", exact: true })).toBeVisible();
});

test("both rating modes remain linkable and discovery has a working destination", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Rating mode" }).getByRole("link", { name: /Paired captions/ }).click();
  await expect(page).toHaveURL(/mode=duel/);
  await expect(page.getByRole("region", { name: "Selection chamber", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Rating mode" }).getByRole("link", { name: /Survival ratings/ }).click();
  await expect(page).toHaveURL(/mode=survival/);
  await expect(page.getByRole("region", { name: "Survival ratings", exact: true })).toBeVisible();
  await page.locator(".ecosystem-discover").click();
  await expect(page).toHaveURL(/\/$/);
});

test("culture shader has a static fallback if the graphics context is lost", async ({ page }) => {
  await page.goto("/");
  const culture = page.locator(".ambient-culture");
  await expect(culture).toHaveAttribute("aria-hidden", "true");
  await expect(culture.locator(".culture-contour")).toHaveCount(2);
  await culture.locator("canvas").evaluate(canvas => canvas.dispatchEvent(new Event("webglcontextlost")));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(culture.locator(".contour-one")).toBeVisible();
});

test.describe("actual authenticated survival acceptance", () => {
  test.use({ storageState: process.env.PUNNETT_AUTH_STATE ?? { cookies: [], origins: [] } });
  test.skip(!process.env.PUNNETT_AUTH_STATE, "Provide an ignored storage-state file from a real Google session.");
  test("a real single rating persists once and leaves both rating modes", async ({ page }) => {
    test.skip(process.env.PUNNETT_TEST_VOTES !== "1", "Set PUNNETT_TEST_VOTES=1 to authorize a persisted rating.");
    await page.goto("/");
    const card = page.locator(".survival-card");
    test.skip(await card.count() !== 1, "No unjudged real field note is available.");
    const code = (await card.locator(".survival-card-meta .eyebrow").textContent())!.replace("SPC · ", "");
    const text = await card.locator(".survival-description").textContent();
    await card.getByRole("button", { name: "Thrives — funny", exact: true }).click();
    await expect(page.getByText("Thrives. Rating saved.", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Survival ratings", exact: true })).toHaveAttribute("aria-busy", "false");
    await page.goto("/lab/notebook");
    await expect(page.locator(".selection-history li").filter({ hasText: code })).toHaveCount(1);
    await page.reload();
    await expect(page.locator(".selection-history li").filter({ hasText: code })).toHaveCount(1);
    await page.goto("/");
    await expect(page.locator(".survival-description").filter({ hasText: text! })).toHaveCount(0);
    await page.goto("/?mode=duel");
    await expect(page.locator(".duel-card").filter({ hasText: code })).toHaveCount(0);
  });
});
