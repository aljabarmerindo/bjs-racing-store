// src/components/UpdateNotifier.jsx
// Meregistrasi service worker PWA. Dengan registerType autoUpdate,
// pembaruan diterapkan otomatis tanpa prompt ke pengguna.
import { useRegisterSW } from "virtual:pwa-register/react";

function UpdateNotifier() {
  useRegisterSW({
    onRegistered() {},
    onRegisterError() {},
  });

  return null;
}

export default UpdateNotifier;
