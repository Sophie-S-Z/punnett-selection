import { expect, test } from "@playwright/test";

test("reduced motion keeps the lab static and keyboard navigation usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/#main$/);
  const activeAnimations = await page.evaluate(() =>
    document.getAnimations().filter((animation) => animation.playState === "running").length,
  );
  expect(activeAnimations).toBe(0);
  await expect(page.getByRole("button", { name: "Put on lab gloves" }).first()).toBeEnabled();
});
