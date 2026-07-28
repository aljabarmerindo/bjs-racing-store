// File: src/components/CheckoutView.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAppStore } from "../lib/store.ts";
import type { CartItem, Address } from "../lib/store.ts";
import { getOsrmRoute, formatDistance, formatDuration } from "@/lib/osrm";
import { getPaymentFee, type PaymentMethod } from "@/lib/paymentFee";

declare global {
  interface Window {
    snap: any;
  }
}

interface ShippingService {
  name: string;
  code: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
  available?: boolean;
}

// PERBAIKAN 1: Tipe data baru untuk Voucher
interface Voucher {
  id: number;
  code: string;
  description: string;
  type: "fixed_amount" | "percentage" | "free_shipping";
  discount_value: number;
  max_discount?: number;
  min_purchase: number;
  target_label?: string | null;
}

function describeTargetLabel(v: any): string | null {
  if (
    !v ||
    !v.target_type ||
    v.target_type === "all_products" ||
    !v.target_value ||
    v.target_value.length === 0
  )
    return null;
  const labels = v.target_value.join(", ");
  if (v.target_type === "category") return `Khusus kategori: ${labels}`;
  if (v.target_type === "brand") return `Khusus merek: ${labels}`;
  if (v.target_type === "specific_product") return `Khusus produk tertentu`;
  return null;
}

