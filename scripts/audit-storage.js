import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = "produk-pilok";

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

async function getAllProducts() {
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
      break;
    }

    if (!data || data.length === 0) break;

    allProducts.push(...data);
    page++;

    if (data.length < pageSize) break;
  }

  return allProducts;
}

async function main() {
  console.log("=== Audit Storage: produk-pilok ===\n");

  console.log("1. Fetching all objects from bucket...");
  const objects = await listAllObjects();
  console.log(`   Total files in bucket: ${objects.length}`);

  console.log("\n2. Fetching all products from database...");
  const products = await getAllProducts();
  console.log(`   Total products in database: ${products.length}`);

  const referencedPaths = new Set();
  const pathToProductMap = new Map();

  for (const product of products) {
    const columns = ["image_url", "image_url_2", "image_url_3", "color_swatch_url"];
    for (const col of columns) {
      const url = product[col];
      const storagePath = extractStoragePath(url);
      if (storagePath) {
        referencedPaths.add(storagePath);
        if (!pathToProductMap.has(storagePath)) {
          pathToProductMap.set(storagePath, []);
        }
        pathToProductMap.get(storagePath).push({
          productId: product.id,
          column: col,
          url,
        });
      }
    }
  }

  console.log(`   Total referenced paths in DB: ${referencedPaths.size}`);

  const orphans = [];
  const missing = [];

  for (const obj of objects) {
    const objPath = obj.fullPath;
    if (referencedPaths.has(objPath)) {
      referencedPaths.delete(objPath);
    } else {
      orphans.push({
        path: objPath,
        size: obj.metadata?.size || 0,
        lastModified: obj.updated_at || obj.created_at,
      });
    }
  }

  for (const [path, refs] of pathToProductMap.entries()) {
    missing.push({
      path,
      references: refs,
    });
  }

  const totalBucketSize = objects.reduce((sum, obj) => sum + (obj.metadata?.size || 0), 0);
  const orphanSize = orphans.reduce((sum, obj) => sum + obj.size, 0);

  console.log("\n=== AUDIT RESULTS ===\n");
  console.log(`Total files in bucket:           ${objects.length}`);
  console.log(`Total referenced files (DB):     ${pathToProductMap.size}`);
  console.log(`Orphaned files:                  ${orphans.length}`);
  console.log(`Missing files (DB → not in bucket): ${missing.length}`);
  console.log(`Total bucket size:               ${(totalBucketSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Orphaned size:                   ${(orphanSize / 1024 / 1024).toFixed(2)} MB`);

  if (orphans.length > 0) {
    console.log("\n--- ORPHANED FILES (first 50) ---");
    orphans.slice(0, 50).forEach((obj) => {
      console.log(
        `  ${obj.path} (${(obj.size / 1024).toFixed(1)} KB, modified: ${obj.lastModified})`,
      );
    });
    if (orphans.length > 50) {
      console.log(`  ... and ${orphans.length - 50} more`);
    }
  }

  if (missing.length > 0) {
    console.log("\n--- MISSING FILES (DB references but not in bucket) ---");
    missing.slice(0, 20).forEach((m) => {
      console.log(`  ${m.path}`);
      m.references.forEach((ref) => {
        console.log(`    → product ${ref.productId} (${ref.column})`);
      });
    });
    if (missing.length > 20) {
      console.log(`  ... and ${missing.length - 20} more`);
    }
  }

  const reportDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    bucket: BUCKET_NAME,
    totalFiles: objects.length,
    totalReferenced: pathToProductMap.size,
    orphans: orphans.length,
    missing: missing.length,
    totalBucketSizeMB: parseFloat((totalBucketSize / 1024 / 1024).toFixed(2)),
    orphanSizeMB: parseFloat((orphanSize / 1024 / 1024).toFixed(2)),
    orphanDetails: orphans.slice(0, 100),
    missingDetails: missing.slice(0, 100),
  };

  const reportPath = path.join(reportDir, `audit-${BUCKET_NAME}-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
