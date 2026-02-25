import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Stream-upload a local file to Cloudinary, then delete the temp file.
 *
 * Uses upload_stream + fs.createReadStream so bytes are piped directly to
 * Cloudinary without buffering the whole file in memory first — noticeably
 * faster than uploader.upload(filePath) for images.
 *
 * Returns the Cloudinary response on success, or null on failure.
 */
export function uploadOnCloudinary(localFilePath) {
  return new Promise((resolve) => {
    if (!localFilePath) return resolve(null);

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image", // skip content-type sniffing ("auto" adds latency)
        quality: "auto",        // let Cloudinary pick the best quality/size trade-off
        fetch_format: "auto",   // serve WebP/AVIF to browsers that support it
      },
      (error, result) => {
        // Always remove the temp file regardless of outcome
        try { fs.unlinkSync(localFilePath); } catch { /* already gone */ }

        if (error) {
          console.error("Cloudinary upload error:", error);
          return resolve(null);
        }
        resolve(result);
      },
    );

    fs.createReadStream(localFilePath).pipe(stream);
  });
}
