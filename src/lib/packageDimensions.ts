// File: src/lib/packageDimensions.ts
// Util dimensi & berat paket untuk integrasi Biteship (berat fisik + volumetrik).
// Kolom DB: products.panjang_cm / lebar_cm / tinggi_cm (default 10, cm), products.berat_gram (gram).
// Rumus volumetrik Biteship: (P x L x T) / 6000 = kg.

interface ProductDims {
  panjang_cm?: number | null;
  lebar_cm?: number | null;
  tinggi_cm?: number | null;
  berat_gram?: number | null;
}

export interface BoxDims {
  length: number;
  width: number;
  height: number;
}

const DEFAULT_CM = 10;
export const DEFAULT_WEIGHT_GRAM = 500;

function toCm(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CM;
}

export function getProductWeightGram(product?: ProductDims | null): number {
  const n = Number(product?.berat_gram);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WEIGHT_GRAM;
}

export function getProductDimsCm(product?: ProductDims | null): BoxDims {
  return {
    length: toCm(product?.panjang_cm),
    width: toCm(product?.lebar_cm),
    height: toCm(product?.tinggi_cm),
  };
}

export function aggregatePackageDims(
  items: { product?: ProductDims | null; quantity?: number }[],
): BoxDims {
  if (!items || items.length === 0) return { length: DEFAULT_CM, width: DEFAULT_CM, height: DEFAULT_CM };

  let length = 0;
  let width = 0;
  let height = 0;

  for (const it of items) {
    const d = getProductDimsCm(it.product);
    const qty = Math.max(1, Number(it.quantity) || 1);
    if (d.length > length) length = d.length;
    if (d.width > width) width = d.width;
    height += d.height * qty;
  }

  return { length, width, height };
}

export function formatDimsCm(dims: BoxDims): string {
  return `${dims.length}x${dims.width}x${dims.height} cm`;
}

export function volumetricKg(dims: BoxDims): number {
  return (dims.length * dims.width * dims.height) / 6000;
}

// Volumetrik dalam gram: (P x L x T) cm / 6000 kg => (P x L x T) / 6 gram.
export function volumetricWeightGram(dims: BoxDims): number {
  return Math.ceil((dims.length * dims.width * dims.height) / 6);
}

export type WeightBasis = "physical" | "volumetric";

// Basis tarif: Biteship memakai max(berat fisik, berat volumetrik).
export function getWeightBasis(physicalGram: number, volumetricGram: number): WeightBasis {
  return volumetricGram > physicalGram ? "volumetric" : "physical";
}

// Representasi dimensi per-unit x qty untuk label: "5x 6x6x17 cm".
export function formatItemDimsCm(
  items: { product?: ProductDims | null; quantity?: number }[],
): string {
  if (!items || items.length === 0) return "-";
  return items
    .map((it) => `${Math.max(1, Number(it.quantity) || 1)}x ${formatDimsCm(getProductDimsCm(it.product))}`)
    .join(", ");
}