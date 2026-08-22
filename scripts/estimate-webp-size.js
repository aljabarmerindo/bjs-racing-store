import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "produk-pilok";
const SAMPLE_SIZE = 50;
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

async function main() {
  console.log("=== Estimate WebP Size: produk-pilok ===\n");

  console.log("1. Fetching all objects from bucket...");
  const objects = await listAllObjects();
  console.log(`   Total files in bucket: ${objects.length}`);

  const currentTotalSize = objects.reduce((sum, obj) => sum + (obj.metadata?.size || 0), 0);
  console.log(`   Current total size: ${(currentTotalSize / 1024 / 1024).toFixed(2)} MB`);

  const sampleCount = Math.min(SAMPLE_SIZE, objects.length);
  console.log(`\n2. Sampling ${sampleCount} files for conversion...`);

  const sampleObjects = objects.slice(0, sampleCount);
  const results = [];
  let convertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < sampleObjects.length; i++) {
    const obj = sampleObjects[i];
    const storagePath = obj.fullPath;
    const originalSize = obj.metadata?.size || 0;

    if (originalSize === 0) {
      skippedCount++;
      continue;
    }

    try {
      const buffer = await downloadFile(storagePath);
      const webpBuffer = await convertToWebP(buffer, WEBP_QUALITY);
      const webpSize = webpBuffer.length;
      const ratio = webpSize / originalSize;

      results.push({
        path: storagePath,
        originalSize,
        webpSize,
        ratio,
      });
      convertedCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`   Processed ${i + 1}/${sampleObjects.length}...`);
      }
    } catch (err) {
      errorCount++;
      console.error(`   Failed to process ${storagePath}: ${err.message}`);
    }
  }

  console.log(`\n   Conversion complete: ${convertedCount} converted, ${skippedCount} skipped, ${errorCount} errors`);

  if (results.length === 0) {
    console.error("No samples were successfully converted. Cannot estimate.");
    process.exit(1);
  }

  const avgRatio = results.reduce((sum, r) => sum + r.ratio, 0) / results.length;
  const minRatio = Math.min(...results.map((r) => r.ratio));
  const maxRatio = Math.max(...results.map((r) => r.ratio));
  const estimatedWebpSize = currentTotalSize * avgRatio;
  const savingsMB = currentTotalSize / 1024 / 1024 - estimatedWebpSize / 1024 / 1024;
  const savingsPercent = (savingsMB / (currentTotalSize / 1024 / 1024)) * 100;

  console.log("\n=== ESTIMATION RESULTS ===\n");
  console.log(`Current total size:           ${(currentTotalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average compression ratio:    ${(avgRatio * 100).toFixed(1)}%`);
  console.log(`Min compression ratio:        ${(minRatio * 100).toFixed(1)}%`);
  console.log(`Max compression ratio:        ${(maxRatio * 100).toFixed(1)}%`);
  console.log(`Estimated WebP size:          ${(estimatedWebpSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Estimated savings:            ${savingsMB.toFixed(2)} MB (${savingsPercent.toFixed(1)}%)`);

  const reportDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    bucket: BUCKET_NAME,
    totalFiles: objects.length,
    currentTotalSizeMB: parseFloat((currentTotalSize / 1024 / 1024).toFixed(2)),
    sampleSize: results.length,
    averageRatio: parseFloat((avgRatio * 100).toFixed(1)),
    minRatio: parseFloat((minRatio * 100).toFixed(1)),
    maxRatio: parseFloat((maxRatio * 100).toFixed(1)),
    estimatedWebpSizeMB: parseFloat((estimatedWebpSize / 1024 / 1024).toFixed(2)),
    estimatedSavingsMB: parseFloat(savingsMB.toFixed(2)),
    estimatedSavingsPercent: parseFloat(savingsPercent.toFixed(1)),
    sampleDetails: results,
  };

  const reportPath = path.join(reportDir, `estimate-webp-${BUCKET_NAME}-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
