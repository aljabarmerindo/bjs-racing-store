// src/components/ProductGallery.jsx

import React, { useState } from "react";
import OptimizedImage from "./OptimizedImage.jsx";

const ProductGallery = ({ images }) => {
    if (!images || images.length === 0) {
        return (
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                <svg
                    className="w-24 h-24 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l-1.586-1.586a2 2 0 00-2.828 0L6 14m6-6l2-2m0 0l2 2m-2-2v6m0 0l2 2"
                    ></path>
                </svg>
            </div>
        );
    }

    const [mainImage, setMainImage] = useState(images[0]);

    return (
        <div className="flex flex-col gap-4">
            <div className="aspect-square bg-white rounded-lg flex items-center justify-center p-4 shadow-sm border">
                <OptimizedImage
                    src={mainImage.url}
                    alt="Gambar utama produk"
                    width={800}
                    className="w-full h-full object-contain"
                />
            </div>

            <div className="grid grid-cols-5 gap-2">
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => setMainImage(image)}
                        className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${mainImage.url === image.url ? "border-orange-500" : "border-transparent hover:border-slate-300"}`}
                    >
                        {image.type === "swatch" ? (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center p-1">
                                <OptimizedImage
                                    src={image.url}
                                    alt={`Thumbnail warna ${index + 1}`}
                                    width={150}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            </div>
                        ) : (
                            <OptimizedImage
                                src={image.url}
                                alt={`Thumbnail ${index + 1}`}
                                width={200}
                                className="w-full h-full object-contain bg-slate-100 p-1"
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ProductGallery;
