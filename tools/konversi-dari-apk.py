# ARSIP — skrip sekali pakai yang dulu mengubah 33 halaman HTML dari APK App Inventor
# (ToolKitPajak.apk versi 4.0) menjadi PWA ini. Tidak perlu dijalankan lagi:
# sekarang halaman di repository inilah sumbernya. Untuk perawatan rutin pakai tools/perbarui.py.
#
#!/usr/bin/env python3
"""Bangun PWA Toolkit Pajak dari halaman HTML lama (APK App Inventor).

Pemakaian: python3 -I build.py <folder_assets_lama> <folder_src> <folder_keluaran>
"""
import sys, os, re, json, shutil, hashlib, html
from bs4 import BeautifulSoup, Comment, NavigableString, Tag

LAMA, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
VERSI_APP = "2.0"

UU = [
    ("kup", "KUP", "Ketentuan Umum dan Tata Cara Perpajakan"),
    ("pph", "PPh", "Pajak Penghasilan"),
    ("ppn", "PPN", "Pajak Pertambahan Nilai Barang dan Jasa dan Pajak Penjualan atas Barang Mewah"),
    ("pbb", "PBB", "Pajak Bumi dan Bangunan"),
    ("bm", "BM", "Bea Meterai"),
    ("ppsp", "PPSP", "Penagihan Pajak dengan Surat Paksa"),
]

ATRIBUT_BOLEH = {"ol": {"type", "start"}, "td": {"colspan", "rowspan"}, "th": {"colspan", "rowspan"}, "a": {"href"}, "li": {"value"}}

indeks = []  # entri pencarian


def esc(s):
    return html.escape(s, quote=True)


