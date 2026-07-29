**Tujuan:** AI Agent bertugas untuk menghasilkan/mendesain layout *shipping label* yang sesuai dengan standar integrasi Biteship berdasarkan komponen-komponen wajib dan opsional yang ditentukan.
### 🟢 1. Header (Identitas & Logo)
 * **Logo Kurir/Ekspedisi (Wajib):**
   * Menyantumkan logo kurir/3PL yang digunakan (misal: SAP Express, J&T, Sicepat, dll).
   * **Tujuan:** Menghindari kesalahan *handover* paket dengan ekspedisi/3PL lain saat penyerahan barang.
 * **Logo Perusahaan / Toko (Opsional):**
   * Logo platform / toko online Anda (contoh pada sampel: Biteship).
### 🟢 2. Barcode & Nomor AWB / Resi
 * **Barcode AWB (Wajib):**
   * Ditampilkan dalam bentuk **Barcode** yang dapat di-scan.
   * **Tujuan:** Untuk proses scan otomatis dalam mengidentifikasi AWB di *hub* 3PL / kurir.
 * **Nomor Resi / AWB Teks (Wajib):**
   * Teks nomor resi/AWB dari 3PL yang digunakan (contoh format: Nomor Resi - BTS100000106996).
### 🟢 3. Detail Pembayaran & Layanan
 * **Nilai COD (Wajib jika metode COD):**
   * Menampilkan jumlah nominal pembayaran COD yang harus ditagihkan (contoh: Nilai COD: Rp. 259,000).
   * **Tujuan:** Menjadi acuan kurir untuk menagih pembayaran ke penerima saat pengantaran.
 * **Jenis Layanan (Wajib):**
   * Informasi jenis layanan pengiriman yang digunakan (contoh: Jenis Layanan - REG, Instant, Same Day, Next Day, Cargo).
   * **Tujuan:** Mempermudah 3PL melakukan pengiriman sesuai *Service Level Agreement* (SLA) layanan yang dipilih.
### 🟢 4. Routing & Detail Barang
 * **Routing Code / RC (Wajib):**
   * Kode area / sortir tujuan dari pihak ekspedisi (contoh: SUB - WTS).
   * **Tujuan:** Mempercepat proses pemilahan/sorting paket di *hub* ekspedisi.
 * **Kuantitas & Berat Paket (Wajib):**
   * **Quantity:** Jumlah fisik barang (contoh: 1 Pcs).
   * **Weight:** Berat paket dalam kg (contoh: 0.5 Kg).
   * **Tujuan:** Mengetahui dan mencocokkan berat serta kuantitas fisik barang.
### 🟢 5. Informasi Alamat (Pengirim & Penerima)
 * **Alamat Penerima & Alamat Pengirim (Wajib):**
   * Kolom dibagi menjadi dua sisi: **Alamat Penerima** (kiri) dan **Alamat Pengirim** (kanan).
   * **Aturan Pengisian:** Harus diisi dengan jelas dan lengkap, mencakup:
     1. Nama Lengkap (Penerima & Pengirim)
     2. Nomor Telepon / HP
     3. Alamat Lengkap (Nama jalan, nomor rumah/bangunan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten)
     4. Kode Pos
### 🟢 6. Deskripsi Barang & Catatan Tambahan
 * **Jenis Barang / Deskripsi Produk (Wajib):**
   * Memberikan deskripsi rinci/nama barang yang ada di dalam paket.
   * **Tujuan:** Memberikan gambaran cara *handling* (penanganan) paket selama proses transit/pengiriman.
 * **Catatan / Special Instruction (Wajib/Opsional):**
   * Catatan khusus untuk pihak 3PL/kurir (contoh: Fragile, Packing Kayu, Jangan Dibanting, Tidak Ada).
   * **Tujuan:** Memberikan instruksi penanganan ekstra dari penjual ke kurir.
### 🟢 7. Footer
 * **Informasi Platform (Wajib/Saran):**
   * Teks identifikasi pembuatan label (contoh: Pengiriman melalui platform Biteship - [www.biteship.com](https://www.biteship.com)).
### 📐 Aturan Layout & Hirarki Visual untuk AI Generator
 1. **Urutan Atas ke Bawah:** Logo Header ➔ Barcode AWB ➔ Resi Teks ➔ Nilai COD ➔ Jenis Layanan ➔ [Routing Code | Qty & Weight] ➔ [Alamat Penerima | Alamat Pengirim] ➔ Jenis Barang ➔ Catatan ➔ Footer.
 2. **Kejelasan Barcode:** Barcode harus memiliki kontras tinggi (Hitam di atas latar putih) dan resolusi cukup agar mudah di-scan oleh pemindai optik ekspedisi.
 3. **Batas Kolom:** Gunakan garis batas (*border*) yang tegas antar seksi untuk memisahkan informasi agar tidak membingungkan kurir.
