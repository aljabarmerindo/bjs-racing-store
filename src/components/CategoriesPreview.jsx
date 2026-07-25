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
    <section className="bg-slate-50 py-12 mobile:py-16 tablet:py-20">
      <div className="container mx-auto px-3 mobile:px-4 tablet:px-6">
        <h2 className="text-xl mobile:text-2xl tablet:text-3xl font-bold text-center text-slate-800 mb-8 mobile:mb-12">
          Kategori Produk
        </h2>

        <div className="grid grid-cols-2 mobile:grid-cols-3 tablet:grid-cols-4 gap-4 mobile:gap-6">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.name}
                href={cat.href}
                className={`group bg-white p-5 mobile:p-6 rounded-2xl text-center border border-slate-200 hover:border-orange-500 hover:shadow-xl transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
              >
                <div
                  className={`w-14 h-14 mobile:w-16 mobile:h-16 mx-auto rounded-xl ${cat.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}
                >
                  <Icon
                    className={`w-7 h-7 mobile:w-8 mobile:h-8 ${cat.iconColor}`}
                  />
                </div>
                <p className="text-sm mobile:text-base font-semibold text-slate-800 mb-1">
                  {cat.name}
                </p>
                <p className="text-xs mobile:text-sm text-slate-500">
                  {cat.count} produk
                </p>
              </a>
            );
          })}
        </div>

        <div className="text-center mt-8 mobile:mt-12">
          <a
            href="/katalog-warna"
            className="inline-block bg-orange-500 text-white px-6 mobile:px-8 py-3 rounded-full font-semibold shadow-lg hover:bg-orange-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 text-sm mobile:text-base"
          >
            Lihat Semua Kategori
          </a>
        </div>
      </div>
    </section>
  );
};

export default CategoriesPreview;
