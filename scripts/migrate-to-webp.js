import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "produk-pilok";
const WEBP_QUALITY = 85;

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_DELETE = process.argv.includes("--skip-delete");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function extractStoragePath(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/storage\/v1\/object\/public\/produk-pilok\/(.+)$/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function buildWebpPath(storagePath) {
  const decoded = decodeURIComponent(storagePath);
  const ext = path.extname(decoded);
  if (ext === ".webp") return decoded;
  return decoded.replace(/\.[^.]+$/, ".webp");
}

async function listAllObjects() {
  const allObjects = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list("public", {
        limit: pageSize,
        offset: page * pageSize,
      });

    if (error) {
      console.error("Error listing objects:", error);
      break;
    }

    if (!data || data.length === 0) break;

    for (const obj of data) {
      allObjects.push({
        ...obj,
        fullPath: `public/${obj.name}`,
      });
    }

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
  const webpPath = buildWebpPath(storagePath);
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
  const ext = path.extname(storagePath);
  if (ext === ".webp") return;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error(`   Failed to delete ${storagePath}: ${error.message}`);
  }
}

async function main() {
  console.log("=== Migrate to WebP: produk-pilok ===\n");
  if (DRY_RUN) console.log("*** DRY RUN MODE - no changes will be made ***\n");
  if (SKIP_DELETE) console.log("*** SKIP DELETE MODE - old files will be kept ***\n");

  console.log("1. Fetching all objects from bucket...");
  const objects = await listAllObjects();
  console.log(`   Total files in bucket: ${objects.length}`);

  console.log("\n2. Fetching all products from database...");
  const allProducts = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, image_url, image_url_2, image_url_3, color_swatch_url")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching products:", error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allProducts.push(...data);
    page++;

    if (data.length < pageSize) break;
  }

  console.log(`   Total products in database: ${allProducts.length}`);

  let convertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const product of allProducts) {
    const columns = ["image_url", "image_url_2", "image_url_3", "color_swatch_url"];

    for (const col of columns) {
      const url = product[col];
      if (!url) {
        skippedCount++;
        continue;
      }

      const storagePath = extractStoragePath(url);
      if (!storagePath) {
        console.warn(`   Skipping ${col} for product ${product.id}: not a Supabase Storage URL`);
        skippedCount++;
        continue;
      }

      const webpPath = buildWebpPath(storagePath);

      if (storagePath.endsWith(".webp")) {
        skippedCount++;
        continue;
      }

      const webpExists = objects.some((obj) => obj.fullPath === webpPath);
      if (webpExists) {
        const newUrl = await getPublicUrl(webpPath);
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from("products")
            .update({ [col]: newUrl })
            .eq("id", product.id);

          if (updateError) {
            errors.push({
              productId: product.id,
              column: col,
              error: updateError.message,
            });
            errorCount++;
            continue;
          }
        }
        console.log(`   Updated DB for product ${product.id} (${col}) → ${webpPath}`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`   Converting product ${product.id} (${col}): ${storagePath}`);
        const buffer = await downloadFile(storagePath);
        const webpBuffer = await convertToWebP(buffer, WEBP_QUALITY);

        if (!DRY_RUN) {
          await uploadWebP(storagePath, webpBuffer);
          const newUrl = await getPublicUrl(webpPath);

          const { error: updateError } = await supabase
            .from("products")
            .update({ [col]: newUrl })
            .eq("id", product.id);

          if (updateError) {
            throw new Error(`DB update failed: ${updateError.message}`);
          }
        }

        convertedCount++;
      } catch (err) {
        errors.push({
          productId: product.id,
          column: col,
          path: storagePath,
          error: err.message,
        });
        errorCount++;
        console.error(`   ERROR: ${err.message}`);
      }
    }
  }

  console.log("\n=== CONVERSION SUMMARY ===\n");
  console.log(`Converted:   ${convertedCount}`);
  console.log(`Skipped:     ${skippedCount}`);
  console.log(`Errors:      ${errorCount}`);

  if (errors.length > 0) {
    console.log("\n--- ERRORS ---");
    errors.forEach((e) => {
      console.log(`  product ${e.productId} (${e.column}): ${e.error}`);
    });
  }

  if (!DRY_RUN && !SKIP_DELETE && convertedCount > 0) {
    console.log("\n3. Deleting old files...");
    const oldFiles = objects
      .filter((obj) => {
        const name = obj.fullPath;
        return !name.endsWith(".webp");
      })
      .map((obj) => obj.fullPath);

    const batchSize = 100;
    for (let i = 0; i < oldFiles.length; i += batchSize) {
      const batch = oldFiles.slice(i, i + batchSize);
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (error) {
        console.error(`   Failed to delete batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        console.log(`   Deleted batch ${i / batchSize + 1} (${batch.length} files)`);
      }
    }
  }

  const reportDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    bucket: BUCKET_NAME,
    mode: DRY_RUN ? "dry-run" : SKIP_DELETE ? "skip-delete" : "full",
    totalProducts: allProducts.length,
    converted: convertedCount,
    skipped: skippedCount,
    errors: errorCount,
    errorDetails: errors,
  };

  const reportPath = path.join(reportDir, `migrate-webp-${BUCKET_NAME}-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
