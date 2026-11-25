# Toolkit Pajak (PWA) — panduan singkat

Folder ini adalah aplikasi web lengkap. Tidak perlu server khusus: cukup diunggah ke hosting statis gratis.

## Menerbitkan di GitHub Pages (sekali saja)

1. Buat akun di github.com.
2. Buat repository baru, misalnya `toolkitpajak`, pilih **Public**.
3. Di repository itu pilih **Add file → Upload files**, lalu seret **isi** folder ini (bukan foldernya) ke halaman unggah. Klik **Commit changes**.
4. Buka **Settings → Pages**. Pada *Source* pilih **Deploy from a branch**, branch **main**, folder **/ (root)**, lalu **Save**.
5. Tunggu 1–2 menit. Alamatnya: `https://NAMA-AKUN.github.io/toolkitpajak/`
6. Buka alamat itu di HP dengan Chrome, lalu ketuk **Pasang di HP** (atau menu ⋮ → *Tambahkan ke layar utama*).

## Mengubah isi

- Setiap halaman adalah HTML biasa: `uu/` (naskah UU), `persandingan/`, `resume/`, `alat/`, serta `index.html`, `tentang.html`, `privasi.html`.
- Edit berkasnya, lalu unggah ulang ke GitHub. Pengguna mendapat versi baru saat membuka aplikasi berikutnya (aplikasi memperbarui dirinya di latar belakang).
- **Halaman baru**: tambahkan juga nama berkasnya ke daftar `DAFTAR` di `sw.js` agar ikut tersimpan untuk dibaca offline.
- **Pencarian**: indeksnya ada di `assets/data/cari.json`. Bila isi pasal diubah banyak, minta indeks dibangun ulang.
- Gaya tampilan ada di `assets/css/app.css`; perilaku (saring, lompat pasal, pasang aplikasi) di `assets/js/app.js`.

## Struktur pasal

```html
<details class="pasal" id="pasal-2">
  <summary><span class="kata">Pasal</span> <span class="no">2</span></summary>
  <div class="isi">
    <p>(1) Bunyi ayat …</p>
    <details class="penjelasan"><summary>Penjelasan</summary><div class="isi"><p>…</p></div></details>
  </div>
</details>
```

## Yang masih perlu dikerjakan

- Persandingan per pasal UU KUP (28 halaman) belum ada.
- Resume batas waktu masih mengacu PMK-243/2014 (sudah dicabut PMK 81/2024).
- Kalkulator PPh 21 (skema TER) belum dibuat.
- Pastikan lisensi gambar ikon (`icons/`) mengizinkan dipakai tanpa atau dengan atribusi.
