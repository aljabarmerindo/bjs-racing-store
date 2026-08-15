// File: src/components/CourierApp.tsx
// Aplikasi kurir BJS Express — daftar penugasan.
import React, { useEffect, useState } from "react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  assigned: { label: "Ditunggu ambil", color: "bg-blue-100 text-blue-800" },
  picked: { label: "Barang diambil", color: "bg-indigo-100 text-indigo-800" },
  in_transit: { label: "Dalam perjalanan", color: "bg-purple-100 text-purple-800" },
  dropping_off: { label: "Sampai lokasi", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-800" },
};

const formatRupiah = (n?: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const formatWaktu = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

interface Assignment {
  assignment_id: string;
  status: string;
  assigned_at?: string;
  completed_at?: string;
  order_number?: string;
  order_status?: string;
  total_amount?: number;
  customer?: { nama_pelanggan?: string; telepon?: string } | null;
  address?: { full_address?: string; recipient_name?: string; recipient_phone?: string } | null;
}

const CourierApp = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await fetch("/api/kurir/assignments", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memuat penugasan");
      setAssignments(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Gagal memuat penugasan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  const activeCount = assignments.filter((a) => a.status !== "completed" && a.status !== "cancelled").length;
  const completedCount = assignments.filter((a) => a.status === "completed").length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Penugasan Hari Ini</h1>
        <button
          onClick={load}
          className="bg-slate-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
        >
          Muat Ulang
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">Aktif</p>
          <p className="text-2xl font-bold text-orange-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">Selesai</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {error && (
        <p className="bg-red-50 text-red-700 p-4 rounded-xl mb-4 text-sm">{error}</p>
      )}

      {loading ? (
        <p className="text-center text-slate-500 py-12">Memuat penugasan...</p>
      ) : assignments.length === 0 ? (
        <p className="text-center text-slate-500 py-12 bg-white rounded-xl shadow-sm">
          Belum ada penugasan.
        </p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const meta = STATUS_META[a.status] || STATUS_META.assigned;
            const customer = a.customer;
            const addr = a.address;
            return (
              <a
                key={a.assignment_id}
                href={`/kurir/${a.assignment_id}`}
                className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{a.order_number}</p>
                    <p className="text-xs text-slate-500">
                      {formatWaktu(a.assigned_at)}
                      {a.completed_at ? ` • selesai ${formatWaktu(a.completed_at)}` : ""}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <p className="font-medium">{customer?.nama_pelanggan || "Pelanggan"}</p>
                  <p className="text-xs text-slate-500">
                    {customer?.telepon || ""}
                    {addr?.recipient_phone && addr.recipient_phone !== customer?.telepon
                      ? ` • ${addr.recipient_phone}`
                      : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {addr?.full_address || "-"}
                  </p>
                </div>
                <div className="mt-2 text-right text-sm font-bold text-slate-800">
                  {formatRupiah(a.total_amount)}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourierApp;
