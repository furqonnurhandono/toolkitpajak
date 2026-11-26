# Toolkit Pajak

Aplikasi web untuk membaca cepat undang-undang perpajakan Indonesia di HP: susunan dalam satu naskah UU KUP, PPh, PPN, PBB, Bea Meterai, dan PPSP, persandingan perubahan oleh UU Cipta Kerja dan UU HPP, pencarian pasal, dan alat hitung sederhana. Bisa dipasang di HP dan dibaca tanpa internet.

**Buka aplikasinya:** https://furqonnurhandono.github.io/toolkitpajak/

Toolkit Pajak bukan aplikasi resmi dan tidak mewakili Direktorat Jenderal Pajak, Kementerian Keuangan, atau instansi pemerintah mana pun. Untuk keperluan hukum, rujuk naskah resmi peraturan.

## Add-in Word & Excel

Naskah UU yang sama bisa dibuka di panel samping Word dan Excel. Blok teks pasal, pilih pola kalimat, lalu klik **Sisipkan**: kutipan masuk ke posisi kursor di Word atau ke sel aktif di Excel, sekaligus tersalin ke clipboard. Rujukan "Pasal x Ayat (y) huruf z" dihitung otomatis dari teks yang diblok. Fitur kutip ini hanya ada di add-in. Aplikasi di HP tetap untuk membaca cepat.

Pola kalimat:

| Pola | Hasil |
|---|---|
| A Rujukan | Pasal 4 Ayat (1) UU PPh |
| B Berdasarkan | Berdasarkan Pasal 4 Ayat (1) UU PPh, |
| C Sebagaimana | sebagaimana diatur dalam Pasal 9 Ayat (8) huruf f j.o. Pasal 13 Ayat (9) UU PPN |
| D Kutip | Pasal 18 Ayat (1) UU PPh mengatur bahwa "…" |
| E Blok | Pasal 9 UU PPN mengatur hal-hal sebagai berikut : lalu (4) …, (4a) …, (4b) … |
| F Per UU | UU KUP mengatur hal-hal sebagai berikut : a. Pasal 8 Ayat (1) …, b. Pasal 17B Ayat (1) … |

Untuk mengutip beberapa pasal sekaligus, blok satu bagian lalu klik **+ Keranjang**, ulangi untuk bagian lain, lalu klik **Sisipkan isi keranjang**. Pasal dari UU yang sama digabung otomatis. Bagian yang diblok tidak utuh diberi tanda "…". Kalimat pengantar, penulisan "Ayat"/"ayat", "j.o.", dan bentuk nama UU (singkat, sedang, lengkap) bisa diubah di ⚙ Pengaturan.

**Memasang.** Unduh [addin/manifest.xml](addin/manifest.xml) (klik Raw, lalu simpan), kemudian:

- **Word/Excel di web (office.com):** buka dokumen, klik **Add-in** di tab Beranda (Home), pilih **Add-in Lainnya** → **Add-in Saya** → **Unggah Add-in Saya**, lalu pilih `manifest.xml`.
- **Word/Excel desktop Windows (paling mudah):** buka https://furqonnurhandono.github.io/toolkitpajak/addin/pasang.html, klik **Unduh pemasang**, klik dua kali file yang terunduh, lalu tutup dan buka lagi Word/Excel. Tidak perlu hak admin; file ini mengunduh `manifest.xml` dan mendaftarkannya untuk pengguna yang sedang masuk. Bila muncul peringatan "Windows protected your PC", klik **More info → Run anyway**. Untuk melepas: [addin/lepas-windows.cmd](addin/lepas-windows.cmd).
- **Word/Excel desktop Windows, lewat folder bersama:** taruh `manifest.xml` di sebuah folder, bagikan folder itu (klik kanan → Properties → Sharing), lalu salin alamat jaringannya (mis. `\\NAMA-PC\addin`). Di Word buka **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs**, isi Catalog Url dengan alamat tadi, klik **Add catalog**, centang **Show in Menu**, lalu tutup dan buka ulang Word. Pasang lewat **Insert → Get Add-ins (My Add-ins) → Shared Folder → Toolkit Pajak**. Langkah yang sama berlaku di Excel.
- **Mac:** salin `manifest.xml` ke `~/Library/Containers/com.microsoft.Word/Data/Documents/wef` (untuk Excel: `com.microsoft.Excel`). Buat folder `wef` bila belum ada, lalu buka ulang aplikasinya.

Setelah terpasang, tombol **Kutip UU** muncul di tab Home. Perlu Microsoft 365 atau Office 2019 ke atas. Di laptop kantor, kebijakan TIK bisa memblokir add-in pihak ketiga.

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
