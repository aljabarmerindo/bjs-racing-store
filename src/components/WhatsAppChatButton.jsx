// src/components/WhatsAppChatButton.jsx
import React from "react";

const WhatsAppChatButton = ({ phone = "62881011669213", message = "Halo BJS Racing, saya mau tanya tentang produk..." }) => {
  const encodedMessage = encodeURIComponent(message);
  const href = `https://wa.me/${phone}?text=${encodedMessage}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 lg:bottom-5 right-5 z-40 bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-colors"
      aria-label="Chat WhatsApp"
    >
      <img src="/icons/WhatsApp.svg.webp" alt="WhatsApp" className="w-6 h-6" />
    </a>
  );
};

export default WhatsAppChatButton;
