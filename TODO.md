# TODO - Perbaikan Barcode Shipping Label

## Steps
- [x] Analisa masalah barcode tidak muncul di shipping label
- [x] Edit `src/components/ShippingLabel.tsx`:
  - [x] Ubah import `bwip-js` menjadi `bwip-js/browser`
  - [x] Ganti `BWIPJS.render()` dengan `bwipjs.toCanvas()`
- [x] Verifikasi build dengan `npm run build`
- [ ] Test visual pada halaman detail pesanan
