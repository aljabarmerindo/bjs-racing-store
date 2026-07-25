// File: src/pages/api/addresses.ts
import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/lib/supabaseServer.ts";

async function getCustomerId(session: import("@supabase/supabase-js").Session) {
  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .single();

  if (error || !customer) {
    throw new Error("Profil pelanggan tidak ditemukan.");
  }
  return customer.id;
}

// =================================================================
// == FUNGSI GET (MENGAMBIL SEMUA ALAMAT PENGGUNA)                  ==
// =================================================================
export const GET: APIRoute = async ({ locals }) => {
  const { session } = locals;
  if (!session)
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });

  try {
    const customerId = await getCustomerId(session);
    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    // --- PERBAIKAN DI SINI ---
    let errorMessage = "Terjadi kesalahan tidak dikenal.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error di GET /api/addresses:", error);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
    });
  }
};

// =================================================================
// == FUNGSI POST (MENYIMPAN ALAMAT BARU)                           ==
// =================================================================
export const POST: APIRoute = async ({ request, locals }) => {
  const { session } = locals;
  if (!session)
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });

  try {
    const customerId = await getCustomerId(session);
    const formData = await request.json();

    const { customer_id, auth_user_id, ...safeFormData } = formData || {};

    const { data: newAddress, error } = await supabaseAdmin
      .from("customer_addresses")
      .insert({
        customer_id: customerId,
        auth_user_id: session.user.id,
        ...safeFormData,
      })
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(newAddress), { status: 201 });
  } catch (error) {
    // --- PERBAIKAN DI SINI ---
    let errorMessage = "Terjadi kesalahan tidak dikenal.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error di POST /api/addresses:", error);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
    });
  }
};

// =================================================================
// == FUNGSI PUT (MENGUBAH ALAMAT)                                  ==
// =================================================================
export const PUT: APIRoute = async ({ request, locals }) => {
  const { session } = locals;
  if (!session)
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });

  try {
    const customerId = await getCustomerId(session);
    const { id: addressId, customer_id, auth_user_id, ...safeUpdateData } = await request.json();

    if (!addressId) throw new Error("ID Alamat diperlukan.");

    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .update(safeUpdateData)
      .eq("id", addressId)
      .eq("customer_id", customerId)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    // --- PERBAIKAN DI SINI ---
    let errorMessage = "Terjadi kesalahan tidak dikenal.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error di PUT /api/addresses:", error);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
    });
  }
};

// =================================================================
// == FUNGSI DELETE (MENGHAPUS ALAMAT)                              ==
// =================================================================
export const DELETE: APIRoute = async ({ request, locals }) => {
  const { session } = locals;
  if (!session)
    return new Response(JSON.stringify({ message: "Tidak diizinkan" }), {
      status: 401,
    });

  try {
    const customerId = await getCustomerId(session);
    const { addressId } = await request.json();

    if (!addressId) throw new Error("ID Alamat diperlukan.");

    const { error } = await supabaseAdmin
      .from("customer_addresses")
      .delete()
      .eq("id", addressId)
      .eq("customer_id", customerId);

    if (error) throw error;
    return new Response(
      JSON.stringify({ message: "Alamat berhasil dihapus" }),
      { status: 200 },
    );
  } catch (error) {
    // --- PERBAIKAN DI SINI ---
    let errorMessage = "Terjadi kesalahan tidak dikenal.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error di DELETE /api/addresses:", error);
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: 500,
    });
  }
};
