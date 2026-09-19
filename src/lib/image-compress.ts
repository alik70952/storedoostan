"use client";

// فشرده‌سازی و تغییر اندازه عکس در مرورگر (قبل از آپلود):
// - تا ۱۲۰۰ پیکسل بلندترین ضلع، خروجی WebP (کیفیت ۰٫۸۲)؛ اگر مرورگر WebP نداد، JPEG.
// - حجم آپلود کم می‌شود و سرعت ذخیره در پنل بالاتر می‌رود.

export type CompressResult = { bytes: Uint8Array; mime: string } | null;

const MAX_DIMENSION = 1200;
const QUALITY = 0.82;

export async function compressImageFile(file: File): Promise<CompressResult> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return null;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const supported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    const mime = supported ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, QUALITY));
    if (!blob || blob.size === 0) return null;

    // اگر فشرده‌سازی به‌صرفه نبود (عکس خیلی کوچک بوده)، فایل اصلی بماند
    if (blob.size >= file.size) return null;

    const buffer = new Uint8Array(await blob.arrayBuffer());
    return { bytes: buffer, mime };
  } catch {
    return null;
  }
}
