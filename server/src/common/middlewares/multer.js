import multer from "multer";
// import path from "path";  // no longer needed — disk storage removed

// ── Disk storage (Cloudinary workflow — kept for reference) ──────────────────
// const diskStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.join(process.cwd(), "public", "temp"));
//   },
//   filename: function (req, file, cb) {
//     const unique = `${Date.now()}-${file.originalname}`;
//     cb(null, unique);
//   },
// });
// export const upload = multer({ storage: diskStorage });

// ── Memory storage (S3 workflow) ─────────────────────────────────────────────
// Files are buffered in RAM (req.file.buffer) so we can stream them straight
// to S3 without writing a temp file to disk first.
