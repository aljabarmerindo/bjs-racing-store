// src/components/ProductFilter.jsx

import React from "react";
import { FiSearch } from "react-icons/fi";

const ProductFilter = ({ filters, onFilterChange }) => {
  const handleInputChange = (e) => {
    onFilterChange("searchTerm", e.target.value);
  };

  return (
    <div className="bg-white p-2.5 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4">
      {/* Kolom Pencarian */}
      <div className="relative flex-grow">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari di toko ini..."
          value={filters.searchTerm}
          onChange={handleInputChange}
          className="w-full p-1.5 pl-10 border rounded-lg text-sm"
        />
      </div>

      {/* Tombol Urutkan */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onFilterChange("sort", "terlaris")}
          className={`px-3 py-1.5 text-xs rounded-md ${filters.sort === "terlaris" ? "bg-orange-500 text-white" : "bg-slate-100"}`}
        >
          Terlaris
        </button>
        <button
          onClick={() => onFilterChange("sort", "terbaru")}
          className={`px-3 py-1.5 text-xs rounded-md ${filters.sort === "terbaru" ? "bg-orange-500 text-white" : "bg-slate-100"}`}
        >
          Terbaru
        </button>
        <select
          value={filters.price}
          onChange={(e) => onFilterChange("price", e.target.value)}
          className="p-1.5 border rounded-lg bg-white text-xs"
        >
          <option value="">Harga</option>
          <option value="terendah">Terendah</option>
          <option value="tertinggi">Tertinggi</option>
        </select>
      </div>
    </div>
  );
};

export default ProductFilter;