export default function CheckoutView() {
  const {
    items,
    addresses,
    fetchAddresses,
    calculateTotalWeight,
    clearCart,
    addToast,
  } = useAppStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [distanceInfo, setDistanceInfo] = useState<{
    distance: string;
    duration: string;
    fallback: boolean;
  } | null>(null);
  const [isLoadingDistance, setIsLoadingDistance] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [shippingServices, setShippingServices] = useState<ShippingService[]>(
    [],
  );
  const [selectedShipping, setSelectedShipping] = useState<{
    service: string;
    cost: number;
    etd: string;
  } | null>(null);
  const [isLoadingCosts, setIsLoadingCosts] = useState(false);
  const [error, setError] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount_amount: number;
    target_label?: string | null;
  } | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [myVouchers, setMyVouchers] = useState<Voucher[]>([]);

  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState<{
    qr_content: string;
    qr_image_base64: string;
    expires_at?: string;
    order_id: string;
  } | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const shippingCacheRef = useRef<{ key: string; services: any[]; selected: any } | null>(null);
  const [isRateCheckCooldown, setIsRateCheckCooldown] = useState(false);
  const [isRateCheckPermanentlyDisabled, setIsRateCheckPermanentlyDisabled] = useState(false);
  const [rapidClickCount, setRapidClickCount] = useState(0);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "qris" | "dana" | "ovo" | "gopay" | "shopeepay" | "transfer_bank" | "virtual_account" | null
  >(null);

  const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string; description?: string }[] = [
    { value: "qris", label: "QRIS", description: "QRIS / E-Wallet" },
    { value: "dana", label: "DANA", description: "E-Wallet DANA" },
    { value: "ovo", label: "OVO", description: "E-Wallet OVO" },
    { value: "gopay", label: "GoPay", description: "E-Wallet GoPay" },
    { value: "shopeepay", label: "ShopeePay", description: "ShopeePay" },
    { value: "transfer_bank", label: "Transfer Bank", description: "TF Bank" },
    { value: "virtual_account", label: "Virtual Account", description: "VA" },
  ];

  const totalWeight = useMemo(
    () => calculateTotalWeight(),
    [items, calculateTotalWeight],
  );
  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + (item.quantity || 0) * (item.harga_jual || 0),
        0,
      ),
    [items],
  );

  const paymentFee = useMemo(() => {
    if (!selectedPaymentMethod) return 0;
    const feeBase =
      subtotal + (selectedShipping?.cost || 0) - (appliedVoucher?.discount_amount || 0);
    return getPaymentFee(selectedPaymentMethod, feeBase);
  }, [selectedPaymentMethod, subtotal, selectedShipping, appliedVoucher]);

  const finalTotal = useMemo(() => {
    const totalBeforeDiscount =
      subtotal + (selectedShipping?.cost || 0) + (paymentFee || 0);
    return Math.max(
      0,
      totalBeforeDiscount - (appliedVoucher?.discount_amount || 0),
    );
  }, [subtotal, selectedShipping, paymentFee, appliedVoucher]);

  const formatRupiah = (number: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number || 0);

  const formatServiceName = (service: string, code?: string) => {
    const s = String(service || "").trim();
    if (code === "pos") return `POS Indonesia: ${s}`;
    if (code === "jne") return `JNE: ${s}`;
    if (code === "jnt") return `J&T: ${s}`;
    if (code === "jnt-cargo") return `J&T Cargo: ${s}`;
    return s;
  };

  const formatEtd = (etd?: string) => {
    if (!etd) return "";
    return String(etd).replace(/\bday\b/g, "hari");
  };

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  useEffect(() => {
    const selectedAddress = addresses.find(
      (addr) => addr.id === selectedAddressId,
    );
    const originLat = Number(import.meta.env.BITESHIP_ORIGIN_LAT || -6.5244682);
    const originLng = Number(import.meta.env.BITESHIP_ORIGIN_LNG || 110.7674915);
    const destLat =
      typeof selectedAddress?.latitude === "number" &&
      Number.isFinite(selectedAddress.latitude as any)
        ? (selectedAddress.latitude as number)
        : null;
    const destLng =
      typeof selectedAddress?.longitude === "number" &&
      Number.isFinite(selectedAddress.longitude as any)
        ? (selectedAddress.longitude as number)
        : null;

    if (!destLat || !destLng) {
      setDistanceInfo(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDistance(true);
    getOsrmRoute([originLng, originLat], [destLng, destLat]).then((route) => {
      if (cancelled) return;
      setDistanceInfo({
        distance: formatDistance(route.distanceMeters),
        duration: formatDuration(route.durationSeconds),
        fallback: route.fallback,
      });
      setIsLoadingDistance(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedAddressId, addresses]);

  const fetchMyVouchers = useCallback(async () => {
    try {
      const response = await fetch("/api/vouchers/my-vouchers");
      const data = await response.json();
      if (response.ok) {
        const validVouchers = data
          .map((item: any) => item.vouchers)
          .filter(Boolean);
        setMyVouchers(validVouchers);
      }
    } catch (err) {
      console.error("Gagal memuat voucher saya:", err);
    }
  }, []);

  useEffect(() => {
    fetchMyVouchers();
  }, [fetchMyVouchers, subtotal, selectedShipping]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const primaryAddress =
        addresses.find((addr: Address) => addr.is_primary) || addresses[0];
      if (primaryAddress) setSelectedAddressId(primaryAddress.id);
    }
  }, [addresses, selectedAddressId]);

  const fetchShippingCosts = useCallback(async () => {
    const cacheKey = `${selectedAddressId}-${totalWeight}`;
    const cached = shippingCacheRef.current;
    if (cached && cached.key === cacheKey) {
      setShippingServices(cached.services);
      setSelectedShipping(cached.selected);
      return;
    }

    setShippingServices([]);
    setSelectedShipping(null);
    setError("");
    if (!selectedAddressId) return;
    if (totalWeight === 0) {
      setError("Berat produk belum tersedia. Silakan hubungi customer service.");
      return;
    }
    const selectedAddress = addresses.find(
      (addr: Address) => addr.id === selectedAddressId,
    );
    if (!selectedAddress) return;

    setIsLoadingCosts(true);
    try {
      const services: any[] = [];

      const checkInternalResponse = await fetch(
        `/api/shipping/check-local-availability?destination_id=${selectedAddress.destination}`,
      );
      const checkInternalResult = await checkInternalResponse.json();

      if (checkInternalResult.available) {
        services.push({
          service: checkInternalResult.service,
          code: checkInternalResult.code,
          name: checkInternalResult.name,
          cost: checkInternalResult.cost,
          etd: checkInternalResult.etd,
          description: checkInternalResult.description,
        });
      }

      const hasCoordinates =
        !!selectedAddress.latitude && !!selectedAddress.longitude;
      const hasPostalCode = !!selectedAddress.postal_code;

      if (!hasCoordinates && !hasPostalCode) {
        setError(
          "Alamat belum lengkap untuk pengiriman. Tambahkan koordinat atau kode pos di buku alamat.",
        );
        setShippingServices([]);
        setSelectedShipping(null);
        setIsLoadingCosts(false);
        return;
      }

      const couriers: string[] = [];
      if (hasCoordinates) couriers.push("gojek");
      if (hasPostalCode) couriers.push("pos", "jne", "jnt", "jnt-cargo");

      const biteshipResponse = await fetch(
        "/api/shipping/biteship/rates",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: {
              latitude: selectedAddress.latitude ? Number(selectedAddress.latitude) : undefined,
              longitude: selectedAddress.longitude ? Number(selectedAddress.longitude) : undefined,
              postal_code: selectedAddress.postal_code || undefined,
            },
            weight: totalWeight,
            couriers: couriers.join(","),
            value: subtotal,
          }),
        },
      );

      const biteshipResult = await biteshipResponse.json();
      if (biteshipResponse.ok && Array.isArray(biteshipResult)) {
        const mapped = biteshipResult.map((o: any) => ({
          service: o.courier_service_name || o.service,
          code: o.courier_code || o.company || o.code,
          name: o.courier_name || o.name,
          cost: o.price || o.cost,
          etd: o.duration || o.etd,
          description: o.description || "",
        }));
        services.push(...mapped);
      }

      if (services.length === 0) {
        throw new Error("Tidak ada layanan pengiriman tersedia.");
      }

      services.sort((a, b) => {
        const parseEtd = (etd?: string) => {
          if (!etd) return Number.POSITIVE_INFINITY;
          const match = etd.match(/(\d+)/);
          return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
        };
        const aEtd = parseEtd(a.etd);
        const bEtd = parseEtd(b.etd);
        if (aEtd !== bEtd) return aEtd - bEtd;
        return (a.cost || 0) - (b.cost || 0);
      });

      setShippingServices(services);
      setSelectedShipping({
        service: services[0].service,
        cost: services[0].cost,
        etd: services[0].etd,
      });
      shippingCacheRef.current = { key: cacheKey, services, selected: services[0] };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setShippingServices([]);
    } finally {
      setIsLoadingCosts(false);
    }
  }, [
    selectedAddressId,
    totalWeight,
    addresses,
  ]);

  useEffect(() => {
    fetchShippingCosts();
  }, [fetchShippingCosts]);

  const handleApplyVoucher = async (codeToApply: string) => {
    if (!codeToApply) return;
    setIsApplyingVoucher(true);
    setVoucherError("");
    setAppliedVoucher(null);
    try {
      const response = await fetch("/api/vouchers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voucher_code: codeToApply,
          cart_subtotal: subtotal,
          shipping_cost: selectedShipping?.cost || 0,
          cart_items: items.map((item: CartItem) => ({
            product_id: item.product_id,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Voucher tidak valid.");
      setAppliedVoucher({
        code: result.voucher_details.code,
        discount_amount: result.discount_amount,
        target_label: result.voucher_details.target_label ?? null,
      });
      addToast({
        type: "success",
        message: `Voucher ${result.voucher_details.code} berhasil diterapkan!`,
      });
    } catch (err) {
      setVoucherError((err as Error).message);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const pollOrderStatus = (orderId: string) => {
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?order_id=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "paid") {
            clearInterval(interval);
            setIsPolling(false);
            clearCart();
            window.location.href = `/akun/pesanan/${orderId}?status=success`;
          }
        }
      } catch {
        // abaikan, coba lagi di interval berikutnya
      }
    }, 3000);
    setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
    }, 1000 * 60 * 10);
  };

  const handlePayment = async () => {
    if (!selectedAddressId || !selectedShipping) {
      addToast({
        type: "info",
        message: "Silakan lengkapi alamat dan metode pengiriman.",
      });
      return;
    }
    if (!selectedPaymentMethod) {
      addToast({
        type: "info",
        message: "Silakan pilih metode pembayaran.",
      });
      return;
    }
    setIsProcessingPayment(true);
    const selectedService = shippingServices.find(
      (s: any) => s.service === selectedShipping.service,
    );
    const courierDetails = selectedService || null;
    const payload = {
      address_id: selectedAddressId,
      shipping_cost: selectedShipping.cost,
      payment_method: selectedPaymentMethod,
      voucher_code: appliedVoucher?.code || null,
      discount_amount: appliedVoucher?.discount_amount || 0,
      courier: {
        code: courierDetails?.code,
        name: courierDetails?.name,
        service: selectedShipping.service,
        etd: selectedShipping.etd,
      },
      cart_items: items.map((item: CartItem) => ({
        product_id: item.product_id,
        price: item.harga_jual,
        quantity: item.quantity,
        name: item.nama,
        sku: item.sku,
        image_url: item.image_url,
      })),
    };
    try {
      const response = await fetch("/api/payment/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          addToast({ type: "error", message: result.message });
          useAppStore.getState().fetchCart();
          window.location.href = "/cart";
        } else {
          throw new Error(result.message || "Gagal membuat transaksi.");
        }
        return;
      }

      const biteshipCodes = new Set(["gojek", "pos", "jne", "jnt", "jnt-cargo"]);
      const isBiteshipCourier =
        courierDetails?.code && biteshipCodes.has(String(courierDetails.code).toLowerCase());

      if (isBiteshipCourier && result.order_id) {
        void (async () => {
          try {
            await fetch("/api/shipping/biteship/book", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order_id: result.order_id,
                courier_company: courierDetails?.name || "biteship",
                courier_service_code: courierDetails?.code || "",
              }),
            });
          } catch (bookingError) {
            console.error("Gagal booking Biteship:", bookingError);
            addToast({
              type: "warning",
              message: "Pesanan dibuat, tetapi booking pengiriman gagal. Admin akan memprosesnya.",
            });
          }
        })();
      }

      if (result.qr_content) {
        setQrData({
          qr_content: result.qr_content,
          qr_image_base64: result.qr_image_base64,
          expires_at: result.expires_at,
          order_id: result.order_id,
        });
        setShowQr(true);
        setIsProcessingPayment(false);
        pollOrderStatus(result.order_id);
        return;
      }
      const { snap_token, order_id } = result;
      const isGojek = courierDetails?.code === "gojek";
      window.snap.pay(snap_token, {
        onSuccess: async function (_result: any) {
          clearCart();
          if (isGojek && order_id) {
            void fetch("/api/shipping/biteship/auto-book-gojek", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: order_id }),
            }).catch((err) =>
              console.error("Auto-booking GOJEK gagal:", err),
            );
          }
          window.location.href = `/akun/pesanan/${order_id}?status=success`;
        },
        onPending: function (_result: any) {
          clearCart();
          window.location.href = `/akun/pesanan/${order_id}?status=pending`;
        },
        onError: function (_result: any) {
          addToast({
            type: "error",
            message: "Pembayaran Gagal. Silakan coba lagi.",
          });
          setIsProcessingPayment(false);
        },
        onClose: function () {
          addToast({
            type: "warning",
            message: "Pembayaran dibatalkan. Anda bisa mencoba lagi dengan klik tombol Lanjut ke Pembayaran.",
          });
          setIsProcessingPayment(false);
        },
      });
    } catch (err) {
      addToast({ type: "error", message: (err as Error).message });
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Kolom Kiri: Alamat, Pengiriman, dan Voucher */}
      <div className="lg:col-span-2 space-y-6">
        {/* --- Blok Alamat Pengiriman (Tidak Berubah) --- */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4">Alamat Pengiriman</h2>
          <div className="space-y-3">
            {addresses.length > 0 ? (
              addresses.map((address) => (
                <label
                  key={address.id}
                  className="flex items-start p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500"
                >
                  <input
                    type="radio"
                    name="shippingAddress"
                    value={address.id}
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                    className="mt-1 flex-shrink-0"
                  />
                  <div className="ml-4 text-sm">
                    <p className="font-semibold">
                      {address.recipient_name} ({address.label})
                    </p>
                    <p className="text-gray-600">{address.recipient_phone}</p>
                    <p className="text-gray-600">{address.full_address}</p>
                    <p className="text-gray-500">{address.destination_text}</p>
                  </div>
                </label>
              ))
            ) : (
              <p className="text-sm text-gray-500">Memuat alamat...</p>
            )}
            <a
              href="/akun/alamat"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              + Kelola Alamat
            </a>
          </div>
        </div>

         {/* --- Blok Metode Pengiriman (Tidak Berubah) --- */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Metode Pengiriman</h2>
               <button
                 type="button"
                 onClick={() => {
                   const storageKey = "rate_check_clicks";
                   const clicks = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
                   
                   if (isRateCheckPermanentlyDisabled) {
                     return;
                   }
                   
                   const now = Date.now();
                   clicks.push(now);
                   sessionStorage.setItem(storageKey, JSON.stringify(clicks));
                   setRapidClickCount(clicks.length);
                   
                   const recentClicks = clicks.filter((t: number) => now - t < 30000);
                   if (recentClicks.length >= 3) {
                     setIsRateCheckPermanentlyDisabled(true);
                     setIsRateCheckCooldown(true);
                     return;
                   }
                   
                    shippingCacheRef.current = null;
                    setIsRateCheckCooldown(true);
                   setTimeout(() => setIsRateCheckCooldown(false), 120000);
                 }}
                 className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                 disabled={isLoadingCosts || isRateCheckCooldown || isRateCheckPermanentlyDisabled}
               >
                 {isRateCheckPermanentlyDisabled
                   ? "Cek Tarif Diperlukan Menunggu"
                   : isLoadingCosts
                   ? "Memuat..."
                   : "Cek Ulang Tarif"}
               </button>
            </div>
            {isLoadingCosts && (
             <p className="text-sm text-gray-500 mt-4 animate-pulse">
               Menghitung ongkos kirim...
             </p>
           )}
           {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
           {shippingServices.length > 0 && (
             <div className="mt-4 space-y-2">
               <p className="text-sm font-medium">Pilih Layanan Pengiriman:</p>
              {shippingServices.map((service) => (
                <label
                  key={service.service}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500"
                >
                  <input
                    type="radio"
                    name="shippingService"
                    onChange={() => {
                      setSelectedCourier(service.code);
                      setSelectedShipping({
                        service: service.service,
                        cost: service.cost,
                        etd: service.etd,
                      });
                    }}
                    className="flex-shrink-0"
                  />
                    <div className="ml-3 flex-grow flex justify-between w-full text-sm flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          {service.code === "internal" && (
                            <img
                              src="/icons/bjs-express.png"
                              alt="BJS Express"
                              className="h-8 w-auto object-contain"
                            />
                          )}
                          {service.code === "gojek" && (
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                              GOJEK
                            </span>
                          )}
                          {service.code === "pos" && (
                            <img
                              src="/icons/pos-indonesia.png"
                              alt="POS Indonesia"
                              className="h-8 w-auto object-contain"
                            />
                          )}
                           {service.code === "jne" && (
                            <img
                              src="/icons/jne.png"
                              alt="JNE Express"
                              className="h-8 w-auto object-contain"
                            />
                          )}
                          {service.code === "jnt" && (
                            <img
                              src="/icons/j&t.png"
                              alt="J&T Express"
                              className="h-8 w-auto object-contain"
                            />
                          )}
                          {service.code === "jnt-cargo" && (
                            <img
                              src="/icons/j&tcargo.png"
                              alt="J&T Cargo"
                              className="h-8 w-auto object-contain"
                            />
                          )}
                            <div>
                            <p className="font-semibold">
                              {formatServiceName(service.service, service.code)}
                            </p>
                             {formatEtd(service.etd) && (
                               <p className="text-blue-600">
                                 Estimasi {formatEtd(service.etd)}
                               </p>
                             )}
                          </div>
                      </div>
                      <p className="font-bold whitespace-nowrap text-orange-600">
                        {formatRupiah(service.cost)}
                      </p>
                   </div>
                </label>
              ))}
            </div>
          )}
         </div>

        {/* --- BLOK METODE PEMBAYARAN --- */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4">Metode Pembayaran</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_METHOD_OPTIONS.map((method) => {
              const fee = getPaymentFee(
                method.value,
                subtotal + (selectedShipping?.cost || 0) - (appliedVoucher?.discount_amount || 0),
              );
              const checked = selectedPaymentMethod === method.value;
              return (
                <label
                  key={method.value}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${checked ? "bg-blue-50 border-blue-500" : "border-gray-200"}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={checked}
                      onChange={() => setSelectedPaymentMethod(method.value)}
                      className="flex-shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-sm">{method.label}</p>
                      <p className="text-xs text-gray-500">{method.description}</p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-600">
                    {fee > 0 ? `Biaya: ${formatRupiah(fee)}` : "Gratis"}
                  </p>
                </label>
              );
            })}
          </div>
        </div>

          {/* --- BLOK VOUCHER BARU --- */}
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Voucher & Diskon</h2>
           <div className="flex gap-2 items-start">
             <div className="flex-grow">
               <input
                 type="text"
                 placeholder="Masukkan Kode Voucher"
                 value={voucherCode}
                 onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                 className="w-full p-3 border rounded-md bg-gray-50 text-sm"
               />
               {voucherError && (
                 <p className="text-xs text-red-500 mt-1">{voucherError}</p>
               )}
               {appliedVoucher && (
                 <p className="text-xs text-green-600 mt-1">
                   Kode {appliedVoucher.code} diterapkan.
                   {appliedVoucher.target_label
                     ? ` (${appliedVoucher.target_label})`
                     : ""}
                 </p>
               )}
             </div>
             <button
               onClick={() => handleApplyVoucher(voucherCode)}
               disabled={isApplyingVoucher || !voucherCode}
               className="px-4 py-3 bg-orange-500 text-white font-semibold rounded-md text-sm disabled:bg-gray-400"
             >
               {isApplyingVoucher ? "..." : "Terapkan"}
             </button>
           </div>
           {myVouchers.length > 0 && (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Voucher Saya:</p>
          <button
            type="button"
            onClick={fetchMyVouchers}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Muat ulang
          </button>
        </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {myVouchers.map((voucher) => {
                   const isEligible = subtotal >= (voucher.min_purchase || 0);
                   const statusLabel = isEligible ? "Dapat Digunakan" : `Min. belanja ${formatRupiah(voucher.min_purchase || 0)}`;
                   const statusColor = isEligible ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700";
                   return (
                     <button
                       key={voucher.id}
                       type="button"
                       disabled={!isEligible}
                        onClick={() => handleApplyVoucher(voucher.code)}
                       className={`text-left border rounded-lg p-3 transition-colors ${
                         isEligible
                           ? "border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                           : "border-gray-200 bg-gray-50 opacity-75 cursor-not-allowed"
                       }`}
                     >
                       <div className="flex items-center justify-between gap-2">
                         <p className="font-bold text-orange-600 text-sm">{voucher.code}</p>
                         <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                           {statusLabel}
                         </span>
                       </div>
                       <p className="text-xs text-slate-600 mt-1">{voucher.description}</p>
                       {describeTargetLabel(voucher) && (
                         <p className="text-[11px] text-blue-600 mt-1">
                           {describeTargetLabel(voucher)}
                         </p>
                       )}
                     </button>
                   );
                 })}
               </div>
             </div>
           )}
         </div>
      </div>

      {/* Kolom Kanan: Ringkasan Pesanan */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl shadow-md sticky top-8">
          <h2 className="text-xl font-bold mb-4">Ringkasan Pesanan</h2>
          <div className="space-y-2 text-sm border-b pb-4 max-h-60 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center gap-2"
              >
                <p className="text-gray-600 truncate w-4/6">
                  {item.nama}{" "}
                  <span className="text-gray-400">x{item.quantity}</span>
                </p>
                <p className="font-medium text-right whitespace-nowrap">
                  {formatRupiah((item.quantity || 0) * (item.harga_jual || 0))}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm pt-4">
            <div className="flex justify-between">
              <p className="text-gray-600">Subtotal</p>
              <p className="font-medium">{formatRupiah(subtotal)}</p>
            </div>
            <div className="flex justify-between">
              <p className="text-gray-600">Ongkos Kirim</p>
              <p className="font-medium">
                {selectedShipping ? formatRupiah(selectedShipping.cost) : "-"}
              </p>
            </div>
            {distanceInfo && (
              <div className="flex justify-between text-xs text-slate-500">
                <p>Estimasi Jarak</p>
                <p className="font-medium">
                  {distanceInfo.distance} • {distanceInfo.duration}
                  {distanceInfo.fallback ? (
                    <span className="text-orange-600 ml-1">(garis lurus)</span>
                  ) : null}
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <p className="text-gray-600">Biaya Layanan Transaksi</p>
              <p className="font-medium">
                {selectedPaymentMethod ? formatRupiah(paymentFee) : "Pilih metode pembayaran"}
              </p>
            </div>
            {/* --- BARIS DISKON BARU --- */}
            {appliedVoucher && (
              <div className="flex justify-between text-green-600">
                <p>Diskon ({appliedVoucher.code})</p>
                <p className="font-medium">
                  - {formatRupiah(appliedVoucher.discount_amount)}
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-between text-lg font-bold pt-4 mt-4 border-t">
            <p>Total</p>
            <p>{formatRupiah(finalTotal)}</p>
          </div>
          <button
            onClick={handlePayment}
            disabled={
              !selectedShipping || !selectedPaymentMethod || items.length === 0 || isProcessingPayment
            }
            className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isProcessingPayment ? "Memproses..." : "Lanjut ke Pembayaran"}
          </button>
        </div>
      </div>

      {/* --- MODAL QRIS BRI --- */}
      {showQr && qrData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold mb-2">Scan QRIS untuk Bayar</h3>
            <p className="text-sm text-gray-500 mb-4">
              Gunakan aplikasi e-wallet / m-banking (GoPay, OVO, DANA,
              m-Banking BRI, dll). Halaman akan otomatis lanjut setelah dibayar.
            </p>
            {qrData.qr_image_base64 ? (
              <img
                src={`data:image/png;base64,${qrData.qr_image_base64}`}
                alt="QRIS"
                className="mx-auto w-56 h-56"
              />
            ) : (
              <div className="mx-auto w-56 h-56 flex items-center justify-center border rounded bg-gray-50 text-xs break-all p-2">
                {qrData.qr_content}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4">
              {isPolling ? "Menunggu konfirmasi pembayaran..." : ""}
            </p>
            <button
              onClick={() => setShowQr(false)}
              className="mt-4 text-sm text-gray-500 hover:underline"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
