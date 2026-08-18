// src/components/TrustBadges.jsx
import React from "react";
import {
  FiShield,
  FiCheckCircle,
  FiTruck,
  FiHeadphones,
} from "react-icons/fi";

const BADGES = [
  {
    icon: FiShield,
    title: "Produk 100% Original",
    desc: "Garansi keaslian produk",
  },
  {
    icon: FiCheckCircle,
    title: "Garansi Resmi",
    desc: "Garansi resmi dari distributor",
  },
  {
    icon: FiTruck,
    title: "Pengiriman Fast",
    desc: "Kirim cepat ke seluruh Indonesia",
  },
  {
    icon: FiHeadphones,
    title: "CS 24/7",
    desc: "Customer service siap membantu",
  },
];

const COURIERS = ["JNE", "J&T Express", "SiCepat", "Biteship"];

const TrustBadges = () => {
  return (
    <section className="bg-white py-8 mobile:py-10 tablet:py-16">
      <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5">
        {/* Trust Badge Grid */}
        <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3 mobile:gap-4 mb-6 mobile:mb-8">
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.title}
                className="text-center p-3.5 mobile:p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-orange-500 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xs mobile:text-sm font-semibold text-slate-800 mb-1">
                  {badge.title}
                </h3>
                <p className="text-xs text-slate-500">{badge.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Courier Partners */}
        <div className="text-center">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">
            Partner Pengiriman
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mobile:gap-5">
            {COURIERS.map((name) => (
              <span
                key={name}
                className="text-sm mobile:text-base font-bold text-slate-300 hover:text-slate-500 transition-colors duration-200"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
