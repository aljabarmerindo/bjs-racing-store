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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6">
            <div className="flex justify-between items-center pb-3">
              <h3 className="text-xl font-bold">
                {addressToEdit ? "Ubah Alamat" : "Tambah Alamat Baru"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-800 text-3xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
              <div>
                <label
                  htmlFor="label"
                  className="block text-sm font-medium text-gray-700"
                >
                  Label Alamat
                </label>
                <input
                  type="text"
                  id="label"
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  placeholder="Contoh: Rumah, Kantor"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label
                  htmlFor="recipient_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nama Penerima
                </label>
                <input
                  type="text"
                  id="recipient_name"
                  name="recipient_name"
                  value={formData.recipient_name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label
                  htmlFor="recipient_phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  id="recipient_phone"
                  name="recipient_phone"
                  value={formData.recipient_phone}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="relative">
                <label
                  htmlFor="area-search"
                  className="block text-sm font-medium text-gray-700"
                >
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {isDropdownOpen &&
                  (searchResults.length > 0 || isSearching) && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5">
                      {isSearching && (
                        <div className="p-2 text-gray-500">Mencari...</div>
                      )}
                      {searchResults.map((area) => (
                        <div
                          key={area.id}
                          onMouseDown={() => handleAreaSelect(area)}
                          className="cursor-pointer p-2 hover:bg-orange-100"
                        >
                          <div className="font-semibold text-gray-800">{area.name}</div>
                          <div className="text-xs text-gray-500">
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
                            <div className="text-xs text-gray-400">Kode pos: {area.postalCode}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              <div>
                <label
                  htmlFor="full_address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Alamat Lengkap
                </label>
                <textarea
                  id="full_address"
                  name="full_address"
                  value={formData.full_address}
                  onChange={handleChange}
                  rows={3}
                  required
                  placeholder="Nama jalan, nomor rumah, RT/RW"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                ></textarea>
              </div>
              <div>
                <label
                  htmlFor="postal_code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Kode Pos
                </label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pilih Lokasi di Map
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Klik atau seret marker untuk menentukan koordinat alamat.
                </p>
                <MapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onSelect={handleMapSelect}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="latitude"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Latitude
                  </label>
                  <input
                    type="text"
                    id="latitude"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    placeholder="-6.2..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="longitude"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Longitude
                  </label>
                  <input
                    type="text"
                    id="longitude"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    placeholder="106.8..."
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleGeocode}
                disabled={isGeocoding}
                className="text-sm text-orange-600 hover:underline disabled:opacity-50"
              >
                {isGeocoding ? "Mencari..." : "Cari Koordinat Otomatis (GoSend)"}
              </button>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg items-center">
            {errorMessage && (
              <p className="text-red-500 text-sm mr-auto">{errorMessage}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-orange-500 text-white font-bold px-4 py-2 rounded-md hover:bg-orange-600 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Menyimpan..." : "Simpan Alamat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
