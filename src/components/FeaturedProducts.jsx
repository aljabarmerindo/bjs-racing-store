// src/components/FeaturedProducts.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseBrowserClient.ts";
import ProductCard from "./ProductCard.jsx";

const TABS = [
  { id: "terlaris", label: "Terlaris", sort: "total_penjualan", ascending: false },
  { id: "diskon", label: "Diskon", sort: null },
];

const LIMIT = 8;

const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
    <div className="aspect-square bg-slate-200 animate-pulse" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4" />
      <div className="h-3 bg-slate-200 animate-pulse rounded w-1/2" />
      <div className="h-5 bg-slate-200 animate-pulse rounded w-1/3" />
    </div>
  </div>
);

const FeaturedProducts = () => {
  const [activeTab, setActiveTab] = useState("terlaris");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async (tabId) => {
    setLoading(true);
    try {
      let query;

      if (tabId === "diskon") {
        query = supabase
          .from("products_with_revenue")
          .select("*")
          .eq("status", "Aktif")
          .gt("harga_coret", 0)
          .gt("stok", 0)
          .gt("harga_jual", 0)
          .order("harga_jual", { ascending: true })
          .limit(500);
      } else {
        const tab = TABS.find((t) => t.id === tabId);
        query = supabase
          .from("products_with_revenue")
          .select("*")
          .gt("stok", 0)
          .order(tab.sort, { ascending: tab.ascending })
          .limit(LIMIT);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching featured products:", error);
        setProducts([]);
      } else {
        let result = data || [];
        if (tabId === "diskon") {
          result = result
            .map((p) => ({
              ...p,
              diskonPct:
                p.harga_coret > p.harga_jual
                  ? Math.round(
                      ((p.harga_coret - p.harga_jual) / p.harga_coret) * 100,
                    )
                  : 0,
            }))
            .filter((p) => p.diskonPct > 0)
            .sort(
              (a, b) =>
                b.diskonPct - a.diskonPct ||
                (b.total_penjualan || 0) - (a.total_penjualan || 0),
            )
            .slice(0, LIMIT);
        }
        setProducts(result);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(activeTab);
  }, [activeTab, fetchProducts]);

  return (
    <section className="bg-slate-50 py-12 mobile:py-16 tablet:py-20">
      <div className="container mx-auto px-3 mobile:px-4 tablet:px-6">
        <h2 className="text-xl mobile:text-2xl tablet:text-3xl font-bold text-center text-slate-800 mb-6 mobile:mb-8">
          Produk Unggulan
        </h2>

        {/* Tab Filters */}
        <div className="flex justify-center gap-2 mb-8 mobile:mb-10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 mobile:px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                activeTab === tab.id
                  ? "bg-orange-500 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 mobile:grid-cols-3 tablet:grid-cols-4 gap-3 mobile:gap-4 tablet:gap-6">
          {loading
            ? Array.from({ length: LIMIT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>

        {!loading && products.length === 0 && (
          <p className="text-center text-slate-500 py-8">
            Tidak ada produk ditemukan.
          </p>
        )}

        {/* CTA */}
        <div className="text-center mt-8 mobile:mt-10">
          <a
              href="/pilok"
            className="inline-block bg-orange-500 text-white px-6 mobile:px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-orange-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 text-sm mobile:text-base"
          >
            Lihat Semua Produk
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
