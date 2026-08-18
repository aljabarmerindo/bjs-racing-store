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
      className="fixed bottom-20 lg:bottom-5 right-5 z-40"
      aria-label="Chat WhatsApp"
    >
      <span className="absolute inset-0 rounded-full bg-green-400 animate-[whatsapp-pulse_1.5s_ease-in-out_infinite]" />
      <span className="relative bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-colors">
        <img src="/icons/WhatsApp.svg.webp" alt="WhatsApp" className="w-6 h-6" />
      </span>
    </a>
  );
};

export default WhatsAppChatButton;
