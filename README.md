# Toolkit Pajak

Aplikasi web untuk membaca cepat undang-undang perpajakan Indonesia di HP: susunan dalam satu naskah UU KUP, PPh, PPN, PBB, Bea Meterai, dan PPSP, persandingan perubahan oleh UU Cipta Kerja dan UU HPP, pencarian pasal, dan alat hitung sederhana. Bisa dipasang di HP dan dibaca tanpa internet.

**Buka aplikasinya:** https://furqonnurhandono.github.io/toolkitpajak/

Toolkit Pajak bukan aplikasi resmi dan tidak mewakili Direktorat Jenderal Pajak, Kementerian Keuangan, atau instansi pemerintah mana pun. Untuk keperluan hukum, rujuk naskah resmi peraturan.

## Ikut mengembangkan

Bantuan apa pun sangat berarti, terutama dari yang paham substansi pajak. Tidak harus bisa coding.

### Melaporkan kesalahan atau pasal yang belum mutakhir

1. Buka tab **Issues** di repository ini, lalu **New issue**.
2. Tuliskan UU dan pasalnya (misalnya *UU KUP Pasal 13 ayat (2)*), apa yang keliru, dan dasar hukum yang benar beserta tautannya bila ada (JDIH BPK, JDIH Kemenkeu, atau pajak.go.id).
3. Klik **Submit new issue**. Perlu akun GitHub (gratis).

### Mengusulkan perubahan langsung

1. Buka berkas yang ingin diubah, misalnya `uu/kup.html`, lalu klik ikon pensil (**Edit this file**).
2. Ubah isinya. Setiap pasal ditulis dengan pola berikut:

   ```html
   <details class="pasal" id="pasal-2">
     <summary><span class="kata">Pasal</span> <span class="no">2</span></summary>
     <div class="isi">
       <p>(1) Bunyi ayat … <span class="ubah" title="Perubahan Keenam (UU Nomor 7 Tahun 2021)">******)</span></p>
       <details class="penjelasan"><summary>Penjelasan</summary><div class="isi"><p>…</p></div></details>
     </div>
   </details>
   ```

3. Di bawah, tulis ringkasan perubahan, pilih **Create a new branch … and start a pull request**, lalu **Propose changes**. Pengelola akan memeriksa sebelum perubahan tayang.

### Pekerjaan yang masih terbuka

- Persandingan per pasal UU KUP (28 halaman) belum ada.
- Resume batas waktu masih mengacu PMK-243/PMK.03/2014, yang telah dicabut PMK 81 Tahun 2024.
- Kalkulator PPh Pasal 21 skema TER (PP 58/2023 dan PMK 168/2023) belum dibuat.
- Perubahan undang-undang setelah UU HPP belum dimasukkan.
- Lisensi gambar ikon (`icons/`) perlu dipastikan.

## Untuk pengelola

### Isi repository

| Letak | Isi |
|---|---|
| `index.html`, `cari.html`, `tentang.html`, `privasi.html` | Beranda, pencarian, tentang, kebijakan privasi |
| `uu/` | Naskah enam UU |
| `persandingan/` | Matriks dan halaman persandingan per pasal |
| `resume/` | Resume batas waktu dan PTKP |
| `alat/` | Kalkulator PTKP dan Pasal 31E |
| `assets/` | Tampilan (`css/`), perilaku (`js/`), huruf (`fonts/`), indeks pencarian (`data/cari.json`) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Bagian yang membuat aplikasi bisa dipasang dan dibaca offline |
| `tools/` | Skrip perawatan (tidak ikut tersimpan di HP pengguna) |

### Setelah mengubah atau menambah halaman

```
pip install beautifulsoup4
python3 tools/perbarui.py
```

Skrip ini membangun ulang indeks pencarian (`assets/data/cari.json`) dan memperbarui daftar berkas offline serta nomor versi di `sw.js`. Commit hasilnya bersama halaman yang diubah. HP pengguna mengambil versi baru saat aplikasi dibuka berikutnya.

`tools/konversi-dari-apk.py` hanya arsip: skrip sekali pakai yang dulu mengubah halaman APK lama menjadi aplikasi ini.

### Penerbitan

Situs diterbitkan otomatis oleh GitHub Pages dari branch `main`, folder `/` (root). Perubahan yang masuk ke `main` tayang dalam beberapa menit.
