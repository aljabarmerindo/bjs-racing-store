// src/components/ProductDetailView.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store.ts";
import { supabase } from "@/lib/supabaseBrowserClient.ts";
import { FiShoppingCart, FiStar, FiEye, FiPlus, FiMinus } from "react-icons/fi";
import ProductInfoTabs from "./ProductInfoTabs.jsx";
import WishlistButton from "./WishlistButton.jsx";
import RelatedProducts from "./RelatedProducts.jsx";
import OptimizedImage from "./OptimizedImage.jsx";

const ProductDetailView = ({ initialProduct, allProductVariants }) => {
    const [selectedVariant, setSelectedVariant] = useState(initialProduct);
    const [quantity, setQuantity] = useState(1);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const { addToCart, addToast } = useAppStore();

    useEffect(() => {
        if (quantity > selectedVariant.stok) {
            setQuantity(1);
        }
    }, [selectedVariant, quantity]);

    // Periodic refresh for stock and price (every 30 seconds)
    useEffect(() => {
        const refreshProduct = async () => {
            try {
                const { data } = await supabase
                    .from("products")
                    .select("stok, harga_jual, harga_coret")
                    .eq("id", initialProduct.id)
                    .single();
                
                if (data) {
                    setSelectedVariant((prev) => ({
                        ...prev,
                        stok: data.stok,
                        harga_jual: data.harga_jual,
                        harga_coret: data.harga_coret,
                    }));
                }
            } catch (err) {
                // silently fail
            }
        };
        
        // Refresh every 30 seconds
        const interval = setInterval(refreshProduct, 30000);
        return () => clearInterval(interval);
    }, [initialProduct.id]);

    const formatRupiah = (number) =>
        new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(number || 0);

    const availableSizes = useMemo(() => {
        if (!allProductVariants) return [];
        return [
            ...new Set(
                allProductVariants
                    .filter((p) => p.stok > 0 && p.status === "Aktif")
                    .map((p) => p.ukuran),
            ),
        ];
    }, [allProductVariants]);

    const handleSizeChange = (size) => {
        const newVariant = allProductVariants.find((p) => p.ukuran === size);
        if (newVariant) {
            setSelectedVariant(newVariant);
            setGalleryIndex(0);
        }
    };

    const handleQuantityChange = (amount) => {
        const newQuantity = Math.max(
            1,
            Math.min(selectedVariant.stok, quantity + amount),
        );
        setQuantity(newQuantity);
    };

    // Lalu, ganti seluruh fungsi handleAddToCart yang lama dengan fungsi lengkap di bawah ini:
    const handleAddToCart = async () => {
        // Tombol sudah di-disable jika stok habis, jadi tidak perlu cek lagi.

        try {
            // Panggil fungsi addToCart dari store yang sudah memiliki validasi internal
            await addToCart(selectedVariant, quantity);
        } catch (error) {
            // Tangkap dan tangani error spesifik yang dikirim oleh store
            if (error.message === "NOT_AUTHENTICATED") {
                addToast({
                    type: "info",
                    message: "Silakan login terlebih dahulu untuk berbelanja.",
                });
                // Arahkan ke halaman login
                window.location.href = "/login";
            } else if (error.message === "CUSTOMER_PROFILE_MISSING") {
                addToast({
                    type: "warning",
                    message:
                        "Profil Anda belum lengkap. Mohon lengkapi data diri.",
                });
                // Arahkan ke halaman lengkapi profil
                window.location.href = "/akun/lengkapi-profil";
            } else {
                // Untuk error umum lainnya
                addToast({
                    type: "error",
                    message: "Terjadi kesalahan. Silakan coba lagi.",
                });
                console.error("Add to cart error:", error);
            }
        }
    };

    // --- LOGIKA BADGES & DISKON (SEKARANG DINAMIS) ---
    const isLowStock =
        selectedVariant.stok > 0 &&
        selectedVariant.stok <= selectedVariant.stok_min;
    const hasDiscount =
        selectedVariant.harga_coret &&
        selectedVariant.harga_coret > selectedVariant.harga_jual;
    const discountPercentage = hasDiscount
        ? Math.round(
              ((selectedVariant.harga_coret - selectedVariant.harga_jual) /
                  selectedVariant.harga_coret) *
                  100,
          )
        : 0;
    const isBestSeller = selectedVariant.total_terjual > 50;

    const galleryImages = useMemo(() => {
        const images = [selectedVariant.image_url, selectedVariant.image_url_2, selectedVariant.image_url_3].filter(Boolean);
        return images.length > 0 ? images : [];
    }, [selectedVariant]);

    const currentImage = galleryImages[galleryIndex] || null;

    const nextImage = () => {
        setGalleryIndex((prev) => (prev + 1) % galleryImages.length);
    };

    const prevImage = () => {
        setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* --- KOLOM KIRI: TAMPILAN GAMBAR (SEKARANG DINAMIS) --- */}
            <div className="relative aspect-square rounded-lg flex items-center justify-center overflow-hidden">
                {currentImage ? (
                    <OptimizedImage
                        src={currentImage}
                        alt={selectedVariant.nama}
                        width={800}
                        className="w-full h-full object-contain transition-opacity duration-300"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-100 rounded-lg"></div>
                )}

                {galleryImages.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 w-8 h-8 rounded-full shadow flex items-center justify-center"
                            type="button"
                        >
                            &lt;
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 w-8 h-8 rounded-full shadow flex items-center justify-center"
                            type="button"
                        >
                            &gt;
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {galleryImages.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`w-2 h-2 rounded-full ${idx === galleryIndex ? "bg-orange-500" : "bg-slate-300"}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
                    {hasDiscount && (
                        <div className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded">
                            DISKON {discountPercentage}%
                        </div>
                    )}
                    {isBestSeller && (
                        <div className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded">
                            TERLARIS
                        </div>
                    )}
                    {isLowStock && (
                        <div className="bg-yellow-400 text-yellow-900 text-sm font-bold px-3 py-1 rounded">
                            STOK TERAKHIR
                        </div>
                    )}
                </div>

                <div className="absolute bottom-8 left-8 flex flex-col items-center">
                    {selectedVariant.color_swatch_url && (
                        <div className="w-28 h-28 rounded-full shadow-lg overflow-hidden">
                            <OptimizedImage
                                src={selectedVariant.color_swatch_url}
                                alt={`Warna ${selectedVariant.nama}`}
                                width={200}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                        {selectedVariant.sku && (
                            <p className="text-sm mobile:text-base tablet:text-lg desktop:text-2xl font-bold text-slate-900 bg-white/70 px-1 rounded shadow">
                                {selectedVariant.sku}
                            </p>
                        )}
                        {selectedVariant.kategori === "Pilok" && selectedVariant.ukuran && (
                            <p className="text-sm mobile:text-base tablet:text-lg desktop:text-2xl font-bold text-slate-900 bg-white/70 px-1 rounded shadow">
                                {selectedVariant.ukuran}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* --- KOLOM KANAN: INFO & AKSI (SEKARANG DINAMIS) --- */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-4xl font-bold mt-1">
                        {selectedVariant.sku} - {selectedVariant.nama}
                    </h1>
                    {selectedVariant.lini_produk && (
                        <p className="text-lg text-blue-600 font-semibold uppercase tracking-wider">
                            {selectedVariant.lini_produk}
                        </p>
                    )}
                    <p className="text-base">
                        <span className="font-semibold text-slate-900">Merek:</span> <span className="text-slate-600">{selectedVariant.merek}</span>
                        <span className="mx-2 text-slate-400">|</span>
                        <span className="font-semibold text-slate-900">Ukuran:</span> <span className="text-slate-600">{selectedVariant.ukuran}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-orange-500">
                            {selectedVariant.rating?.toFixed(1) || "5.0"}
                        </span>
                        <FiStar
                            className="text-orange-500"
                            fill="currentColor"
                            size={16}
                        />
                    </div>
                    <div className="border-l pl-4">
                        <span className="font-bold text-slate-800">
                            {selectedVariant.jumlah_ulasan || 0}
                        </span>{" "}
                        Ulasan
                    </div>
                    <div className="border-l pl-4">
                        <span className="font-bold text-slate-800">
                            {selectedVariant.total_terjual || 0}
                        </span>{" "}
                        Terjual
                    </div>
                </div>
                <div className="bg-slate-50 shadow-xl p-4 rounded-lg">
                    {hasDiscount && (
                        <p className="text-xl text-slate-500 line-through">
                            {formatRupiah(selectedVariant.harga_coret)}
                        </p>
                    )}
                    <p className="font-bold text-4xl text-orange-500">
                        {formatRupiah(selectedVariant.harga_jual)}
                    </p>
                </div>

                <a
                    href={`/simulator?product_id=${selectedVariant.id}`}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                    <FiEye />
                    <span>Coba Warna di Garasi Virtual</span>
                </a>

                <div className="bg-white p-6 rounded-xl shadow-lg border">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Pilih Ukuran
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {availableSizes.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => handleSizeChange(size)}
                                    className={`px-3 py-1.5 text-center text-sm font-semibold rounded-lg border-2 ${selectedVariant.ukuran === size ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Jumlah
                            </label>
                            <div className="flex items-center border rounded-md">
                                <button
                                    onClick={() => handleQuantityChange(-1)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-md"
                                >
                                    <FiMinus />
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    readOnly
                                    className="w-14 h-10 text-center font-semibold border-l border-r focus:ring-0"
                                />
                                <button
                                    onClick={() => handleQuantityChange(1)}
                                    disabled={quantity >= selectedVariant.stok}
                                    className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-md disabled:opacity-50"
                                >
                                    <FiPlus />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 self-end">
                            Stok Tersedia:{" "}
                            <span className="font-bold">
                                {selectedVariant.stok}
                            </span>
                        </p>
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={handleAddToCart}
                            disabled={selectedVariant.stok <= 0}
                            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-slate-400"
                        >
                            <FiShoppingCart />
                            <span>
                                {selectedVariant.stok > 0
                                    ? "Tambah ke Keranjang"
                                    : "Stok Habis"}
                            </span>
                        </button>
                        <div className="mt-3 flex justify-center">
                            <WishlistButton productId={selectedVariant.id} variant="full" />
                        </div>
                    </div>
                </div>

                <ProductInfoTabs product={selectedVariant} />
            </div>

            <div className="md:col-span-2">
                <RelatedProducts
                    productId={selectedVariant.id}
                    nama={selectedVariant.nama}
                    merek={selectedVariant.merek}
                    ukuran={selectedVariant.ukuran}
                    kategori={selectedVariant.kategori}
                    limit={8}
                />
            </div>
        </div>
    );
};

export default ProductDetailView;
