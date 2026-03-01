import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_BUCKET;

/**
 * How long a presigned GET URL stays valid (seconds).
 * 1 hour is a safe default — increase if your images are cached longer.
 */
const PRESIGNED_GET_EXPIRY = 60 * 60; // 1 hour

/**
 * How long a presigned PUT URL stays valid (seconds).
 * Frontend must complete the upload within this window.
 */
const PRESIGNED_PUT_EXPIRY = 60; // 60 seconds

// ─────────────────────────────────────────────────────────────
// Server-side upload (Cloudinary replacement — kept for reference)
// ─────────────────────────────────────────────────────────────

// /**
//  * Upload a file buffer to S3 directly from the server.
//  * (multer memory storage workflow — replaced by presigned URL approach)
//  *
//  * @param {Buffer} buffer
//  * @param {string} mimetype
//  * @param {string} [folder="uploads"]
//  * @returns {Promise<string>} S3 object key
//  */
// export async function uploadToS3(buffer, mimetype, folder = "uploads") {
//   const ext = mimetype.split("/")[1]?.split("+")[0] || "jpg";
//   const key = `${folder}/${randomUUID()}.${ext}`;
//   await s3.send(
//     new PutObjectCommand({
//       Bucket: BUCKET,
//       Key: key,
//       Body: buffer,
//       ContentType: mimetype,
//     })
//   );
//   return key;
// }

// ─────────────────────────────────────────────────────────────
// Presigned PUT URL — frontend uploads directly to S3
// ─────────────────────────────────────────────────────────────

/**
 * Generate a short-lived presigned PUT URL so the frontend can upload
 * an image directly to S3 without routing the file through the server.
 *
 * Typical flow:
 *   1. Frontend calls GET /api/v1/items/upload-url?mimetype=image/jpeg
 *   2. Backend returns { uploadUrl, imageUrl }  (imageUrl === the S3 key)
 *   3. Frontend PUTs the file to uploadUrl with the matching Content-Type header
 *   4. Frontend saves imageUrl when creating / editing the item
 *
 * @param {string} mimetype  - e.g. "image/jpeg", "image/png", "image/webp"
 * @param {string} [folder="uploads"] - S3 key prefix / folder
 * @returns {Promise<{ uploadUrl: string, imageKey: string }>}
 */
export async function getPresignedUploadUrl(mimetype, folder = "uploads") {
  const ext = mimetype.split("/")[1]?.split("+")[0] || "jpg";
  const key = `${folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimetype,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGNED_PUT_EXPIRY });

  return { uploadUrl, imageKey: key };
}

// ─────────────────────────────────────────────────────────────
// Presigned GET URL — reading objects
// ─────────────────────────────────────────────────────────────

/**
 * Generate a short-lived presigned GET URL for an S3 object key.
 *
 * @param {string|null|undefined} key
 * @returns {Promise<string|null>}
 */
export async function getPresignedUrl(key) {
  if (!key) return null;

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: PRESIGNED_GET_EXPIRY });
}

// ─────────────────────────────────────────────────────────────
// Response helpers — inject imageUrl into plain objects
// ─────────────────────────────────────────────────────────────
 /* object with an additional `imageUrl` property set to the presigned URL.
 *
 * Pass a Mongoose document through `.toObject()` first.
 *
 * @param {Object|null} obj
 * @returns {Promise<Object|null>}
 */
export async function withPresignedUrl(obj) {
  if (!obj) return obj;
  const imageUrl = await getPresignedUrl(obj.imageKey ?? null);
  return { ...obj, imageUrl };
}

/**
 * Map over an array of plain objects and add presigned `imageUrl` to each.
 *
 * @param {Object[]} arr
 * @returns {Promise<Object[]>}
 */
export async function withPresignedUrls(arr) {
  if (!arr || arr.length === 0) return arr;
  return Promise.all(arr.map(withPresignedUrl));
}
