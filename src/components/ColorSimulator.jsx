// src/components/ColorSimulator.jsx (Final dengan Palet Warna Unik)

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseBrowserClient.ts";
import { useAppStore } from "../lib/store";
import { FiShoppingCart } from "react-icons/fi";

// --- TAMBAHKAN FUNGSI BARU DI SINI ---
const hexToHsl = (hex) => {
  if (!hex) return [0, 0, 0];
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
};

const ColorSimulator = ({ initialProductId }) => {
  const [objects, setObjects] = useState([]);
  const [allColorProducts, setAllColorProducts] = useState([]);
  const [simulationVariants, setSimulationVariants] = useState([]);
  const [productLines, setProductLines] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedObjectModel, setSelectedObjectModel] = useState(null);
  const [selectedColorProduct, setSelectedColorProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [simulationImageUrl, setSimulationImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart, addToast } = useAppStore();

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        supabase.from("simulation_objects").select("*").order("name"),
        supabase
          .from("products")
          .select("*, suppliers(nama_supplier)")
          .eq("kategori", "Pilok")
          .eq("status", "Aktif")
          .order("merek"),
        supabase.from("simulation_variants").select("*"),
        supabase.from("product_lines").select("*"),
      ]);

      setObjects(results[0].status === "fulfilled" ? results[0].value.data || [] : []);
      setAllColorProducts(results[1].status === "fulfilled" ? results[1].value.data || [] : []);
      setSimulationVariants(results[2].status === "fulfilled" ? results[2].value.data || [] : []);
      setProductLines(results[3].status === "fulfilled" ? results[3].value.data || [] : []);

      if (results.some((r) => r.status === "rejected")) {
        console.error("Gagal memuat data simulator:", results);
      }

      setLoading(false);
    };
    fetchInitialData();
  }, []);

  // 2. Atur state awal setelah semua data siap
  useEffect(() => {
    if (loading) return; // Jangan lakukan apa-apa jika data belum siap

    if (!selectedObjectModel && objects.length > 0) {
      setSelectedObjectModel(objects[0]);
    }

    // Hanya atur produk awal jika belum pernah diatur
    if (!selectedColorProduct) {
      const product =
        allColorProducts.find((p) => p.id === initialProductId) ||
        allColorProducts[0];
      if (product) {
        setSelectedColorProduct(product);
        setSelectedBrand(product.merek);
        setSelectedVariant(product.color_variant);
        setSelectedSize(product.ukuran);
      }
    }
  }, [loading, initialProductId, allColorProducts, objects]);

  // 3. LOGIKA UTAMA: Tentukan URL gambar yang akan ditampilkan.
  //    useEffect ini akan berjalan setiap kali objek atau warna berubah.
  useEffect(() => {
    if (!selectedObjectModel || !selectedColorProduct) return;

    // Cari di dalam data varian yang cocok dengan pilihan saat ini
    const match = simulationVariants.find(
      (v) =>
        v.product_id === selectedColorProduct.id &&
        v.simulation_object_id === selectedObjectModel.id,
    );

    // Jika ada yang cocok, gunakan URL-nya. Jika tidak, gunakan gambar dasar objek.
    setSimulationImageUrl(
      match ? match.colored_image_url : selectedObjectModel.base_image_url,
    );
  }, [selectedObjectModel, selectedColorProduct, simulationVariants]);

  const brands = useMemo(
    () => [...new Set(allColorProducts.map((p) => p.merek).filter(Boolean))],
    [allColorProducts],
  );
  const productLinesByBrand = useMemo(() => {
    if (!selectedBrand) return [];
    return productLines.filter((line) => line.brand_name === selectedBrand);
  }, [productLines, selectedBrand]);

  const variantsByLine = useMemo(() => {
    if (!selectedBrand || !selectedLine) return [];
    return [
      ...new Set(
        allColorProducts
          .filter(
            (p) =>
              p.merek === selectedBrand &&
              p.lini_produk === selectedLine &&
              p.color_variant,
          )
          .map((p) => p.color_variant),
      ),
    ];
  }, [allColorProducts, selectedBrand, selectedLine]);

  // --- PERBAIKAN LOGIKA PALET WARNA DI SINI ---
  const colorPalette = useMemo(() => {
    if (!selectedBrand || !selectedLine || !selectedVariant) return [];
    const filteredProducts = allColorProducts.filter(
      (p) =>
        p.merek === selectedBrand &&
        p.lini_produk === selectedLine &&
        p.color_variant === selectedVariant &&
        p.color_swatch_url &&
        p.status === "Aktif",
    );

    const uniqueColors = new Map();
    filteredProducts.forEach((p) => {
      const existing = uniqueColors.get(p.nama);
      const isInVariants = simulationVariants.some(
        (sv) => sv.product_id === p.id,
      );
      if (!existing || isInVariants) {
        uniqueColors.set(p.nama, p);
      }
    });

    // --- PERBAIKAN PENGURUTAN DI SINI ---
    const sortedColors = Array.from(uniqueColors.values()).sort((a, b) => {
      const [h1, s1, l1] = hexToHsl(a.color_hex);
      const [h2, s2, l2] = hexToHsl(b.color_hex);
      // Urutkan berdasarkan Hue, lalu Lightness, lalu Saturation
      if (h1 !== h2) return h1 - h2;
      if (l1 !== l2) return l1 - l2;
      return s1 - s2;
    });

    return sortedColors;
  }, [
    allColorProducts,
    selectedBrand,
    selectedLine,
    selectedVariant,
    simulationVariants,
  ]);

  const objectModels = useMemo(
    () => [...new Set(objects.map((o) => o.model).filter(Boolean))],
    [objects],
  );

  const availableSizes = useMemo(() => {
    if (!selectedColorProduct) return [];

    // 1. Cari semua varian produk berdasarkan NAMA, MEREK, dan LINI PRODUK yang sama
    const productVariants = allColorProducts.filter(
      (p) =>
        p.nama === selectedColorProduct.nama &&
        p.merek === selectedColorProduct.merek &&
        p.lini_produk === selectedColorProduct.lini_produk,
    );

    // 2. Dari situ, ambil hanya yang statusnya 'Aktif' dan stoknya > 0
    const inStockVariants = productVariants.filter(
      (p) => p.stok > 0 && p.status === "Aktif",
    );

    // 3. Buat daftar ukuran unik beserta stoknya
    const uniqueSizes = new Map();
    inStockVariants.forEach((p) => {
      if (!uniqueSizes.has(p.ukuran)) {
        uniqueSizes.set(p.ukuran, { size: p.ukuran, stock: p.stok });
      }
    });

    return Array.from(uniqueSizes.values());
  }, [allColorProducts, selectedColorProduct]);

  // Lalu, ganti seluruh fungsi handleAddToCart yang lama dengan fungsi lengkap di bawah ini:
  const handleAddToCart = async () => {
    // Validasi dasar: pastikan warna dan ukuran sudah dipilih
    if (!selectedColorProduct || !selectedSize) {
      addToast({
        type: "info",
        message: "Silakan pilih warna dan ukuran terlebih dahulu.",
      });
      return;
    }

    // Cari produk yang tepat untuk ditambahkan berdasarkan pilihan
    const productToAdd = allColorProducts.find(
      (p) =>
        p.nama === selectedColorProduct.nama &&
        p.merek === selectedColorProduct.merek &&
        p.lini_produk === selectedColorProduct.lini_produk &&
        p.ukuran === selectedSize &&
        p.status === "Aktif",
    );

    if (!productToAdd) {
      addToast({
        type: "error",
        message: "Produk dengan ukuran yang dipilih tidak ditemukan.",
      });
      return;
    }

    try {
      // Panggil fungsi addToCart dari store yang sudah memiliki validasi internal
      await addToCart(productToAdd, 1);
    } catch (error) {
      // Tangkap dan tangani error spesifik yang dikirim oleh store
      if (error.message === "NOT_AUTHENTICATED") {
        addToast({
          type: "info",
          message: "Silakan login terlebih dahulu untuk berbelanja.",
        });
        window.location.href = "/login";
      } else if (error.message === "CUSTOMER_PROFILE_MISSING") {
        addToast({
          type: "warning",
          message: "Profil Anda belum lengkap. Mohon lengkapi data diri.",
        });
        window.location.href = "/akun/lengkapi-profil";
      } else {
        addToast({
          type: "error",
          message: "Terjadi kesalahan. Silakan coba lagi.",
        });
        console.error("Add to cart error:", error);
      }
    }
  };

  if (loading)
    return (
      <div className="text-center py-20">Menyiapkan Virtual Garage...</div>
    );

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Kolom Kiri */}
      <div className="w-full lg:w-1/4 bg-white p-4 rounded-xl shadow-lg h-fit">
        <h3 className="text-lg font-bold mb-4">Filter Warna</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Merek Cat
            </label>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => {
                    setSelectedBrand(brand);
                    setSelectedLine(null);
                    setSelectedVariant(null);
                    setSelectedColorProduct(null);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border-2 ${selectedBrand === brand ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-400"}`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
          {selectedBrand && productLinesByBrand.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Lini Produk
              </label>
              <div className="grid grid-cols-2 gap-2">
                {productLinesByBrand.map((line) => (
                  <button
                    key={line.id}
                    onClick={() => {
                      setSelectedLine(line.line_name);
                      setSelectedVariant(null);
                    }}
                    className={`text-center p-2 border-2 rounded-lg ${selectedLine === line.line_name ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-400"}`}
                  >
                    <img
                      src={line.image_url}
                      alt={line.line_name}
                      className="h-24 mx-auto object-contain mb-2"
                    />
                    <p className="text-xs font-semibold">{line.line_name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedLine && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Varian Warna
              </label>
              <select
                onChange={(e) => setSelectedVariant(e.target.value)}
                value={selectedVariant || ""}
                className="w-full p-2 border rounded-lg bg-slate-50 text-sm"
              >
                <option value="">-- Pilih Varian --</option>
                {variantsByLine.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Kolom Tengah */}
      <div className="w-full lg:w-1/2 space-y-6">
        <div className="aspect-video bg-white rounded-xl shadow-lg flex items-center justify-center p-4">
          <img
            src={simulationImageUrl || selectedObjectModel?.base_image_url}
            alt="Tampilan Simulasi"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Pilih Objek Dasar
          </label>
          <div className="flex flex-wrap gap-2">
            {objectModels.map((modelName) => (
              <button
                key={modelName}
                onClick={() => {
                  setSelectedObjectModel(
                    objects.find((o) => o.model === modelName),
                  );
                }}
                className={`px-4 py-2 text-sm font-semibold rounded-lg ${selectedObjectModel?.model === modelName ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
              >
                {modelName}
              </button>
            ))}
          </div>
        </div>
        {selectedVariant && (
          <div className="bg-white p-4 rounded-xl shadow-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pilih Warna Lain ({selectedVariant})
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {colorPalette.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedColorProduct(product)}
                  className={`w-14 h-14 rounded-full border-2 transition-all flex-shrink-0 ${selectedColorProduct?.id === product.id ? "border-orange-500 scale-110 ring-2 ring-orange-200" : "border-white hover:border-slate-300"}`}
                  title={product.nama}
                >
                  <img
                    src={product.color_swatch_url}
                    alt={product.nama}
                    className="w-full h-full object-cover rounded-full"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Kolom Kanan */}
      <div className="w-full lg:w-1/4">
        {selectedColorProduct && (
          <div className="bg-white p-6 rounded-xl shadow-lg h-full flex flex-col">
            <div className="flex-grow">
              <p className="text-sm font-medium text-slate-500">
                {selectedColorProduct.merek} -{" "}
                {selectedColorProduct.lini_produk}
              </p>
              <h3 className="text-2xl font-bold mt-1">
                {selectedColorProduct.nama}{" "}
                <span className="font-mono text-lg text-slate-400">
                  {selectedColorProduct.sku || selectedColorProduct.kode}
                </span>
              </h3>

              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pilih Ukuran (Stok Tersedia)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {availableSizes.length > 0 ? (
                    availableSizes.map((item) => (
                      <button
                        key={item.size}
                        onClick={() => setSelectedSize(item.size)}
                        // Tombol akan disabled jika stok 0
                        disabled={item.stock === 0}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-lg border-2 
                            ${
                              selectedSize === item.size
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-600 border-slate-200"
                            }
                            ${
                              item.stock === 0
                                ? "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed"
                                : "hover:border-slate-400"
                            }`}
                      >
                        {/* Tampilkan ukuran dan stok */}
                        <div>{item.size}</div>
                        <div
                          className={`text-xs font-normal opacity-75 ${item.stock === 0 ? "" : "mt-1"}`}
                        >
                          {item.stock > 0 ? `Stok: ${item.stock}` : "Habis"}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-red-500">
                      Stok habis untuk warna ini.
                    </p>
                  )}
                </div>
              </div>

              {selectedColorProduct.specifications && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-2">Spesifikasi:</h4>
                  <dl className="space-y-2 text-sm">
                    {Object.entries(selectedColorProduct.specifications).map(
                      ([key, value]) => (
                        <div key={key}>
                          <dt className="font-medium text-slate-500">{key}</dt>
                          <dd className="text-slate-800">{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={handleAddToCart}
                disabled={availableSizes.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                <FiShoppingCart />
                <span>Tambah ke Keranjang</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorSimulator;
