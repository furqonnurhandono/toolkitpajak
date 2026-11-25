#!/usr/bin/env python3
"""Perbarui indeks pencarian dan daftar berkas offline Toolkit Pajak.

Jalankan setiap kali ada halaman yang diubah atau ditambah:

    pip install beautifulsoup4
    python3 tools/perbarui.py

Yang dikerjakan:
1. Membaca semua pasal di uu/, persandingan/, dan resume/, lalu menulis ulang
   assets/data/cari.json (indeks untuk halaman Cari).
2. Menulis ulang daftar DAFTAR dan nomor VERSI di sw.js, supaya halaman baru ikut
   tersimpan untuk dibaca offline dan HP pengguna tahu ada versi baru.
"""
import hashlib
import json
import os
import re
import sys

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Perlu beautifulsoup4. Pasang dulu: pip install beautifulsoup4")

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URUTAN_UU = ["kup", "pph", "ppn", "pbb", "bm", "ppsp"]
# Berkas yang tidak perlu disimpan di HP pengguna
LEWATI = {"sw.js", "README.md", "CONTRIBUTING.md", "LICENSE"}
FOLDER_LEWATI = ("tools/", ".github/", ".git/")


def rapikan(teks):
    return re.sub(r"\s+", " ", teks).strip()


def baca(rel):
    with open(os.path.join(AKAR, rel), encoding="utf-8") as f:
        return BeautifulSoup(f.read(), "html.parser")


def entri_dari(soup, rel, kelas, sumber, jenis, awalan_judul=""):
    hasil = []
    for d in soup.select(f"main details.{kelas}"):
        if not d.get("id"):
            continue
        isi = d.find("div", class_="isi", recursive=False)
        hasil.append({
            "u": f"{rel}#{d['id']}",
            "s": sumber,
            "t": awalan_judul + rapikan(d.summary.get_text(" ")),
            "x": rapikan(isi.get_text(" ")) if isi else "",
            "k": jenis,
        })
    return hasil


def bangun_indeks():
    indeks = []
    # Naskah UU, urut seperti di beranda; UU baru di folder uu/ ikut di belakang
    ada = sorted(f[:-5] for f in os.listdir(os.path.join(AKAR, "uu")) if f.endswith(".html"))
    for nama in [n for n in URUTAN_UU if n in ada] + [n for n in ada if n not in URUTAN_UU]:
        rel = f"uu/{nama}.html"
        soup = baca(rel)
        singkat = soup.select_one("h1 .singkat")
        sumber = rapikan(singkat.get_text()) if singkat else nama.upper()
        indeks += entri_dari(soup, rel, "pasal", sumber, "uu")
    # Persandingan per pasal (halaman daftar persandingan/index.html tidak diindeks)
    for f in sorted(os.listdir(os.path.join(AKAR, "persandingan"))):
        if not f.endswith(".html") or f == "index.html":
            continue
        rel = f"persandingan/{f}"
        soup = baca(rel)
        m = re.match(r"Pasal\s+(\S+)\s+UU\s+(.+)", rapikan(soup.find("h1").get_text(" ")))
        no, uu = (m.group(1), m.group(2)) if m else ("", "")
        indeks += entri_dari(soup, rel, "blok", f"Persandingan UU {uu}".strip(), "sanding",
                             f"Pasal {no}: " if no else "")
    # Resume
    for f in sorted(os.listdir(os.path.join(AKAR, "resume"))):
        if f.endswith(".html"):
            rel = f"resume/{f}"
            indeks += entri_dari(baca(rel), rel, "blok", "Resume", "resume")
    with open(os.path.join(AKAR, "assets/data/cari.json"), "w", encoding="utf-8") as fh:
        fh.write(json.dumps(indeks, ensure_ascii=False, separators=(",", ":")))
    return indeks


def perbarui_sw():
    berkas = []
    h = hashlib.sha256()
    for akar, folders, files in os.walk(AKAR):
        folders[:] = sorted(x for x in folders if not x.startswith("."))
        for f in sorted(files):
            rel = os.path.relpath(os.path.join(akar, f), AKAR).replace(os.sep, "/")
            if rel in LEWATI or f.startswith(".") or rel.startswith(FOLDER_LEWATI):
                continue
            berkas.append(rel)
            with open(os.path.join(akar, f), "rb") as fh:
                h.update(rel.encode())
                h.update(fh.read())
    berkas.sort()
    versi = h.hexdigest()[:10]
    jalur = os.path.join(AKAR, "sw.js")
    with open(jalur, encoding="utf-8") as fh:
        sw = fh.read()
    sw = re.sub(r'var VERSI = "[^"]*";', f'var VERSI = "{versi}";', sw, count=1)
    sw = re.sub(r"var DAFTAR = \[.*?\];", "var DAFTAR = " + json.dumps(["./"] + berkas, indent=1) + ";",
                sw, count=1, flags=re.S)
    with open(jalur, "w", encoding="utf-8") as fh:
        fh.write(sw)
    return berkas, versi


if __name__ == "__main__":
    indeks = bangun_indeks()
    berkas, versi = perbarui_sw()
    print(f"Indeks pencarian: {len(indeks)} bagian")
    print(f"Berkas offline: {len(berkas)} berkas, versi {versi}")
