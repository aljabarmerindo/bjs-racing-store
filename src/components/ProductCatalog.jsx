// src/components/ProductCatalog.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseBrowserClient.ts";
import CatalogFilter from "./CatalogFilter.jsx";
import ProductCard from "./ProductCard.jsx";
import ColorSwatchCard from "./ColorSwatchCard.jsx";

const ProductCatalog = ({ filterConfig, cardType = "product" }) => {
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [filters, setFilters] = useState({
        searchTerm: "",
        sort: "terlaris",
        price: "",
        kategori: "semua",
        merek: "semua",
        lini_produk: "semua",
        color_variant: "semua",
        ukuran: "semua",
        merek_motor: "semua",
        tipe_motor: "semua",
    });

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        let sortBy = filters.sort;
        if (filters.price === "terendah") sortBy = "harga_asc";
        if (filters.price === "tertinggi") sortBy = "harga_desc";

        const isOnderdilPage = filterConfig.showVehicleBrandFilter;
        
        const functionName = isOnderdilPage 
            ? 'search_onderdil_products' 
            : 'search_and_sort_products';

        let finalCategoryFilter = null;
        if (filters.kategori !== "semua") {
            finalCategoryFilter = filters.kategori;
        } else if (filterConfig.category) {
            finalCategoryFilter = filterConfig.category;
        }

        let params = {
            p_sort_by: sortBy,
            p_search_term: filters.searchTerm,
            p_kategori: finalCategoryFilter,
            p_merek: filters.merek === "semua" ? null : filters.merek
        };

        if (isOnderdilPage) {
            params.p_vehicle_brand_id = filters.merek_motor === "semua" ? null : parseInt(filters.merek_motor, 10);
            params.p_vehicle_model_id = filters.tipe_motor === "semua" ? null : parseInt(filters.tipe_motor, 10);
        } else {
            params.p_lini_produk = filters.lini_produk === "semua" ? null : filters.lini_produk;
            params.p_color_variant = filters.color_variant === "semua" ? null : filters.color_variant;
            params.p_ukuran = filters.ukuran === "semua" ? null : filters.ukuran;
        }

        const { data, error } = await supabase.rpc(functionName, params);

        if (error)
            console.error(`Gagal memuat produk (${functionName}):`, error.message);
        else setAllProducts(data || []);

        setLoading(false);
    }, [filterConfig, filters]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const groupedProducts = useMemo(() => {
        if (cardType !== "colorSwatch") return null;
        const uniqueProducts = new Map();
        allProducts.forEach((p) => {
            if (!uniqueProducts.has(p.nama) && p.color_swatch_url) {
                uniqueProducts.set(p.nama, p);
            }
        });
        const uniqueProductList = Array.from(uniqueProducts.values());
        return uniqueProductList.reduce((acc, product) => {
            const variant = product.color_variant || "Lainnya";
            if (!acc[variant]) acc[variant] = [];
            acc[variant].push(product);
            return acc;
        }, {});
    }, [allProducts, cardType]);

    return (
        <div>
            <CatalogFilter
                filters={filters}
                setFilters={setFilters}
                filterConfig={filterConfig}
            />

            {loading ? (
                <p className="text-center py-20">Memuat produk...</p>
            ) : cardType === "colorSwatch" ? (
                Object.keys(groupedProducts).length > 0 ? (
                    <div className="space-y-12">
                        {Object.entries(groupedProducts).map(
                            ([variantName, products]) => (
                                <div key={variantName}>
                                    <h2 className="text-xl font-bold border-b-2 border-orange-400 pb-2 mb-6">
                                        {variantName}
                                    </h2>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8">
                                        {products.map((product) => (
                                            <ColorSwatchCard
                                                key={product.id}
                                                product={product}
                                                allProductsInCatalog={allProducts}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ),
                        )}
                    </div>
                ) : (
                    <p className="text-center py-20 text-slate-500">
                        Warna tidak ditemukan.
                    </p>
                )
            ) : allProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {allProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <p className="text-center py-20 text-slate-500">
                    Produk tidak ditemukan.
                </p>
            )}
        </div>
    );
};

export default ProductCatalog;
