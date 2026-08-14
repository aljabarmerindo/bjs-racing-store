// src/components/ProductCard.jsx (Versi Final dengan Layout Responsif)

import React from "react";
import AddToCartButton from "./AddToCartButton.jsx";
import { FiStar } from "react-icons/fi";
import WishlistButton from "./WishlistButton.jsx";


const ProductCard = ({ product }) => {
    const formatRupiah = (number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(number || 0);
    };

    const isLowStock = product.stok > 0 && product.stok <= product.stok_min;
    const hasDiscount =
        product.harga_coret && product.harga_coret > product.harga_jual;
    const discountPercentage = hasDiscount
        ? Math.round(
              ((product.harga_coret - product.harga_jual) /
                  product.harga_coret) *
                  100,
          )
        : 0;
    const isBestSeller = product.total_terjual > 50;

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden group border border-slate-200 hover:border-orange-500 transition-all duration-300 flex flex-col h-full">
            <a
                href={`/products/${product.id}`}
                className="block flex flex-col flex-grow"
            >
                <div className="relative aspect-square bg-white flex items-center justify-center">
                    {/* Gambar Utama */}
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.nama}
                            className="w-full h-full object-contain transition-transform group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-100 rounded-md"></div>
                    )}

                    {/* Multi-image indicator */}
                    {[product.image_url_2, product.image_url_3].filter(Boolean).length > 0 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            +{[product.image_url_2, product.image_url_3].filter(Boolean).length}
                        </div>
                    )}

                    {/* --- BADGES BARU (Pojok Kiri Atas) --- */}
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
                        {hasDiscount && (
                            <div className="bg-red-500 text-white text-2xs md:text-xs font-bold px-2 py-0.5 rounded">
                                DISKON {discountPercentage}%
                            </div>
                        )}
                        {isBestSeller && (
                            <div className="bg-orange-500 text-white text-2xs md:text-xs font-bold px-2 py-0.5 rounded">
                                TERLARIS
                            </div>
                        )}
                        {isLowStock && (
                            <div className="bg-yellow-400 text-yellow-900 text-2xs md:text-xs font-bold px-2 py-0.5 rounded">
                                STOK TERAKHIR
                            </div>
                        )}
                    </div>

                    {/* --- LINGKARAN WARNA & SKU (Sekarang Responsif) --- */}
                    {/* Tampilan HP: di Kiri Atas */}
                    <div className="absolute bottom-1 left-4 flex flex-col items-center md:hidden">
                        {product.color_swatch_url && (
                            <div className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center overflow-hidden">
                                <img
                                    src={product.color_swatch_url}
                                    alt={`Warna ${product.nama}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <p className="text-sm font-bold text-slate-900 bg-white/70 px-1 rounded mt-1">
                            {product.sku || ""}
                        </p>
                    </div>

                    {/* Tampilan Desktop: di Kiri Bawah */}
                    <div className="absolute bottom-1 left-4 hidden md:flex flex-col items-center">
                        {product.color_swatch_url && (
                            <div className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center overflow-hidden">
                                <img
                                    src={product.color_swatch_url}
                                    alt={`Warna ${product.nama}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <p className="text-base font-bold text-slate-900 bg-white/70 px-1 rounded mt-1">
                            {product.sku || ""}
                        </p>
                    </div>
                </div>

                {/* Blok info produk */}
                <div className="p-3 flex-grow flex flex-col bg-white">
                    <h3
                        className="text-base font-bold text-slate-900 line-clamp-2 mt-1"
                        title={product.nama}
                    >
                        {product.nama}
                    </h3>
                    <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">
                        {product.lini_produk || ""}
                    </p>
                    <p className="text-xs">
                        <span className="font-semibold text-slate-900">Merek:</span> <span className="text-slate-600">{product.merek}</span>
                        <span className="mx-1 text-slate-400">|</span>
                        <span className="font-semibold text-slate-900">Ukuran:</span> <span className="text-slate-600">{product.ukuran}</span>
                    </p>
                    <div className="flex-grow"></div>
                    <div className="mt-1">
                        {hasDiscount && (
                            <p className="text-xs text-slate-400 line-through">
                                {formatRupiah(product.harga_coret)}
                            </p>
                        )}
                        <p className="font-bold text-lg text-orange-500">
                            {formatRupiah(product.harga_jual)}
                        </p>
                    </div>
                    {/* --- RATING, TERJUAL, & STOK (VERSI PROFESIONAL) --- */}
                    <div className="flex justify-between items-center text-xs text-slate-900 font-semibold mt-auto pt-2 border-t mt-2">
                        {/* Kiri: Rating & Terjual */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <FiStar
                                    className="text-yellow-400"
                                    fill="currentColor"
                                />
                                <span className="font-semibold">
                                    {product.rating?.toFixed(1) || "Baru"}
                                </span>
                            </div>
                            <span className="border-l pl-2">
                                {product.total_terjual || 0} Terjual
                            </span>
                        </div>

                        {/* Kanan: Stok */}
                        <p
                            className={`font-semibold ${isLowStock ? "text-red-500" : "text-slate-900"}`}
                        >
                            Stok: {product.stok}
                        </p>
                    </div>
                </div>
            </a>
            <div className="px-3 pb-3 bg-white">
                <AddToCartButton product={product} />
                <div className="mt-2">
                    <WishlistButton productId={product.id} />
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