def slug(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "bagian"


def teks(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()


# ---------------------------------------------------------------- halaman

def halaman(judul, isi, akar, judul_bar="", kepala="", skrip="", kelas=""):
    return f"""<!DOCTYPE html>
<html lang="id" data-akar="{akar}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(judul)}</title>
<meta name="description" content="Naskah UU perpajakan Indonesia, persandingan perubahan, dan alat hitung. Bukan aplikasi resmi pemerintah.">
<meta name="theme-color" content="#0e6b4c">
<link rel="manifest" href="{akar}manifest.webmanifest">
<link rel="icon" href="{akar}icons/icon-192.png">
<link rel="apple-touch-icon" href="{akar}icons/apple-touch-icon.png">
<link rel="preload" href="{akar}assets/fonts/literata-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{akar}assets/css/app.css">
{kepala}</head>
<body class="{kelas}">
<a class="sr" href="#isi">Langsung ke isi</a>
<header class="bar">
  <a class="bar-home" href="{akar}index.html"><img src="{akar}icons/icon-192.png" alt=""><span>Toolkit Pajak</span></a>
  <span class="bar-judul">{esc(judul_bar)}</span>
  <a class="bar-cari" href="{akar}cari.html">Cari</a>
</header>
<main id="isi">
{isi}
</main>
<button class="ke-atas" type="button" hidden aria-label="Kembali ke atas">↑</button>
<script src="{akar}assets/js/app.js"></script>
{skrip}</body>
</html>
"""


def tulis(rel, isi):
    p = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(isi)


def muat(nama):
    with open(os.path.join(LAMA, nama), encoding="utf-8", errors="ignore") as f:
        return BeautifulSoup(f.read(), "lxml")


# ---------------------------------------------------------------- pembersihan isi

def bersihkan(el, peta_tautan, legenda):
    """Bersihkan atribut, bungkus tabel, beri penanda perubahan (bintang)."""
    for c in el.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for t in el.find_all(True):
        boleh = ATRIBUT_BOLEH.get(t.name, set())
        for a in list(t.attrs):
            if a == "class" and t.name in ("details", "div") and set(t.get("class") or []) <= {"penjelasan", "isi", "tabel", "sanding"}:
                continue
            if a not in boleh:
                del t.attrs[a]
        if t.name in ("font", "span", "u", "center"):
            if t.name == "u":
                continue
            t.unwrap()
    for a in el.find_all("a"):
        href = a.get("href", "")
        m = re.search(r"localhost[/\\]+([A-Za-z0-9]+)\.html", href)
        if m:
            tujuan = peta_tautan.get(m.group(1))
            if tujuan:
                a["href"] = tujuan
            else:
                a.name = "span"
                a.attrs = {}
                a.append(" (belum tersedia)")
        elif href.startswith("#") or not href:
            a.unwrap()
    for tb in el.find_all("table"):
        if tb.parent and tb.parent.name == "div" and "tabel" in (tb.parent.get("class") or []):
            continue
        bungkus = BeautifulSoup("", "lxml").new_tag("div")
        kelas = ["tabel"]
        tr1 = tb.find("tr")
        if tr1 and len(tr1.find_all(["td", "th"])) == 3 and tb.find("th") and "Sebelum" in teks(tr1):
            kelas.append("sanding")
        bungkus["class"] = kelas
        tb.wrap(bungkus)
    # penanda perubahan *) … ******)
    for s in list(el.find_all(string=re.compile(r"\*+\)"))):
        if s.parent and s.parent.name in ("script", "style"):
            continue
        potong = re.split(r"(\*{1,7}\))", str(s))
        baru = []
        for bag in potong:
            if re.fullmatch(r"\*{1,7}\)", bag):
                ket = legenda.get(bag, "")
                sp = BeautifulSoup("", "lxml").new_tag("span")
                sp["class"] = "ubah"
                if ket:
                    sp["title"] = ket
                sp.string = bag
                baru.append(sp)
            elif bag:
                baru.append(NavigableString(bag))
        for b in baru:
            s.insert_before(b)
        s.extract()
    return el


def judul_panel(p):
    h = p.select_one(":scope > .panel-heading .panel-title") or p.select_one(".panel-title")
    return teks(h) if h else ""


def isi_panel(p):
    col = p.select_one(":scope > .panel-collapse")
    if not col:
        return None
    body = col.select_one(":scope > .panel-body") or col
    return body


def ubah_bersarang(body, tingkat):
    """Ganti accordion bersarang (Penjelasan, dsb.) dengan <details class="penjelasan">."""
    for grup in body.select(":scope .panel-group"):
        if not grup.parent:
            continue
    # proses dari dalam ke luar
    panels = body.find_all("div", class_="panel")
    for p in reversed(panels):
        j = judul_panel(p)
        b = isi_panel(p)
        d = BeautifulSoup("", "lxml").new_tag("details")
        d["class"] = ["penjelasan"]
        s = BeautifulSoup("", "lxml").new_tag("summary")
        s.string = j or "Penjelasan"
        d.append(s)
        div = BeautifulSoup("", "lxml").new_tag("div")
        div["class"] = ["isi"]
        if b is not None:
            for ch in list(b.children):
                div.append(ch.extract())
        d.append(div)
        p.replace_with(d)
    for g in body.find_all("div", class_="panel-group"):
        g.unwrap()
    return body


def legenda_dari(info_body):
    leg = {}
    if not info_body:
        return leg
    rows = info_body.find_all("tr")
    for r in rows:
        tds = [teks(td) for td in r.find_all("td")]
        tds = [t for t in tds if t and t != ":"]
        if len(tds) >= 2 and re.fullmatch(r"\*{1,7}\)", tds[0]):
            leg[tds[0]] = tds[1]
    if not leg:
        tx = info_body.get_text("\n", strip=True).split("\n")
        for i, line in enumerate(tx):
            if re.fullmatch(r"\*{1,7}\)", line.strip()):
                nxt = [x for x in tx[i + 1:i + 3] if x.strip() != ":"]
                if nxt:
                    leg[line.strip()] = nxt[0].strip()
    return leg


def histori(info_body):
    """Ambil judul UU asal (baris setelah 'Histori Pengaturan')."""
    if not info_body:
        return ""
    tx = [x.strip() for x in info_body.get_text("\n", strip=True).split("\n")]
    if "Histori Pengaturan" in tx:
        i = tx.index("Histori Pengaturan")
        return tx[i + 1] if i + 1 < len(tx) else ""
    return ""


def konversi_accordion(soup, kelas_blok, sumber_label, url_halaman, peta_tautan, legenda=None, jenis="uu"):
    """Kembalikan (html_isi, daftar_lompat, info_lanjut_body)."""
    acc = soup.find(id="accordion")
    tops = acc.find_all("div", class_="panel", recursive=False)
    keluar = []
    lompat = []
    dipakai = set()
    info = None
    legenda = legenda or {}
    for p in tops:
        j = judul_panel(p)
        b = isi_panel(p)
        if j == "Informasi Lanjutan":
            info = b
            continue
        if b is None:
            m = re.match(r"^(BAB\s+[IVXLC]+)\s*(.*)$", j)
            if m:
                hid = slug(m.group(1))
                keluar.append(f'<h2 class="bab" id="{hid}"><span class="no">{esc(m.group(1))}</span><span class="nama">{esc(m.group(2))}</span></h2>')
                lompat.append((hid, j if len(j) < 70 else j[:67] + "…", True))
            else:
                keluar.append(f'<h3 class="bagian">{esc(j)}</h3>')
            continue
        ubah_bersarang(b, 1)
        bersihkan(b, peta_tautan, legenda)
        hid = slug(j)
        while hid in dipakai:
            hid += "-2"
        dipakai.add(hid)
        inner = "".join(str(c) for c in b.contents).strip()
        mp = re.match(r"^Pasal\s+(.+)$", j)
        if mp and kelas_blok == "pasal":
            ringkas = f'<span class="kata">Pasal</span> <span class="no">{esc(mp.group(1))}</span>'
        else:
            ringkas = esc(j)
        keluar.append(f'<details class="{kelas_blok}" id="{hid}"><summary>{ringkas}</summary><div class="isi">{inner}</div></details>')
        lompat.append((hid, j, False))
        isi_teks = re.sub(r"\s+", " ", BeautifulSoup(inner, "lxml").get_text(" ")).strip()
        indeks.append({"u": f"{url_halaman}#{hid}", "s": sumber_label, "t": j, "x": isi_teks, "k": jenis})
    return "\n".join(keluar), lompat, info


def alat_baca(lompat, placeholder):
    opsi = "".join(
        f'<option value="{h}">{"— " if bab else ""}{esc(t)}</option>' for h, t, bab in lompat
    )
    sel = f'<label class="sr" for="lompat">Lompat ke</label><select id="lompat" class="kecil"><option value="">Lompat ke…</option>{opsi}</select>' if lompat else ""
    return f"""<div class="saring" role="search">
  <label class="sr" for="saring">{esc(placeholder)}</label>
  <input id="saring" type="search" placeholder="{esc(placeholder)}" autocomplete="off">
  <p class="hasil" aria-live="polite"></p>
</div>
<div class="perkakas">
  {sel}
  <button class="kecil" type="button" data-aksi="tutup">Tutup semua</button>
  <button class="kecil" type="button" data-aksi="kecil" aria-label="Perkecil huruf">A−</button>
  <button class="kecil" type="button" data-aksi="besar" aria-label="Perbesar huruf">A+</button>
</div>"""


# ---------------------------------------------------------------- persandingan

SANDING = {}
for f in sorted(os.listdir(LAMA)):
    m = re.match(r"^sanding(PPh|PPN)[Pp]s(\w+)\.html$", f)
    if m:
        uu = m.group(1)
        no = m.group(2).lstrip("0")
        SANDING[f[:-5]] = (uu, no, f"persandingan/{uu.lower()}-pasal-{no.lower()}.html")


def urut_pasal(no):
    m = re.match(r"(\d+)(\w*)", no)
    return (int(m.group(1)), m.group(2))


# ---------------------------------------------------------------- bangun

def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)

    # peta tautan dari akar (index.html); halaman di sub-folder memakai ../
    peta_akar = {"home": "index.html", "sandingHome": "persandingan/index.html",
                 "resumeBw": "resume/batas-waktu.html", "resumePtkp": "resume/ptkp.html"}
    for s, _, _ in UU:
        peta_akar[s] = f"uu/{s}.html"
    for k, (_, _, u) in SANDING.items():
        peta_akar[k] = u

    def peta_dari(folder):
        return {k: ("../" + v) for k, v in peta_akar.items()}

    statistik = {}

    # ---- naskah UU
    for s, singkat, panjang in UU:
        soup = muat(f"{s}.html")
        acc = soup.find(id="accordion")
        tops = acc.find_all("div", class_="panel", recursive=False)
        info_body = None
        for p in tops:
            if judul_panel(p) == "Informasi Lanjutan":
                info_body = isi_panel(p)
        legenda = legenda_dari(info_body)
        asal = histori(info_body)
        isi, lompat, info = konversi_accordion(soup, "pasal", f"UU {singkat}", f"uu/{s}.html", peta_dari("uu"), legenda)
        n_pasal = sum(1 for _, t, bab in lompat if not bab and t.startswith("Pasal"))
        statistik[s] = n_pasal
        dasar = ""
        if legenda:
            terakhir = list(legenda.values())[-1]
            dasar = f"Susunan dalam satu naskah: {esc(asal)}, terakhir diubah dengan {esc(terakhir)}."
        elif asal:
            dasar = f"Susunan dalam satu naskah: {esc(asal)}."
        leg_html = ""
        if legenda:
            leg_html = '<details class="legenda"><summary>Arti tanda bintang pada naskah</summary><dl>' + "".join(
                f"<dt>{esc(k)}</dt><dd>{esc(v)}</dd>" for k, v in legenda.items()) + "</dl></details>"
        badan = f"""<h1 class="judul-uu"><span class="singkat">UU {esc(singkat)}</span><span class="panjang">{esc(panjang)}</span></h1>
<p class="dasar">{dasar} {n_pasal} pasal.</p>
{leg_html}
{alat_baca(lompat, "Saring pasal, mis. NPWP")}
{isi}
<section class="info-lanjut">
  <h2>Sumber naskah</h2>
  <p>Disusun dari Susunan Dalam Satu Naskah (SDSN) Direktorat P2Humas DJP dan berkas .chm Agus Kristiyanto. Untuk keperluan hukum, rujuk naskah resmi di <a href="https://peraturan.bpk.go.id" rel="noopener">JDIH BPK</a> atau <a href="https://www.pajak.go.id/id/peraturan" rel="noopener">pajak.go.id</a>.</p>
</section>"""
        tulis(f"uu/{s}.html", halaman(f"UU {singkat} — Toolkit Pajak", badan, "../", f"UU {singkat}"))

    # ---- persandingan per pasal
    for kunci, (uu, no, url) in SANDING.items():
        soup = muat(kunci + ".html")
        h = soup.find(["h2", "h3"])
        judul = teks(h) if h else f"Persandingan Pasal {no} UU {uu}"
        isi, lompat, _ = konversi_accordion(soup, "blok", f"Persandingan UU {uu}", url, peta_dari("persandingan"), jenis="sanding")
        for e in indeks:
            if e["u"].startswith(url + "#"):
                e["t"] = f"Pasal {no}: {e['t']}"
        badan = f"""<p class="dasar"><a href="index.html">Persandingan perubahan</a></p>
<h1>Pasal {esc(no)} UU {esc(uu)}</h1>
<p class="dasar">Perbandingan bunyi pasal sebelum perubahan, setelah UU Cipta Kerja, dan setelah UU HPP. Geser tabel ke samping untuk melihat semua kolom.</p>
{alat_baca([], "Saring isi halaman ini")}
{isi}"""
        tulis(url, halaman(f"{judul} — Toolkit Pajak", badan, "../", f"Persandingan {uu} Pasal {no}"))

    # ---- indeks persandingan
    soup = muat("sandingHome.html")
    isi, lompat, _ = konversi_accordion(soup, "blok", "Persandingan", "persandingan/index.html",
                                        {k: v.replace("persandingan/", "") if v.startswith("persandingan/") else "../" + v for k, v in peta_akar.items()},
                                        jenis="sanding")
    badan = f"""<h1>Persandingan perubahan</h1>
<p class="dasar">Pasal-pasal UU KUP, PPh, PPN, dan lainnya yang diubah oleh UU Cipta Kerja (UU 11/2020) dan UU Harmonisasi Peraturan Perpajakan (UU 7/2021). Ketuk nomor pasal untuk melihat perbandingan bunyinya.</p>
<div class="catatan"><strong>Belum lengkap.</strong> Halaman persandingan per pasal untuk UU KUP belum dibuat, sehingga tautannya belum bisa dibuka.</div>
{isi}"""
    # isi beranda persandingan tidak perlu masuk indeks (hanya daftar tautan)
    indeks[:] = [e for e in indeks if not e["u"].startswith("persandingan/index.html")]
    tulis("persandingan/index.html", halaman("Persandingan perubahan — Toolkit Pajak", badan, "../", "Persandingan"))

    # ---- resume
    catatan_bw = ('<div class="catatan"><strong>Perlu dimutakhirkan.</strong> Dasar hukum di halaman ini, PMK-243/PMK.03/2014 s.t.d.t.d. '
                  'PMK-9/PMK.03/2018 dan PMK terkait, telah dicabut dengan PMK 81 Tahun 2024 yang berlaku sejak 1 Januari 2025. '
                  'Periksa kembali setiap batas waktu sebelum dipakai.</div>')
    catatan_ptkp = ('<div class="catatan"><strong>Periksa tahun pajaknya.</strong> Besaran di sini mengikuti PMK-101/PMK.010/2016. '
                    'Pemerintah sedang membahas penyesuaian PTKP untuk 2027; perbarui halaman ini bila PMK baru terbit.</div>')
    for lama, baru, judul, cat in (("resumeBw", "resume/batas-waktu.html", "Batas waktu pelaporan dan pembayaran", catatan_bw),
                                   ("resumePtkp", "resume/ptkp.html", "Penghasilan Tidak Kena Pajak (PTKP)", catatan_ptkp)):
        soup = muat(lama + ".html")
        isi, lompat, _ = konversi_accordion(soup, "blok", "Resume", baru, peta_dari("resume"), jenis="resume")
        badan = f"""<h1>{esc(judul)}</h1>
{cat}
{alat_baca([], "Saring isi halaman ini")}
{isi}"""
        tulis(baru, halaman(f"{judul} — Toolkit Pajak", badan, "../", "Resume"))

    # ---- beranda
    rak = "".join(
        f'<li><a href="uu/{s}.html"><span class="singkat">{esc(k)}</span><span class="nama">{esc(n)}<span class="ket">{statistik[s]} pasal</span></span></a></li>'
        for s, k, n in UU)
    sanding_pph = sorted([v for v in SANDING.values() if v[0] == "PPh"], key=lambda v: urut_pasal(v[1]))
    sanding_ppn = sorted([v for v in SANDING.values() if v[0] == "PPN"], key=lambda v: urut_pasal(v[1]))
    beranda = f"""<section class="pembuka">
  <h1>Toolkit Pajak</h1>
  <p>Naskah undang-undang perpajakan, persandingan perubahannya, dan alat hitung sederhana. Setelah dibuka sekali, semuanya bisa dibaca tanpa internet.</p>
  <form class="kotak-cari" action="cari.html" role="search">
    <label class="sr" for="q-beranda">Cari di semua naskah</label>
    <input id="q-beranda" name="q" type="search" placeholder="Cari pasal atau kata, mis. pasal 31E" autocomplete="off">
    <button class="tombol" type="submit">Cari</button>
  </form>
  <div class="pasang">
    <button id="tombol-pasang" class="tombol garis" type="button" hidden>Pasang di HP</button>
    <p id="petunjuk-ios" hidden>Di iPhone: ketuk tombol Bagikan di Safari, lalu pilih <em>Add to Home Screen</em>.</p>
  </div>
</section>

<section class="bagian-beranda" aria-labelledby="h-uu">
  <h2 id="h-uu">Undang-undang</h2>
  <ul class="rak">{rak}</ul>
</section>

<section class="bagian-beranda" aria-labelledby="h-sanding">
  <h2 id="h-sanding">Persandingan perubahan</h2>
  <ul class="daftar">
    <li><a href="persandingan/index.html">Matriks pasal yang diubah UU Cipta Kerja dan UU HPP<small>{len(sanding_pph)} pasal PPh, {len(sanding_ppn)} pasal PPN</small></a></li>
  </ul>
</section>

<section class="bagian-beranda" aria-labelledby="h-resume">
  <h2 id="h-resume">Resume</h2>
  <ul class="daftar">
    <li><a href="resume/batas-waktu.html">Batas waktu pelaporan dan pembayaran<small>Perlu dimutakhirkan ke PMK 81/2024</small></a></li>
    <li><a href="resume/ptkp.html">Penghasilan Tidak Kena Pajak (PTKP)</a></li>
  </ul>
</section>

<section class="bagian-beranda" aria-labelledby="h-alat">
  <h2 id="h-alat">Alat hitung</h2>
  <ul class="daftar">
    <li><a href="alat/ptkp.html">Hitung PTKP<small>Dari status kawin dan jumlah tanggungan</small></a></li>
    <li><a href="alat/pasal-31e.html">Hitung PPh Badan dengan fasilitas Pasal 31E<small>Untuk peredaran bruto sampai Rp50 miliar</small></a></li>
    <li><span class="nonaktif">Hitung PPh Pasal 21<small>Belum tersedia</small></span></li>
  </ul>
</section>

<footer class="kaki">
  <p>Toolkit Pajak bukan aplikasi resmi dan tidak mewakili Direktorat Jenderal Pajak, Kementerian Keuangan, atau instansi pemerintah mana pun.</p>
  <p><a href="tentang.html">Tentang dan sumber</a><a href="privasi.html">Kebijakan privasi</a></p>
  <p>Versi {VERSI_APP}</p>
</footer>"""
    tulis("index.html", halaman("Toolkit Pajak", beranda, "./", "", kelas="beranda"))

    # ---- cari
    cari = """<h1>Cari di semua naskah</h1>
<form id="form-cari" class="kotak-cari" role="search">
  <label class="sr" for="q">Kata kunci</label>
  <input id="q" name="q" type="search" placeholder="mis. pasal 17 pph, NPWP, imbalan bunga" autocomplete="off" autofocus>
  <button class="tombol" type="submit">Cari</button>
</form>
<p id="status-cari" class="status-cari" aria-live="polite"></p>
<ul id="hasil-cari" class="hasil-cari"></ul>"""
    tulis("cari.html", halaman("Cari — Toolkit Pajak", cari, "./", "Cari", skrip='<script src="assets/js/cari.js"></script>\n'))

    # ---- indeks pencarian
    tulis("assets/data/cari.json", json.dumps(indeks, ensure_ascii=False, separators=(",", ":")))
    print("entri indeks:", len(indeks), "pasal:", statistik)

    halaman_pendukung()
    finalisasi()


# ---------------------------------------------------------------- alat, tentang, privasi

SKRIP_RUPIAH = """<script>
function rp(n){return "Rp" + Math.round(n).toLocaleString("id-ID");}
function angka(el){var v=(el.value||"").replace(/[^0-9]/g,"");return v?parseInt(v,10):NaN;}
function rapikan(el){var n=angka(el);el.value=isNaN(n)?"":n.toLocaleString("id-ID");}
</script>
"""


def halaman_pendukung():
    ptkp = """<h1>Hitung PTKP</h1>
<p class="dasar">Berdasarkan Pasal 7 ayat (1) UU PPh dan PMK-101/PMK.010/2016. Status dan tanggungan ditentukan menurut keadaan pada awal tahun pajak.</p>
<form class="isian" id="f" onsubmit="return false">
  <label>Status
    <select id="status">
      <option value="TK">Tidak kawin (TK)</option>
      <option value="K">Kawin (K)</option>
      <option value="KI">Kawin, penghasilan istri digabung (K/I)</option>
    </select>
  </label>
  <label>Jumlah tanggungan
    <select id="tanggungan"><option>0</option><option>1</option><option>2</option><option>3</option></select>
    <span class="bantu">Paling banyak 3 orang: keluarga sedarah/semenda garis lurus dan anak angkat yang menjadi tanggungan sepenuhnya.</span>
  </label>
</form>
<p class="dasar" id="kode"></p>
<p class="hasil-besar" id="total" aria-live="polite"></p>
<table class="rincian" id="rinci"></table>
<div class="catatan"><strong>Besaran dapat berubah.</strong> Pemerintah sedang membahas penyesuaian PTKP untuk 2027. Angka di sini perlu diperbarui bila PMK baru terbit.</div>
""" + SKRIP_RUPIAH + """<script>
var PTKP = { diri: 54000000, kawin: 4500000, istri: 54000000, tanggungan: 4500000 };
function hitung(){
  var st=document.getElementById("status").value, n=parseInt(document.getElementById("tanggungan").value,10);
  var baris=[["Untuk diri Wajib Pajak",PTKP.diri]];
  if(st!=="TK") baris.push(["Tambahan Wajib Pajak kawin",PTKP.kawin]);
  if(st==="KI") baris.push(["Tambahan istri yang penghasilannya digabung",PTKP.istri]);
  if(n>0) baris.push(["Tanggungan ("+n+" × "+rp(PTKP.tanggungan)+")",n*PTKP.tanggungan]);
  var tot=baris.reduce(function(a,b){return a+b[1];},0);
  document.getElementById("kode").textContent="Status "+(st==="KI"?"K/I":st)+"/"+n+", per tahun";
  document.getElementById("total").textContent=rp(tot);
  document.getElementById("rinci").innerHTML=baris.map(function(b){return "<tr><td>"+b[0]+"</td><td>"+rp(b[1])+"</td></tr>";}).join("")+
    "<tr class='total'><td>Jumlah PTKP setahun</td><td>"+rp(tot)+"</td></tr><tr><td>Setara per bulan</td><td>"+rp(tot/12)+"</td></tr>";
}
document.getElementById("status").addEventListener("change",hitung);
document.getElementById("tanggungan").addEventListener("change",hitung);
hitung();
</script>
"""
    tulis("alat/ptkp.html", halaman("Hitung PTKP — Toolkit Pajak", ptkp, "../", "Hitung PTKP"))

    p31e = """<h1>PPh Badan dengan fasilitas Pasal 31E</h1>
<p class="dasar">Wajib Pajak badan dalam negeri dengan peredaran bruto sampai Rp50 miliar mendapat pengurangan tarif 50% atas Penghasilan Kena Pajak dari bagian peredaran bruto sampai Rp4,8 miliar (<a href="../uu/pph.html#pasal-31e">Pasal 31E UU PPh</a>). Tarif umum badan 22% (<a href="../uu/pph.html#pasal-17">Pasal 17 ayat (1) huruf b</a>).</p>
<form class="isian" onsubmit="return false">
  <label>Peredaran bruto setahun
    <input id="omzet" inputmode="numeric" autocomplete="off" placeholder="mis. 12.000.000.000">
  </label>
  <label>Penghasilan Kena Pajak
    <input id="pkp" inputmode="numeric" autocomplete="off" placeholder="mis. 1.500.000.000">
    <span class="bantu">Dibulatkan ke bawah dalam ribuan rupiah penuh (Pasal 17 ayat (4)).</span>
  </label>
</form>
<p class="hasil-besar" id="total" aria-live="polite"></p>
<table class="rincian" id="rinci"></table>
<p class="dasar" id="pesan"></p>
<div class="catatan"><strong>Batasan.</strong> Alat ini tidak memperhitungkan Wajib Pajak yang memakai tarif final PP 55/2022, tarif Pasal 17 ayat (2b) bagi perseroan terbuka, maupun kredit pajak. Hasilnya untuk gambaran, bukan pengganti penghitungan dalam SPT.</div>
""" + SKRIP_RUPIAH + """<script>
var TARIF=0.22, BATAS_FASILITAS=4800000000, BATAS_OMZET=50000000000;
function hitung(){
  var o=angka(document.getElementById("omzet")), p=angka(document.getElementById("pkp"));
  var total=document.getElementById("total"), rinci=document.getElementById("rinci"), pesan=document.getElementById("pesan");
  total.textContent=""; rinci.innerHTML=""; pesan.textContent="";
  if(isNaN(o)||isNaN(p)){ pesan.textContent="Isi peredaran bruto dan Penghasilan Kena Pajak untuk melihat hasil."; return; }
  if(o<=0){ pesan.textContent="Peredaran bruto harus lebih dari nol."; return; }
  p=Math.floor(p/1000)*1000;
  var baris=[["Penghasilan Kena Pajak (dibulatkan)",p]], pajak;
  if(o>BATAS_OMZET){
    pajak=TARIF*p;
    baris.push(["Peredaran bruto di atas Rp50 miliar: tidak mendapat fasilitas. "+(TARIF*100)+"% × PKP",pajak]);
  } else {
    var fas = o<=BATAS_FASILITAS ? p : (BATAS_FASILITAS/o)*p;
    var non = p-fas;
    baris.push(["PKP yang mendapat fasilitas"+(o>BATAS_FASILITAS?" (Rp4,8 miliar ÷ "+rp(o)+" × PKP)":" (seluruhnya)"),fas]);
    baris.push(["PKP tanpa fasilitas",non]);
    var a=0.5*TARIF*fas, b=TARIF*non; pajak=a+b;
    baris.push([(TARIF*50).toLocaleString("id-ID")+"% × PKP dengan fasilitas",a]);
    baris.push([(TARIF*100)+"% × PKP tanpa fasilitas",b]);
  }
  total.textContent=rp(pajak);
  rinci.innerHTML=baris.map(function(x){return "<tr><td>"+x[0]+"</td><td>"+rp(x[1])+"</td></tr>";}).join("")+
    "<tr class='total'><td>PPh terutang setahun</td><td>"+rp(pajak)+"</td></tr>";
}
["omzet","pkp"].forEach(function(id){var el=document.getElementById(id);
  el.addEventListener("input",hitung); el.addEventListener("blur",function(){rapikan(el);});});
hitung();
</script>
"""
    tulis("alat/pasal-31e.html", halaman("Hitung Pasal 31E — Toolkit Pajak", p31e, "../", "Hitung Pasal 31E"))

    tentang = f"""<h1>Tentang Toolkit Pajak</h1>
<p>Toolkit Pajak membantu membaca cepat undang-undang perpajakan Indonesia di ponsel: susunan dalam satu naskah, persandingan perubahan, resume, dan alat hitung sederhana.</p>

<h2>Bukan aplikasi resmi</h2>
<p>Toolkit Pajak dikembangkan secara pribadi dan <strong>tidak berafiliasi dengan, tidak mewakili, dan tidak didukung oleh</strong> Direktorat Jenderal Pajak, Kementerian Keuangan, atau instansi pemerintah mana pun. Isi aplikasi bukan produk hukum dan bukan penegasan sikap instansi mana pun.</p>
<p>Segala keputusan dan produk hukum harus tetap mengacu pada naskah resmi peraturan sebagaimana dimuat dalam Lembaran Negara, Tambahan Lembaran Negara, Berita Negara, dan Tambahan Berita Negara Republik Indonesia.</p>

<h2>Sumber naskah resmi</h2>
<ul>
  <li><a href="https://peraturan.bpk.go.id" rel="noopener">JDIH BPK RI</a> (peraturan.bpk.go.id)</li>
  <li><a href="https://jdih.kemenkeu.go.id" rel="noopener">JDIH Kementerian Keuangan</a> (jdih.kemenkeu.go.id)</li>
  <li><a href="https://www.pajak.go.id" rel="noopener">Direktorat Jenderal Pajak</a> (pajak.go.id)</li>
  <li><a href="https://peraturan.go.id" rel="noopener">Database Peraturan Kementerian Hukum</a> (peraturan.go.id)</li>
</ul>
<p>Naskah dalam aplikasi ini disusun dari Susunan Dalam Satu Naskah (SDSN) undang-undang perpajakan terbitan Direktorat Penyuluhan, Pelayanan, dan Hubungan Masyarakat DJP, dengan perubahan sampai UU Nomor 7 Tahun 2021 tentang Harmonisasi Peraturan Perpajakan.</p>

<h2>Status isi</h2>
<ul>
  <li>Naskah UU: sampai perubahan oleh UU HPP. Perubahan sesudahnya belum dimasukkan.</li>
  <li>Persandingan per pasal untuk UU KUP belum tersedia.</li>
  <li>Resume batas waktu masih mengacu pada PMK-243/PMK.03/2014 yang telah dicabut dengan PMK 81 Tahun 2024.</li>
</ul>

<h2>Penyusun</h2>
<ul>
  <li>Pengelola konten: Agus Kristiyanto</li>
  <li>Pengembang: Furqon Nurhandono</li>
  <li>Kontributor dan penguji: Prima Salju Hati, Gustiadi Waluyo, Luthfi Adhityas F</li>
</ul>
<p>Kritik, saran, dan laporan kesalahan: <a href="mailto:furqon.nurhandono@gmail.com">furqon.nurhandono@gmail.com</a> atau <a href="mailto:aguskristiyanto75@gmail.com">aguskristiyanto75@gmail.com</a>.</p>

<h2>Riwayat versi</h2>
<ul>
  <li>2.0: dibangun ulang sebagai aplikasi web yang bisa dipasang dan dibaca tanpa internet; pencarian di semua naskah; alat hitung PTKP dan Pasal 31E.</li>
  <li>1.5: koreksi Pasal 27C ayat (2) UU KUP, tombol keluar.</li>
  <li>1.4: baca cepat SDSN UU pajak.</li>
</ul>
<p class="dasar"><a href="privasi.html">Kebijakan privasi</a></p>"""
    tulis("tentang.html", halaman("Tentang — Toolkit Pajak", tentang, "./", "Tentang"))

    privasi = """<h1>Kebijakan privasi</h1>
<p class="dasar">Berlaku sejak 25 November 2026.</p>
<p>Toolkit Pajak tidak mengumpulkan, menyimpan, atau mengirimkan data pribadi Anda.</p>
<ul>
  <li>Tidak ada akun, pendaftaran, iklan, atau alat analitik.</li>
  <li>Kata yang Anda cari dan angka yang Anda masukkan ke alat hitung diproses di perangkat Anda sendiri dan tidak dikirim ke mana pun.</li>
  <li>Aplikasi menyimpan salinan halaman di perangkat (cache) agar bisa dibuka tanpa internet, serta pilihan ukuran huruf Anda. Keduanya hanya ada di perangkat Anda dan terhapus bila Anda menghapus data situs atau mencopot aplikasi.</li>
  <li>Tautan ke situs lain, misalnya JDIH, membuka situs tersebut yang tunduk pada kebijakan privasinya masing-masing.</li>
</ul>
<p>Bila kebijakan ini berubah, versi terbaru akan dimuat di halaman ini. Pertanyaan dapat dikirim ke <a href="mailto:furqon.nurhandono@gmail.com">furqon.nurhandono@gmail.com</a>.</p>"""
    tulis("privasi.html", halaman("Kebijakan privasi — Toolkit Pajak", privasi, "./", "Kebijakan privasi"))


# ---------------------------------------------------------------- ikon, manifest, service worker

def finalisasi():
    from PIL import Image
    logo = Image.open(os.path.join(LAMA, "LogoTKP.png")).convert("RGBA")
    os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)

    def di_atas(ukuran, latar, skala):
        kanvas = Image.new("RGBA", (ukuran, ukuran), latar)
        s = int(ukuran * skala)
        l = logo.resize((s, s), Image.LANCZOS)
        kanvas.alpha_composite(l, ((ukuran - s) // 2, (ukuran - s) // 2))
        return kanvas

    for u in (192, 512):
        logo.resize((u, u), Image.LANCZOS).save(os.path.join(OUT, f"icons/icon-{u}.png"), optimize=True)
    di_atas(512, (246, 248, 247, 255), 0.72).save(os.path.join(OUT, "icons/maskable-512.png"), optimize=True)
    di_atas(180, (255, 255, 255, 255), 0.86).convert("RGB").save(os.path.join(OUT, "icons/apple-touch-icon.png"), optimize=True)

    manifest = {
        "name": "Toolkit Pajak",
        "short_name": "Toolkit Pajak",
        "description": "Naskah UU perpajakan Indonesia, persandingan perubahan, dan alat hitung. Bisa dibaca tanpa internet. Bukan aplikasi resmi pemerintah.",
        "lang": "id",
        "start_url": "./index.html",
        "scope": "./",
        "display": "standalone",
        "background_color": "#f6f8f7",
        "theme_color": "#0e6b4c",
        "categories": ["education", "finance", "productivity"],
        "icons": [
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    tulis("manifest.webmanifest", json.dumps(manifest, ensure_ascii=False, indent=2))

    # salin font
    for f in ("literata-latin-wght-normal.woff2", "literata-latin-wght-italic.woff2"):
        shutil.copy(os.path.join(os.path.dirname(SRC), "node_modules/@fontsource-variable/literata/files", f),
                    os.path.join(OUT, "assets/fonts", f))

    # daftar cache
    berkas = []
    h = hashlib.sha256()
    for akar, _, files in os.walk(OUT):
        for f in sorted(files):
            rel = os.path.relpath(os.path.join(akar, f), OUT).replace(os.sep, "/")
            if rel in ("sw.js", "README.md", ".nojekyll") or rel.startswith("."):
                continue
            berkas.append(rel)
            with open(os.path.join(akar, f), "rb") as fh:
                h.update(rel.encode()); h.update(fh.read())
    berkas.sort()
    versi = h.hexdigest()[:10]
    with open(os.path.join(OUT, "sw.js"), encoding="utf-8") as f:
        sw = f.read()
    sw = sw.replace("__VERSI__", versi).replace("__DAFTAR__", json.dumps(["./"] + berkas, indent=1))
    with open(os.path.join(OUT, "sw.js"), "w", encoding="utf-8") as f:
        f.write(sw)
    open(os.path.join(OUT, ".nojekyll"), "w").close()
    total = sum(os.path.getsize(os.path.join(OUT, b)) for b in berkas)
    print("berkas:", len(berkas), "total KB:", total // 1024, "versi:", versi)


if __name__ == "__main__":
    main()
