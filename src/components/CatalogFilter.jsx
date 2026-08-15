// src/components/CatalogFilter.jsx

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseBrowserClient.ts";
import { FiSearch, FiRefreshCw } from "react-icons/fi";

const CatalogFilter = ({ filters, setFilters, filterConfig }) => {
    // State baru untuk menampung data master
    const [categories, setCategories] = useState([]);
    const [activeMereks, setActiveMereks] = useState(new Set());
    const [vehicleBrands, setVehicleBrands] = useState([]);
    const [vehicleModels, setVehicleModels] = useState([]);
    const [allProducts, setAllProducts] = useState([]);

    useEffect(() => {
        const fetchFilterData = async () => {
            // Ambil data produk untuk filter merek/cascade
            let productQuery = supabase
                .from("products")
                .select("merek, lini_produk, color_variant, ukuran")
                .eq("status", "Aktif");
            if (filterConfig.category) {
                productQuery = productQuery.eq("kategori", filterConfig.category);
            }
            if (filterConfig.showVehicleBrandFilter) {
                productQuery = productQuery.not("kategori", "in", '("Pilok", "Jasa")');
            }
            const { data: productData } = await productQuery;
            setAllProducts(productData || []);

            // PERBAIKAN 1: Ambil data Kategori jika filter diaktifkan
            // Hanya kategori yang AKTIF di product_categories (visibilitas /onderdil)
            if (filterConfig.showCategoryFilter) {
                const { data: activeCatData } = await supabase
                    .from('product_categories')
                    .select('kategori')
                    .eq('is_active', true);
                const activeCatSet = new Set((activeCatData || []).map(c => c.kategori));

                const { data: productCatData } = await supabase
                    .from('products')
                    .select('kategori')
                    .not('kategori', 'in', '("Pilok", "Jasa")')
                    .not('kategori', 'is', null);

                if (productCatData) {
                    const uniqueCategories = [...new Set(productCatData.map(p => p.kategori))]
                        .filter(k => activeCatSet.has(k))
                        .sort();
                    setCategories(uniqueCategories);
                }
            }

            // Ambil merek yang AKTIF di product_mereks (visibilitas /onderdil)
            if (filterConfig.showVehicleBrandFilter) {
                const { data: merekData } = await supabase
                    .from('product_mereks')
                    .select('merek')
                    .eq('is_active', true);
                setActiveMereks(new Set((merekData || []).map(m => m.merek)));
            }

            // Ambil data kendaraan jika filter kendaraan aktif
            if (filterConfig.showVehicleBrandFilter) {
                const { data: brandsData } = await supabase.from('vehicle_brands').select('*').order('name');
                setVehicleBrands(brandsData || []);
            }
            if (filterConfig.showVehicleModelFilter) {
                const { data: modelsData } = await supabase.from('vehicle_models').select('*').order('name');
                setVehicleModels(modelsData || []);
            }
        };
        fetchFilterData();
    }, [filterConfig]);

    const options = useMemo(() => {
        // Pada halaman /onderdil, opsi merek dibatasi hanya merek AKTIF
        // dan nilai kosong/'-' dinormalisasi menjadi 'TANPA MEREK'
        const merekOptions = filterConfig.showVehicleBrandFilter
            ? [...new Set(
                  allProducts.map((p) =>
                      !p.merek || p.merek === "-" || p.merek === ""
                          ? "TANPA MEREK"
                          : p.merek
                  )
              )].filter((m) => activeMereks.has(m)).sort()
            : [...new Set(allProducts.map((p) => p.merek).filter(Boolean))].sort();
        const filteredByMerek =
            filters.merek === "semua"
                ? allProducts
                : allProducts.filter((p) => p.merek === filters.merek);
        const liniProdukOptions = [
            ...new Set(
                filteredByMerek.map((p) => p.lini_produk).filter(Boolean),
            ),
        ].sort();
        const filteredByLine =
            filters.lini_produk === "semua"
                ? filteredByMerek
                : filteredByMerek.filter(
                      (p) => p.lini_produk === filters.lini_produk,
                  );
        const colorVariantOptions = [
            ...new Set(
                filteredByLine.map((p) => p.color_variant).filter(Boolean),
            ),
        ].sort();
        const filteredByVariant =
            filters.color_variant === "semua"
                ? filteredByLine
                : filteredByLine.filter(
                      (p) => p.color_variant === filters.color_variant,
                  );
        const ukuranOptions = [
            ...new Set(filteredByVariant.map((p) => p.ukuran).filter(Boolean)),
        ].sort();

        const filteredModels =
            filters.merek_motor === "semua"
                ? vehicleModels
                : vehicleModels.filter(
                      (model) => model.brand_id == filters.merek_motor,
                  );

        return {
            merek: merekOptions,
            lini_produk: liniProdukOptions,
            color_variant: colorVariantOptions,
            ukuran: ukuranOptions,
            kategori: categories, // PERBAIKAN 2: Sediakan opsi kategori
            vehicle_brands: vehicleBrands,
            vehicle_models: filteredModels,
        };
    }, [allProducts, filters, activeMereks, vehicleBrands, vehicleModels]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "merek") {
            setFilters((prev) => ({
                ...prev,
                merek: value,
                lini_produk: "semua",
                color_variant: "semua",
                ukuran: "semua",
            }));
        } else if (name === "lini_produk") {
            setFilters((prev) => ({
                ...prev,
                lini_produk: value,
                color_variant: "semua",
                ukuran: "semua",
            }));
        } else if (name === "color_variant") {
            setFilters((prev) => ({
                ...prev,
                color_variant: value,
                ukuran: "semua",
            }));
        } else if (name === "merek_motor") {
            setFilters((prev) => ({
                ...prev,
                merek_motor: value,
                tipe_motor: "semua",
            }));
        } else {
            setFilters((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSortChange = (type, value) => {
        if (type === "sort" && filters.price !== "")
            setFilters((prev) => ({ ...prev, sort: value, price: "" }));
        else
            setFilters((prev) => ({
                ...prev,
                sort: value,
                price: type === "price" ? value : "",
            }));
    };

    const resetFilters = () =>
        setFilters({
            searchTerm: "",
            sort: "terlaris",
            price: "",
            kategori: "semua",
            merek: "semua",
            lini_produk: "semua",
            color_variant: "semua",
            ukuran: "semua",
            merek_motor: "semua", // Pastikan reset juga filter baru
            tipe_motor: "semua", // Pastikan reset juga filter baru
        });

    return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6 space-y-4">
      {/* Kolom Pencarian */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          name="searchTerm"
          value={filters.searchTerm}
          onChange={handleInputChange}
          className="w-full p-2 pl-10 border rounded-lg text-sm"
          placeholder="Cari di toko ini..."
        />
      </div>
      
      {/* Jajaran Dropdown Filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        
        {/* --- FILTER KATEGORI BARU DITAMBAHKAN DI SINI --- */}
        {filterConfig.showCategoryFilter && (
            <select name="kategori" value={filters.kategori} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
                <option value="semua">Semua Kategori</option>
                {options.kategori.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        )}

        {/* Filter Merek Produk (seperti Federal, Aspira) */}
        {filterConfig.showMerekFilter && (
          <select name="merek" value={filters.merek} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
            <option value="semua">Semua Merek Produk</option>
            {options.merek.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        
        {/* Filter Kendaraan */}
        {filterConfig.showVehicleBrandFilter && (
          <select name="merek_motor" value={filters.merek_motor} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
            <option value="semua">Semua Merek Motor</option>
            {options.vehicle_brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        )}
        {filterConfig.showVehicleModelFilter && (
          <select name="tipe_motor" value={filters.tipe_motor} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
            <option value="semua">Semua Tipe Motor</option>
            {options.vehicle_models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select>
        )}
        
        {/* Filter untuk Pilok (tetap ada) */}
        {filterConfig.showLiniProdukFilter && (
          <select name="lini_produk" value={filters.lini_produk} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
            <option value="semua">Semua Lini Produk</option>
            {options.lini_produk.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {filterConfig.showColorVariantFilter && (
          <select name="color_variant" value={filters.color_variant} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
            <option value="semua">Semua Varian Warna</option>
            {options.color_variant.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {filterConfig.showUkuranFilter && (
          <select name="ukuran" value={filters.ukuran} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white text-sm">
            <option value="semua">Semua Ukuran</option>
            {options.ukuran.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {/* Tombol Reset */}
        <button
          onClick={resetFilters}
          className="flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg text-sm"
        >
          <FiRefreshCw size={16} /> Reset
        </button>
      </div>

      {/* Jajaran Tombol Urutkan */}
      <div className="flex items-center gap-2 border-t pt-4">
        <span className="text-sm font-semibold text-slate-700 mr-2">
          Urutkan:
        </span>
        <button
          onClick={() => handleSortChange("sort", "terlaris")}
          className={`px-4 py-2 text-sm rounded-md ${filters.sort === "terlaris" && !filters.price ? "bg-orange-500 text-white" : "bg-slate-100"}`}
        >
          Terlaris
        </button>
        <button
          onClick={() => handleSortChange("sort", "terbaru")}
          className={`px-4 py-2 text-sm rounded-md ${filters.sort === "terbaru" && !filters.price ? "bg-orange-500 text-white" : "bg-slate-100"}`}
        >
          Terbaru
        </button>
        <select
          value={filters.price}
          onChange={(e) => handleSortChange("price", e.target.value)}
          className="p-2 border rounded-lg bg-white text-sm"
        >
          <option value="">Harga</option>
          <option value="terendah">Terendah</option>
          <option value="tertinggi">Tertinggi</option>
        </select>
      </div>
    </div>
  );
};

export default CatalogFilter;
