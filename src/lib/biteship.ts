// File: src/lib/biteship.ts
// Klien Biteship API (rates, order, webhook verify).
import crypto from "crypto";

const BITESHIP_BASE = "https://api.biteship.com";
const API_KEY = import.meta.env.BITESHIP_API_KEY || "";
const ORIGIN_LAT = Number(import.meta.env.BITESHIP_ORIGIN_LAT || 0);
const ORIGIN_LNG = Number(import.meta.env.BITESHIP_ORIGIN_LNG || 0);
const ORIGIN_POSTAL = import.meta.env.BITESHIP_ORIGIN_POSTAL || "";
const WEBHOOK_KEY = import.meta.env.BITESHIP_WEBHOOK_KEY || "X-Biteship-Signature";
const WEBHOOK_SECRET = import.meta.env.BITESHIP_WEBHOOK_SECRET || "";

async function biteshipRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await fetch(`${BITESHIP_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Biteship ${path} gagal: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

export interface BiteshipRateOption {
  company: string;
  courier_name: string;
  courier_service_code: string;
  courier_service_name: string;
  price: number;
  duration: string;
}

export async function getBiteshipRates(params: {
  destination: { latitude?: number; longitude?: number; postal_code?: string };
  weight: number;
  couriers?: string;
  value?: number;
}): Promise<BiteshipRateOption[]> {
  const couriers = params.couriers || "gojek,pos";
  const body: any = {
    origin_latitude: ORIGIN_LAT,
    origin_longitude: ORIGIN_LNG,
    couriers,
    items: [
      {
        name: "Pesanan BJS Racing",
        description: "Pakaian & sparepart motor",
        value: Math.max(0, Math.round(params.value || 0)),
        quantity: 1,
        weight: Math.max(1, Math.round(params.weight)),
        length: 10,
        width: 10,
        height: 10,
      },
    ],
  };

  if (ORIGIN_POSTAL) {
    body.origin_postal_code = Number(ORIGIN_POSTAL);
  }

  if (params.destination.latitude && params.destination.longitude) {
    body.destination_latitude = params.destination.latitude;
    body.destination_longitude = params.destination.longitude;
  } else if (params.destination.postal_code) {
    body.destination_postal_code = params.destination.postal_code;
  }

  const json = await biteshipRequest("POST", "/v1/rates/couriers", body);

  const pricing = (json.pricing || []) as any[];
  return pricing.map((p) => ({
    company: p.company,
    courier_name: p.courier_name,
    courier_service_code: p.courier_service_code,
    courier_service_name: p.courier_service_name,
    price: p.price,
    duration: p.duration || `${p.shipment_duration_range || ""} ${p.shipment_duration_unit || ""}`.trim(),
  }));
}

export interface CreateBiteshipOrderParams {
  referenceId: string;
  origin: {
    contactName: string;
    contactPhone: string;
    address: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };
  destination: {
    contactName: string;
    contactPhone: string;
    address: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };
  courierCompany: string;
  courierType: string;
  deliveryType?: "now" | "scheduled" | "later";
  items: { name: string; description: string; quantity: number; weight: number; value: number }[];
}

export interface BiteshipOrderResult {
  id: string;
  waybillId: string;
  trackingId: string;
  status: string;
  price: number;
}

export async function createBiteshipOrder(
  p: CreateBiteshipOrderParams,
): Promise<BiteshipOrderResult> {
  const body: any = {
    reference_id: p.referenceId,
    origin_contact_name: p.origin.contactName,
    origin_contact_phone: p.origin.contactPhone,
    origin_address: p.origin.address,
    origin_postal_code: p.origin.postalCode ? Number(p.origin.postalCode) : undefined,
    destination_contact_name: p.destination.contactName,
    destination_contact_phone: p.destination.contactPhone,
    destination_address: p.destination.address,
    destination_postal_code: p.destination.postalCode ? Number(p.destination.postalCode) : undefined,
    courier_company: p.courierCompany,
    courier_type: p.courierType,
    delivery_type: p.deliveryType || "now",
    items: p.items.map((it) => ({
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      weight: Math.max(1, Math.round(it.weight)),
      value: it.value,
      length: 10,
      width: 10,
      height: 10,
    })),
  };

  if (p.origin.latitude && p.origin.longitude) {
    body.origin_coordinate = { latitude: p.origin.latitude, longitude: p.origin.longitude };
  }
  if (p.destination.latitude && p.destination.longitude) {
    body.destination_coordinate = { latitude: p.destination.latitude, longitude: p.destination.longitude };
  }

  const json = await biteshipRequest("POST", "/v1/orders", body);
  return {
    id: json.id,
    waybillId: json.courier?.waybill_id || "",
    trackingId: json.courier?.tracking_id || "",
    status: json.status,
    price: json.price,
  };
}

export interface BiteshipAreaResult {
  id: string;
  name: string;
  type: string;
  country: string;
  administrativeLevel1?: string;
  administrativeLevel2?: string;
  administrativeLevel3?: string;
  administrativeLevel4?: string;
  latitude: string;
  longitude: string;
  postalCode?: string;
}

export async function searchBiteshipAreas(query: string): Promise<BiteshipAreaResult[]> {
  if (!query || query.length < 3) return [];
  const json = await biteshipRequest(
    "GET",
    `/v1/maps/areas?countries=ID&input=${encodeURIComponent(query)}&type=single&limit=10`,
  );
  const areas = (json.areas || json.data || []) as any[];
  return areas.map((area) => ({
    id: String(area.id || area.area_id || ""),
    name: area.name || area.area_name || "",
    type: area.type || "",
    country: area.country || "",
    administrativeLevel1: area.administrative_division_level_1_name || area.province_name || "",
    administrativeLevel2: area.administrative_division_level_2_name || area.city_name || "",
    administrativeLevel3: area.administrative_division_level_3_name || area.district_name || "",
    administrativeLevel4: area.administrative_division_level_4_name || area.subdistrict_name || "",
    latitude: String(area.latitude || area.lat || ""),
    longitude: String(area.longitude || area.lng || ""),
    postalCode: area.postal_code ? String(area.postal_code) : area.zip_code || "",
  }));
}

export interface BiteshipTrackingResult {
  status: string;
  history: Array<{
    status: string;
    note: string;
    timestamp: string;
    location?: string;
  }>;
}

export async function getBiteshipTracking(trackingId: string): Promise<BiteshipTrackingResult> {
  const json = await biteshipRequest("GET", `/v1/trackings/${encodeURIComponent(trackingId)}`);
  const history = (json.history || []).map((h: any) => ({
    status: h.status || "",
    note: h.note || h.description || "",
    timestamp: h.timestamp || h.created_at || "",
    location: h.location || h.city || "",
  }));
  return {
    status: json.status || json.current_status || "",
    history,
  };
}

export function verifyBiteshipWebhook(
  headers: Headers,
  rawBody: string,
): boolean {
  if (!WEBHOOK_SECRET) return false;

  const signature = headers.get(WEBHOOK_KEY);
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (signature.length !== expected.length) return false;

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}
