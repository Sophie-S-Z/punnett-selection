import { expect, test } from "@playwright/test";

test("caption voting labels have no leftover specimen codes", async ({ page }) => {
  await page.goto("/?mode=duel");
  const labels = page.locator(".duel-card-meta .eyebrow");
  await expect(labels).toHaveCount(2);
  expect(await labels.allTextContents()).toEqual(["Caption A", "Caption B"]);
  await expect(page.getByRole("region", { name: "Selection chamber", exact: true })).not.toContainText(/\b[ACGT]{4}-\d{4}\b/);
});

test("signed-in caption history contains descriptive labels instead of specimen codes", async ({ browser }) => {
  test.skip(!process.env.PUNNETT_AUTH_STATE, "Requires an existing Google session.");
  const context = await browser.newContext({ storageState: process.env.PUNNETT_AUTH_STATE });
  try {
    const page = await context.newPage();
    for (const route of ["/lab/notebook", "/lab/notebook/created"]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.locator("main")).not.toContainText(/\b[ACGT]{4}-\d{4}\b/);
    }
  } finally { await context.close(); }
});
