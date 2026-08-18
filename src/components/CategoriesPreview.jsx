// src/components/CategoriesPreview.jsx
import React from "react";
import { FiDroplet } from "react-icons/fi";

const CATEGORIES = [
  {
    name: "Pilok",
    href: "/pilok",
    icon: FiDroplet,
    count: "120",
    gradient: "from-orange-400 to-orange-500",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-500",
  },
];

const CategoriesPreview = () => {
  return (
    <section className="bg-slate-50 py-8 mobile:py-10 tablet:py-16">
      <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5">
        <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-center text-slate-800 mb-5 mobile:mb-8">
          Kategori Produk
        </h2>

        <div className="grid grid-cols-2 mobile:grid-cols-3 tablet:grid-cols-4 gap-3 mobile:gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.name}
                href={cat.href}
                className={`group bg-white p-3.5 mobile:p-4 rounded-2xl text-center border border-slate-200 hover:border-orange-500 hover:shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
              >
                <div
                  className={`w-10 h-10 mobile:w-12 mobile:h-12 mx-auto rounded-xl ${cat.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}
                >
                  <Icon
                    className={`w-5 h-5 mobile:w-6 mobile:h-6 ${cat.iconColor}`}
                  />
                </div>
                <p className="text-xs mobile:text-sm font-semibold text-slate-800 mb-1">
                  {cat.name}
                </p>
                <p className="text-xs mobile:text-xs text-slate-500">
                  {cat.count} produk
                </p>
              </a>
            );
          })}
        </div>

        <div className="text-center mt-5 mobile:mt-8">
          <a
            href="/katalog-warna"
            className="inline-block bg-orange-500 text-white px-5 mobile:px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-orange-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 text-xs mobile:text-sm"
          >
            Lihat Semua Kategori
          </a>
        </div>
      </div>
    </section>
  );
};

export default CategoriesPreview;
