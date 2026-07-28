https://biteship.com/id/docs/getting-started

https://biteship.com/id/docs/plan_integration/project-timeline

https://biteship.com/id/docs/plan_integration/planning-considerations

https://biteship.com/id/docs/sandbox

https://biteship.com/id/docs/api/authentication

https://biteship.com/id/docs/api/usage_flow

Berikut adalah rangkuman dari diagram alur (flowchart) integrasi API Biteship berdasarkan gambar yang terlampir:
### **Rangkuman Alur Integrasi API Biteship**
Diagram ini menjelaskan tahapan dan API yang digunakan dalam proses pengiriman (shipment) menggunakan Biteship, mulai dari konfigurasi awal hingga barang dikirim.
### **1. API Configuration (Konfigurasi Awal)**
 * **Langkah:** Generate API Key.
 * **Penjelasan:** Pengguna perlu membuat akun Biteship terlebih dahulu dan menghasilkan *API Key* untuk mulai menggunakan layanan Biteship.
### **2. Pre-Purchase (Sebelum Pembelian / Halaman Checkout)**
Tahap ini dilakukan di halaman *checkout* sebelum pelanggan melakukan pembayaran, guna menghitung dan menampilkan opsi pengiriman serta tarif kurir.
 * **Maps API:** Digunakan untuk mendapatkan cakupan area kurir berdasarkan alamat pelanggan (Biteship menyediakan *Area ID* untuk validasi alamat, bisa menggunakan Google Maps atau Kode Pos).
 * **Courier API:** Digunakan untuk mendapatkan daftar kurir yang tersedia beserta jenis layanannya.
 * **Rates API:** Digunakan untuk mengambil daftar ongkos kirim/tarif dari masing-masing kurir.
### **3. Purchase (Pembelian & Pembayaran)**
 * **Langkah:** Payment (Pembayaran).
 * **Penjelasan:** Pelanggan melakukan pembayaran berdasarkan *payment gateway* pilihan Anda. **Biteship tidak menyediakan API pada tahap ini**.
### **4. Post-Purchase (Setelah Pembelian & Pengiriman)**
Tahap untuk mengelola pesanan, membuat dokumen pengiriman (resi), dan memantau status paket.
 * **Draft Order API:** Digunakan untuk menyimpan data pesanan sebelum mendapatkan nomor resi (*waybill number*).
 * **Order API:** Digunakan untuk membuat/membuatkan nomor resi (*waybill*) dan melacak pengiriman.
 * **Tracking API:** Digunakan untuk memantau pengiriman yang dibuat di luar ekosistem Biteship (jika tidak menggunakan Order API Biteship).
### **Akhir Alur:**
 * **Shipment Done:** Seluruh proses pengiriman selesai.

Berdasarkan dokumentasi resmi dan daftar harga dari Biteship, biaya penggunaan API Biteship dihitung berdasarkan model **Pay-per-hit (biaya per panggilan API/request)**.
Berikut adalah rincian estimasi biaya untuk setiap tahapan alur di atas:
### **1. API Configuration**
 * **Generate API Key:** **Gratis (Rp 0)**
   * Pendaftaran akun dan pembuatan *API Key* di Biteship tidak dikenakan biaya.
### **2. Pre-Purchase (Sebelum Pembelian)**
 * **Maps API / Area API:** **Rp 2** per hit
   * Digunakan untuk pencarian dan validasi lokasi/kode pos pelanggan.
 * **Courier API & Rates API:** **Rp 5** per hit
   * Digunakan untuk memeriksa ketersediaan kurir dan mengecek harga/ongkos kirim.
### **3. Purchase (Pembayaran)**
 * **Payment:** **Biteship tidak memungut biaya** untuk tahap ini karena Biteship tidak menyediakan layanan *payment gateway*. Biaya transaksi pembayaran tergantung pada penyedia *Payment Gateway* yang Anda gunakan.
### **4. Post-Purchase (Setelah Pembelian)**
 * **Draft Order API & Order API:** **Gratis (Rp 0)** per hit
   * Membuat pesanan dan menghasilkan nomor resi (*waybill*) tidak dikenakan biaya transaksi API.
 * **Tracking API:** **Rp 10** per hit
   * Digunakan untuk melacak status paket dari kurir.
### **Total Estimasi Biaya API per 1 Siklus Transaksi**
Jika dalam 1 alur transaksi lengkap Anda memanggil setiap API sebanyak **1 kali**:
> **Catatan Tambahan:**
>  1. **Biaya Fisik Pengiriman (Ongkir):** Biaya di atas hanya untuk penggunaan **sistem API**. Biaya riil pengiriman paket (*ongkos kirim kurir*) tetap ditagihkan sesuai tarif ekspedisi yang dipilih.
>  2. **Deposit / Top Up:** Sistem layanan API Biteship umumnya menggunakan saldo deposit yang dipotong sesuai jumlah panggil (*hit*) API yang Anda lakukan.
> 

https://biteship.com/id/docs/api/base_url

https://biteship.com/id/docs/api/issue_key

https://biteship.com/id/docs/api/maps/overview

https://biteship.com/id/docs/api/maps/search_area

https://biteship.com/id/docs/api/rates/overview

https://biteship.com/id/docs/api/rates/retrieve

https://biteship.com/id/docs/api/rates/error

https://biteship.com/id/docs/api/rates/error

https://biteship.com/id/docs/api/locations/create

https://biteship.com/id/docs/api/locations/create

https://biteship.com/id/docs/api/locations/update

https://biteship.com/id/docs/api/locations/delete

https://biteship.com/id/docs/api/draft_orders/overview

https://biteship.com/id/docs/api/draft_orders/create

https://biteship.com/id/docs/api/draft_orders/retrieve

https://biteship.com/id/docs/api/draft_orders/retrieve_rates

https://biteship.com/id/docs/api/draft_orders/update

https://biteship.com/id/docs/api/draft_orders/delete

https://biteship.com/id/docs/api/draft_orders/confirm

https://biteship.com/id/docs/api/draft_orders/error

https://biteship.com/id/docs/api/orders/overview

https://biteship.com/id/docs/api/orders/create

https://biteship.com/id/docs/api/orders/retrieve

https://biteship.com/id/docs/api/orders/retrieve

https://biteship.com/id/docs/api/orders/error

https://biteship.com/id/docs/api/couriers/overview

https://biteship.com/id/docs/api/couriers/retrieve

https://biteship.com/id/docs/api/trackings/overview

https://biteship.com/id/docs/api/trackings/retrieve

https://biteship.com/id/docs/api/trackings/status

https://biteship.com/id/docs/api/trackings/error

https://biteship.com/id/docs/api/trackings/error

https://biteship.com/id/docs/api/trackings/error

https://biteship.com/id/docs/api/webhook/play_webhook

https://biteship.com/id/docs/api/changelog

https://biteship.com/id/docs/shipping_label

https://biteship.com/id/docs/errors

https://biteship.com/id/docs/support

PILIHAN KURIR YANG SAYA PAKAI ADALAH:
GOJEK, POS INDONESIA, J&T, J&T CARGO, JNE (sesuaikan kebutuhan intregasi apa saja yang diperlukan untuk aplikasi kita ke biteship)