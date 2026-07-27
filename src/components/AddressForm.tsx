// File: src/components/AddressForm.tsx
// Deskripsi: Versi lengkap dengan Biteship Maps Search Area untuk autocomplete alamat.

import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import type { Address, FormDataState } from "@/lib/store";
import MapPicker, { type MapPickerResult } from "./MapPicker";
import type { BiteshipAreaResult } from "@/lib/biteship";

interface AddressFormProps {
  isOpen: boolean;
  onClose: () => void;
  addressToEdit?: Address | null;
}

const initialFormState: FormDataState = {
  label: "",
  recipient_name: "",
  recipient_phone: "",
  destination: "",
  destination_text: "",
  full_address: "",
  postal_code: "",
  city_id: "",
  province_id: "",
  latitude: "",
  longitude: "",
};

export default function AddressForm({
  isOpen,
  onClose,
  addressToEdit,
}: AddressFormProps) {
  const [formData, setFormData] = useState<FormDataState>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BiteshipAreaResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const addAddress = useAppStore((state) => state.addAddress);
  const updateAddress = useAppStore((state) => state.updateAddress);

  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        setFormData({
          label: addressToEdit.label || "",
          recipient_name: addressToEdit.recipient_name || "",
          recipient_phone: addressToEdit.recipient_phone || "",
          destination: addressToEdit.destination || "",
          destination_text: addressToEdit.destination_text || "",
          full_address: addressToEdit.full_address || "",
          postal_code: addressToEdit.postal_code || "",
          province_id: addressToEdit.province_id || "",
          city_id: addressToEdit.city_id || "",
          latitude: addressToEdit.latitude || "",
          longitude: addressToEdit.longitude || "",
        });
        setSearchQuery(addressToEdit.destination_text || "");
      } else {
        setFormData(initialFormState);
        setSearchQuery("");
      }
      setErrorMessage("");
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  }, [addressToEdit, isOpen]);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/shipping/biteship/search-area?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error("Gagal mencari area.");
      const results: BiteshipAreaResult[] = await response.json();
      setSearchResults(results);
      setIsDropdownOpen(true);
    } catch (error) {
      console.error("Biteship Maps search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery && searchQuery !== formData.destination_text) {
        performSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, formData.destination_text, performSearch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    if (newQuery !== formData.destination_text) {
      setFormData((prev) => ({ ...prev, destination: "" }));
    }
  };

  const handleAreaSelect = (area: BiteshipAreaResult) => {
    const fullText = [
      area.administrativeLevel4,
      area.administrativeLevel3,
      area.administrativeLevel2,
      area.administrativeLevel1,
    ].filter(Boolean).join(", ");

    setFormData((prev) => ({
      ...prev,
      destination: area.id,
      destination_text: fullText || area.name,
      postal_code: area.postalCode || prev.postal_code,
      city_id: area.administrativeLevel2 || "",
      province_id: area.administrativeLevel1 || "",
      latitude: area.latitude || prev.latitude,
      longitude: area.longitude || prev.longitude,
    }));
    setSearchQuery(fullText || area.name);
    setIsDropdownOpen(false);
  };

  const handleInputBlur = () => {
    setTimeout(() => setIsDropdownOpen(false), 150);
  };

  const handleGeocode = async () => {
    const q = `${formData.full_address}, ${formData.postal_code}`.trim();
    if (!q || !formData.postal_code) {
      setErrorMessage("Isi alamat lengkap & kode pos dulu sebelum cari koordinat.");
      return;
    }
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `/api/shipping/biteship/geocode?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (data.latitude && data.longitude) {
        setFormData((prev) => ({
          ...prev,
          latitude: String(data.latitude),
          longitude: String(data.longitude),
        }));
      } else {
        setErrorMessage(
          "Koordinat otomatis tidak ditemukan. Isi manual latitude/longitude atau pilih di map.",
        );
      }
    } catch {
      setErrorMessage("Gagal mengambil koordinat otomatis.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleMapSelect = (result: MapPickerResult) => {
    setFormData((prev) => ({
      ...prev,
      latitude: String(result.lat),
      longitude: String(result.lng),
      full_address: result.full_address || prev.full_address,
      destination_text: prev.destination_text || result.full_address,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    if (!formData.destination) {
      setErrorMessage(
        "Alamat/Area harus dipilih dari hasil pencarian dropdown.",
      );
      setIsLoading(false);
      return;
    }

    if (
      !formData.recipient_name ||
      !formData.recipient_phone ||
      !formData.full_address
    ) {
      setErrorMessage(
        "Nama Penerima, Nomor Telepon, dan Alamat Lengkap wajib diisi.",
      );
      setIsLoading(false);
      return;
    }

    try {
      if (addressToEdit) {
        await updateAddress(addressToEdit.id, formData);
      } else {
        await addAddress(formData);
      }
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 sm:bg-black/60 sm:backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col h-full w-full bg-white sm:h-auto sm:max-w-lg sm:max-h-[90vh] sm:rounded-xl sm:shadow-2xl">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0 sm:px-6">
            <h3 className="text-lg font-bold text-slate-800 sm:text-xl">
              {addressToEdit ? "Ubah Alamat" : "Tambah Alamat Baru"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 -mr-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4 sm:px-6 sm:space-y-5">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="label" className="block text-sm font-medium text-slate-700 mb-1.5">
                Label Alamat
              </label>
              <input
                type="text"
                id="label"
                name="label"
                value={formData.label}
                onChange={handleChange}
                placeholder="Contoh: Rumah, Kantor"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="recipient_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nama Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="recipient_name"
                name="recipient_name"
                value={formData.recipient_name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="recipient_phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nomor Telepon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="recipient_phone"
                name="recipient_phone"
                value={formData.recipient_phone}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="relative">
              <label htmlFor="area-search" className="block text-sm font-medium text-slate-700 mb-1.5">
                Cari Alamat / Area
              </label>
              <input
                type="text"
                id="area-search"
                autoComplete="off"
                placeholder="Ketik alamat atau nama area..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={handleInputBlur}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
              {isDropdownOpen &&
                (searchResults.length > 0 || isSearching) && (
                  <div className="absolute z-[60] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-xl ring-1 ring-black/5">
                    {isSearching && (
                      <div className="p-3 text-gray-500 text-sm">Mencari...</div>
                    )}
                    {searchResults.map((area) => (
                      <div
                        key={area.id}
                        onMouseDown={() => handleAreaSelect(area)}
                        className="cursor-pointer p-3 hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-gray-800 text-sm">{area.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {[
                            area.administrativeLevel4,
                            area.administrativeLevel3,
                            area.administrativeLevel2,
                            area.administrativeLevel1,
                          ]
                            .filter(Boolean)
                            .join(", ") || area.type}
                        </div>
                        {area.postalCode && (
                          <div className="text-xs text-gray-400 mt-0.5">Kode pos: {area.postalCode}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div>
              <label htmlFor="full_address" className="block text-sm font-medium text-slate-700 mb-1.5">
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                id="full_address"
                name="full_address"
                value={formData.full_address}
                onChange={handleChange}
                rows={3}
                required
                placeholder="Nama jalan, nomor rumah, RT/RW"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Kode Pos
                </label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="recipient_phone_dup" className="block text-sm font-medium text-slate-700 mb-1.5">
                  No Telepon
                </label>
                <input
                  type="tel"
                  id="recipient_phone_dup"
                  name="recipient_phone"
                  value={formData.recipient_phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Pilih Lokasi di Map
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Klik atau seret marker untuk menentukan koordinat alamat.
              </p>
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <MapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onSelect={handleMapSelect}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Latitude
                </label>
                <input
                  type="text"
                  id="latitude"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  placeholder="-6.2..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Longitude
                </label>
                <input
                  type="text"
                  id="longitude"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  placeholder="106.8..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGeocode}
              disabled={isGeocoding}
              className="text-sm text-orange-600 hover:text-orange-700 underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeocoding ? "Mencari..." : "Cari Koordinat Otomatis (GoSend)"}
            </button>
          </div>

          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-3 flex justify-end gap-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
            >
              {isLoading ? "Menyimpan..." : "Simpan Alamat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
