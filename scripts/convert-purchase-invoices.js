import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "purchase-invoices";
const WEBP_QUALITY = 85;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listAllObjects() {
  const allObjects = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list("", {
        limit: pageSize,
        offset: page * pageSize,
      });

    if (error) {
      console.error("Error listing objects:", error);
      break;
    }

    if (!data || data.length === 0) break;

    allObjects.push(...data);
    page++;

    if (data.length < pageSize) break;
  }

  return allObjects;
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
  const webpPath = storagePath + ".webp";
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

async function deleteOldFile(storagePath) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error(`   Failed to delete ${storagePath}: ${error.message}`);
  }
}

async function main() {
  console.log("=== Convert purchase-invoices to WebP ===\n");

  console.log("1. Fetching all files from bucket...");
  const objects = await listAllObjects();
  const files = objects.filter(obj => !obj.name.includes('.emptyFolderPlaceholder'));
  console.log(`   Total files: ${files.length}`);

  const totalSize = files.reduce((sum, obj) => sum + (obj.metadata?.size || 0), 0);
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const storagePath = file.name;
    const webpPath = storagePath + ".webp";

    if (storagePath.endsWith(".webp")) {
      console.log(`   Skipping (already WebP): ${storagePath}`);
      skipped++;
      continue;
    }

    try {
      console.log(`   Converting: ${storagePath} (${(file.metadata?.size || 0) / 1024} KB)`);
      const buffer = await downloadFile(storagePath);
      const webpBuffer = await convertToWebP(buffer, WEBP_QUALITY);
      await uploadWebP(storagePath, webpBuffer);
      await deleteOldFile(storagePath);
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
