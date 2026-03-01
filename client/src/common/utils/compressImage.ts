import imageCompression from "browser-image-compression";

/**
 * Compress an image File client-side using browser-image-compression.
 *
 * Configuration options explained:
 *
 *  maxSizeMB          — hard cap on output size; library will reduce quality /
 *                       dimensions iteratively until this is met. (0.3 = 300 KB)
 *
 *  maxWidthOrHeight   — longest side is scaled down to this before any quality
 *                       reduction, maintaining aspect ratio.
 *
 *  useWebWorker       — runs compression off the main thread so the UI stays
 *                       responsive; falls back to main thread gracefully.
 *
 *  fileType           — force JPEG output regardless of input format, keeping
 *                       S3 keys and downstream rendering predictable.
 *                       Switch to "image/webp" if your target browsers allow.
 *
 *  initialQuality     — starting quality for the iterative search (0–1).
 *                       0.8 gives a good size/quality balance as a first guess.
 *
 *  alwaysKeepResolution — false (default): the library may shrink dimensions
 *                         further to hit maxSizeMB after maxWidthOrHeight pass.
 *
 * External API is unchanged: accepts any image File, returns a compressed File.
 *
 * @param file  Original image File (any browser-supported format, ≤ any size)
 * @returns     Compressed File (JPEG, ≤ 300 KB, longest side ≤ 1000 px)
 */
export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,           // 300 KB target
    maxWidthOrHeight: 1000,   // resize longest side first
    useWebWorker: true,       // keep main thread free during compression
    fileType: "image/jpeg",   // consistent output type
    initialQuality: 0.8,      // starting quality for the iterative search
  });

  // imageCompression returns a File-like Blob; reconstruct as a proper File
  // so downstream callers (e.g. uploadItemImage) get a real File object with
  // a stable .name and .type — this also normalises the extension to .jpg.
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([compressed], `${baseName}.jpg`, { type: "image/jpeg" });
}

