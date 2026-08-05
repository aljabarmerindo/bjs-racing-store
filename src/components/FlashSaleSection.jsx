// src/components/FlashSaleSection.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseBrowserClient.ts";
import { nowWIB } from "@/lib/utils.ts";
import { FiZap, FiChevronLeft, FiChevronRight } from "react-icons/fi";

const LIMIT = 6;

const getTimeRemaining = (validUntil) => {
  const now = new Date();
  const end = new Date(validUntil);
  const diff = end - now;
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000)) % 60,
    expired: false,
  };
};

const pad = (n) => String(n).padStart(2, "0");

const formatRupiah = (number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number || 0);

const SkeletonCard = () => (
  <div className="flex-none w-40 mobile:w-44 bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
    <div className="aspect-square bg-slate-200 animate-pulse" />
    <div className="p-2.5 space-y-1.5">
      <div className="h-3 bg-slate-200 animate-pulse rounded w-full" />
      <div className="h-3 bg-slate-200 animate-pulse rounded w-2/3" />
      <div className="h-4 bg-slate-200 animate-pulse rounded w-1/2" />
    </div>
  </div>
);

const FlashSaleSection = () => {
  const [time, setTime] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const fetchFlashSales = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("*, products(id, nama, image_url, harga_jual, status)")
        .eq("is_active", true)
        .eq("products.status", "Aktif")
        .gte("valid_until", nowWIB())
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(LIMIT);

      if (error) {
        console.error("Error fetching flash sales:", error);
        setFlashSales([]);
      } else {
        setFlashSales(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setFlashSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlashSales();
  }, [fetchFlashSales]);

  useEffect(() => {
    if (flashSales.length === 0) return;
    const timer = setInterval(() => {
      const countdownEnd = Math.min(
        ...flashSales.map((f) => new Date(f.valid_until).getTime()),
      );
      const remaining = getTimeRemaining(new Date(countdownEnd).toISOString());
      setTime(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [flashSales]);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 5);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, loading]);

  const scroll = useCallback((direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 180;
    el.scrollBy({
      left: direction === "prev" ? -amount : amount,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, []);

  if (flashSales.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="bg-gradient-to-r from-orange-500 via-orange-400 to-red-400 py-10 mobile:py-14 tablet:py-16 overflow-hidden">
      <div className="container mx-auto px-3 mobile:px-4 tablet:px-6">
        <div className="flex flex-col mobile:flex-row items-center justify-between gap-4 mb-8 mobile:mb-10">
          <div className="flex items-center gap-3">
            <FiZap className="w-6 h-6 mobile:w-7 mobile:h-7 text-yellow-300" fill="currentColor" />
            <h2 className="text-xl mobile:text-2xl tablet:text-3xl font-bold text-white">
              Flash Sale
            </h2>
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs mobile:text-sm font-bold px-3 py-1 rounded-full animate-[fadeOutIn_3s_ease-in-out_infinite]">
              HARI INI SAJA
            </span>
          </div>

          {!time.expired && (
            <div className="flex items-center gap-2">
              {["hours", "minutes", "seconds"].map((unit, i) => (
                <React.Fragment key={unit}>
                  <div className="bg-white rounded-lg px-3 py-2 mobile:px-4 mobile:py-2.5 shadow-lg">
                    <span className="text-xl mobile:text-2xl font-bold text-orange-600 tabular-nums">
                      {pad(time[unit])}
                    </span>
                  </div>
                  {i < 2 && (
                    <span className="text-white text-xl mobile:text-2xl font-bold animate-pulse">
                      :
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => scroll("prev")}
            disabled={!canScrollPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 mobile:w-10 mobile:h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white ${
              canScrollPrev
                ? "hover:bg-white text-slate-700"
                : "opacity-0 pointer-events-none"
            }`}
            aria-label="Sebelumnya"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => scroll("next")}
            disabled={!canScrollNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 mobile:w-10 mobile:h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white ${
              canScrollNext
                ? "hover:bg-white text-slate-700"
                : "opacity-0 pointer-events-none"
            }`}
            aria-label="Berikutnya"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto scroll-smooth scrollbar-hide px-1 py-1"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {loading
              ? Array.from({ length: LIMIT }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              : flashSales.map((flashSale) => {
                  const product = flashSale.products;
                  if (!product) return null;
                  const discountPct = Math.round(
                    ((flashSale.original_price - flashSale.flash_price) /
                      flashSale.original_price) *
                      100,
                  );

                  return (
                    <a
                      key={flashSale.id}
                      href={`/products/${product.id}`}
                      className="flex-none w-40 mobile:w-44 bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      <div className="relative aspect-square bg-white">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.nama}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100" />
                        )}
                        <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          -{discountPct}%
                        </div>
                      </div>
                      <div className="p-2.5">
                        <h3 className="text-xs mobile:text-sm font-semibold text-slate-800 line-clamp-2 mb-1">
                          {product.nama}
                        </h3>
                        <p className="text-[10px] text-slate-400 line-through">
                          {formatRupiah(flashSale.original_price)}
                        </p>
                        <p className="text-sm mobile:text-base font-bold text-orange-500">
                          {formatRupiah(flashSale.flash_price)}
                        </p>
                      </div>
                    </a>
                  );
                })}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes fadeOutIn {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </section>
  );
};

export default FlashSaleSection;
