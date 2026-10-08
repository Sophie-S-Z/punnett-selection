import { readFileSync } from "node:fs";
import ts from "typescript";
import { expect, test } from "@playwright/test";
import { MAX_IMAGE_BYTES } from "../../src/lib/punnett/generation";

declare global {
  interface Window { punnettPrepareUpload: (source: File) => Promise<File> }
}

// Compile the application's exact utility. Canvas, decoding, and blobs run in Chrome.
const source = readFileSync(new URL("../../src/lib/punnett/imageUpload.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

test.beforeEach(async ({ page }) => {
  await page.setContent("<!doctype html><html lang='en'><head><title>Image codec acceptance</title></head><body></body></html>");
  await page.addScriptTag({ content: `(function () {
    const exports = {};
    const require = (id) => { if (id !== './generation') throw new Error('Unexpected dependency'); return { MAX_IMAGE_BYTES: ${MAX_IMAGE_BYTES} }; };
    ${compiled}
    window.punnettPrepareUpload = exports.prepareUpload;
  })();` });
});

test("a detailed camera image is resized and transported below the server image limit", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 31;
    for (let index = 0; index < pixels.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[index + channel] = seed >>> 24;
      }
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const source = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), "image/jpeg", .9));
    const output = await window.punnettPrepareUpload(new File([source], "large-camera.jpg", { type: "image/jpeg" }));
    const decoded = await createImageBitmap(output);
    const result = { sourceBytes: source.size, transportedBytes: output.size, type: output.type, width: decoded.width, height: decoded.height };
    decoded.close();
    return result;
  });
  expect(result.sourceBytes).toBeGreaterThan(MAX_IMAGE_BYTES);
  expect(result.transportedBytes).toBeGreaterThan(0);
  expect(result.transportedBytes).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
  expect(result.type).toBe("image/jpeg");
  expect(result.width).toBe(1600);
  expect(result.height).toBe(1200);
});

test("corrupt image bytes reject before transport and every local object URL is released", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const created: string[] = [];
    const released: string[] = [];
    URL.createObjectURL = object => { const url = originalCreate(object); created.push(url); return url; };
    URL.revokeObjectURL = url => { released.push(url); originalRevoke(url); };
    try {
      await window.punnettPrepareUpload(new File(["invalid image contents"], "corrupt.png", { type: "image/png" }));
      return { error: "", created, released };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : String(cause), created, released };
    } finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; }
  });
  expect(result.error).toContain("could not read this image");
  expect(result.created).toHaveLength(1);
  expect(result.released).toEqual(result.created);
});
