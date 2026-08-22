// src/components/ProductInfoTabs.jsx

import React, { useState } from "react";
import ReviewForm from "./ReviewForm.jsx";
import ReviewsList from "./ReviewsList.jsx";

const ProductInfoTabs = ({ product }) => {
  const [activeTab, setActiveTab] = useState("deskripsi");

  const tabs = [
    { id: "deskripsi", label: "Deskripsi Produk" },
    { id: "spesifikasi", label: "Spesifikasi" },
    { id: "ulasan", label: `Ulasan (${product.jumlah_ulasan || 0})` },

  ];

  return (
    <div className="mt-8">
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-500 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-6">
        {activeTab === "deskripsi" && (
          <div className="prose max-w-none text-slate-600">
            <p>{product.catatan || "Deskripsi belum tersedia."}</p>
          </div>
        )}
        {activeTab === "spesifikasi" && (
          <div>
            {product.specifications ? (
              <div className="prose max-w-none text-slate-600 whitespace-pre-wrap">
                {product.specifications}
              </div>
            ) : (
              <p className="text-slate-600">Spesifikasi belum tersedia.</p>
            )}
          </div>
        )}
        {activeTab === "ulasan" && (
          <div className="space-y-4">
            <ReviewsList productId={product.id} />
            <div className="border-t pt-4">
              <ReviewForm productId={product.id} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductInfoTabs;
