import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "produk-pilok";
const WEBP_QUALITY = 85;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listAllRecursive(path = "public") {
  const { data } = await supabase.storage.from(BUCKET_NAME).list(path);
  if (!data) return [];

  let results = [];
  for (const item of data) {
    const fullPath = path + "/" + item.name;
    if (!item.name.includes(".")) {
      const subItems = await listAllRecursive(fullPath);
      results = results.concat(subItems);
    } else {
      results.push({
        path: fullPath,
        name: item.name,
        size: item.metadata?.size || 0,
      });
    }
  }
  return results;
}

async function downloadFile(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error) {
    throw new Error(`Failed to download ${storagePath}: ${error.message}`);
  }

  if (data instanceof Buffer) return data;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer;
}

async function convertToWebP(buffer, quality = 85) {
  const webpBuffer = await sharp(buffer)
    .webp({ quality })
    .toBuffer();
  return webpBuffer;
}

async function uploadWebP(storagePath, webpBuffer) {
  const ext = path.extname(storagePath);
  const webpPath = storagePath.replace(/\.[^.]+$/, ".webp");
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(webpPath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${webpPath}: ${error.message}`);
  }
  return webpPath;
}

async function getPublicUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function deleteOldFile(storagePath) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error(`   Failed to delete ${storagePath}: ${error.message}`);
  }
}

async function main() {
  console.log("=== Convert remaining non-WebP files to WebP ===\n");

  console.log("1. Fetching all files from bucket...");
  const allFiles = await listAllRecursive("public");
  const nonWebp = allFiles.filter(
    (f) =>
      !f.name.endsWith(".webp") &&
      !f.name.includes(".emptyFolderPlaceholder")
  );

  console.log(`   Total files: ${allFiles.length}`);
  console.log(`   Non-WebP files to convert: ${nonWebp.length}`);

  const totalSize = nonWebp.reduce((sum, f) => sum + f.size, 0);
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of nonWebp) {
    const webpPath = file.path.replace(/\.[^.]+$/, ".webp");
    const webpExists = allFiles.some((f) => f.path === webpPath);

    if (webpExists) {
      console.log(`   Skipping (WebP exists): ${file.path}`);
      skipped++;
      continue;
    }

    try {
      console.log(`   Converting: ${file.path}`);
      const buffer = await downloadFile(file.path);
      const webpBuffer = await convertToWebP(buffer, WEBP_QUALITY);
      await uploadWebP(file.path, webpBuffer);
      await deleteOldFile(file.path);
      converted++;
    } catch (err) {
      errors++;
      console.error(`   ERROR: ${err.message}`);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Converted: ${converted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
