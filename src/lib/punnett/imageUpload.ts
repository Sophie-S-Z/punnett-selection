import { MAX_IMAGE_BYTES } from "./generation";

/** Decode locally and bound the transported image before a server action request. */
export async function prepareUpload(source: File): Promise<File> {
  const objectUrl = URL.createObjectURL(source);
  try {
    const image = new window.Image();
    image.src = objectUrl;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 80_000_000) throw new Error("Choose an image with at most 80 million pixels.");
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image. Try another browser.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.82, .65, .5]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size > 0 && blob.size <= MAX_IMAGE_BYTES) return new File([blob], "sample.jpg", { type: "image/jpeg" });
    }
    throw new Error("This image could not fit the upload limit. Choose a smaller image.");
  } catch (cause) {
    if (cause instanceof DOMException) throw new Error("Your browser could not read this image. Choose another JPEG, PNG, WebP, or GIF.");
    throw cause;
  } finally { URL.revokeObjectURL(objectUrl); }
}
