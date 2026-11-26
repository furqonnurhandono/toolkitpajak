/* Toolkit Pajak — inti pengutipan untuk add-in Word & Excel.
   Tugasnya: menandai struktur pasal (ayat, huruf, angka, penjelasan), membaca teks yang
   diblok pengguna, menghitung rujukan "Pasal x Ayat (y) huruf z", lalu menyusun kalimat
   pengantar menurut pola A–F. Tidak bergantung pada Office.js, jadi bisa diuji di browser. */
(function (g) {
  "use strict";

  // "(8)", "(4a)", "(3).", "(10).Dalam", juga "2)" yang kehilangan kurung buka di naskah
  var RE_AYAT = /^\s*\(?\s*(\d+[a-z]{0,2})\s*\)\s*\.?\s*/i;
  var BLOK = { P: 1, LI: 1, OL: 1, UL: 1, DIV: 1, TABLE: 1, TR: 1, TD: 1, TH: 1, DETAILS: 1, SUMMARY: 1 };
  // Sisa yang tidak dianggap memotong kutipan: tanda baca dan kata sambung di ujung butir
  var SISA_WAJAR = /^[\s;:,.]*(dan|atau|dan\/atau)?[\s;:,.]*$/i;

  function rapikan(t) {
    return t.replace(/\s*\*{1,7}\)/g, "").replace(/\s+/g, " ").trim();
  }
  function hurufKe(i) { // 0 -> a, 25 -> z, 26 -> aa
    var s = "";
    i += 1;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(97 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  function joinDan(arr) {
    if (arr.length <= 1) return arr[0] || "";
    return arr.slice(0, -1).join(", ") + " dan " + arr[arr.length - 1];
  }
  function kunciJalur(j) { return j.map(function (b) { return b[0] + ":" + b[1]; }).join("|"); }
  function blokTerdekat(node, batas) {
    var n = node.parentNode;
    while (n && n !== batas && !(n.nodeType === 1 && BLOK[n.tagName])) n = n.parentNode;
    return n;
  }
  function diDalamPengecualian(node, batas) {
    for (var n = node.parentNode; n && n !== batas; n = n.parentNode) {
      if (n.nodeType === 1 && (n.classList.contains("ubah") || n.tagName === "SUMMARY")) return true;
    }
    return false;
  }

  /* ---------- 1. Menandai struktur satu pasal ---------- */

  // Hasil: { akar: simpul pasal, simpul: {kunci: simpul}, unit: [elemen] }
  function tandai(isi) {
    var struktur = { simpul: {}, unit: [] };
    function simpul(jalur) {
      var k = kunciJalur(jalur);
      if (struktur.simpul[k]) return struktur.simpul[k];
      var s = { jalur: jalur, kunci: k, anak: [], el: [], urut: 0, induk: null };
      struktur.simpul[k] = s;
      if (jalur.length) {
        var ind = simpul(jalur.slice(0, -1));
        s.induk = ind;
        s.urut = ind.anak.length;
        ind.anak.push(s);
      }
      return s;
    }
    struktur.akar = simpul([]);

    function pasang(el, jalur, jenis, label) {
      el.setAttribute("data-unit", jenis);
      el.setAttribute("data-jalur", kunciJalur(jalur));
      if (label) el.setAttribute("data-label", label);
      var s = simpul(jalur);
      if (jenis !== "penjelasan") s.el.push(el);
      struktur.unit.push(el);
    }

    function daftar(ol, jalur, dalamPenjelasan) {
      var tipe = (ol.getAttribute("type") || "1");
      var jenis = /a/i.test(tipe) ? "huruf" : "angka";
      var mulai = parseInt(ol.getAttribute("start") || "1", 10) - 1;
      var li = Array.prototype.filter.call(ol.children, function (c) { return c.tagName === "LI"; });
      li.forEach(function (item, i) {
        var no = jenis === "huruf" ? hurufKe(mulai + i) : String(mulai + i + 1);
        var labelBaris = no + ".";
        var j = dalamPenjelasan ? jalur : jalur.concat([[jenis, no]]);
        var unitJenis = dalamPenjelasan ? "penjelasan" : "isi";
        pasang(item, j, unitJenis, labelBaris);
        // Paragraf di dalam butir ikut butirnya; label hanya di baris pertama
        var adaTeksSendiri = rapikan(teksSendiri(item).penuh) !== "";
        var pertama = !adaTeksSendiri;
        Array.prototype.forEach.call(item.children, function (c) {
          if (c.tagName === "P" || c.tagName === "DIV") {
            pasang(c, j, unitJenis, pertama ? labelBaris : "");
            pertama = false;
          } else if (c.tagName === "OL" || c.tagName === "UL") {
            daftar(c, j, dalamPenjelasan);
          }
        });
      });
    }

    function penjelasan(det, jalur) {
      det.setAttribute("data-penjelasan", kunciJalur(jalur));
      var isiP = det.querySelector(".isi") || det;
      Array.prototype.forEach.call(isiP.children, function (c) {
        if (c.tagName === "OL" || c.tagName === "UL") daftar(c, jalur, true);
        else if (c.tagName !== "SUMMARY") pasang(c, jalur, "penjelasan", "");
      });
    }

    var anak = Array.prototype.slice.call(isi.children);
    var adaNomor = anak.some(function (c) { return c.tagName === "P" && RE_AYAT.test(c.textContent); });
    var jalurAyat = [];
    var sebelum = null;
    struktur.tanpaNomor = [];
    anak.forEach(function (c) {
      var tag = c.tagName;
      if (tag === "P") {
        var m = adaNomor && c.textContent.match(RE_AYAT);
        if (m) {
          jalurAyat = [["ayat", m[1].toLowerCase()]];
          pasang(c, jalurAyat, "isi", "(" + m[1].toLowerCase() + ")");
        } else if (!adaNomor || (sebelum && sebelum !== "DETAILS")) {
          pasang(c, jalurAyat, "isi", ""); // teks pasal tanpa ayat, atau lanjutan ayat setelah daftar
        } else {
          // Paragraf tanpa nomor setelah penjelasan: nomor ayat hilang di naskah
          jalurAyat = [["ayat", "?" + (struktur.tanpaNomor.length + 1)]];
          struktur.tanpaNomor.push(c);
          pasang(c, jalurAyat, "isi", "");
        }
      } else if (tag === "OL" || tag === "UL") {
        daftar(c, jalurAyat, false);
      } else if (tag === "DETAILS" && c.classList.contains("penjelasan")) {
        penjelasan(c, jalurAyat);
      } else if (tag === "DIV" || tag === "TABLE") {
        pasang(c, jalurAyat, "isi", "");
      }
      sebelum = tag;
    });
    return struktur;
  }

  /* ---------- 2. Membaca teks yang diblok ---------- */

  // Teks milik elemen sendiri (tanpa butir anak, tanpa tanda bintang, tanpa judul Penjelasan)
  function teksSendiri(el, range) {
    var semua = el.tagName === "DIV" || el.tagName === "TABLE";
    var penuh = "", awal = -1, akhir = -1;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    for (var t = w.nextNode(); t; t = w.nextNode()) {
      if (diDalamPengecualian(t, el)) continue;
      if (!semua && blokTerdekat(t, el) !== el) continue;
      var data = t.data;
      if (semua && penuh && !/\s$/.test(penuh)) penuh += " ";
      if (range && range.intersectsNode(t)) {
        var s = range.startContainer === t ? range.startOffset : 0;
        var e = range.endContainer === t ? range.endOffset : data.length;
        if (e > s) {
          if (awal < 0) awal = penuh.length + s;
          akhir = penuh.length + e;
        }
      }
      penuh += data;
    }
    return { penuh: penuh, awal: awal, akhir: akhir };
  }

  function bacaUnit(el, range) {
    var t = teksSendiri(el, range);
    var mentah = t.penuh;
    var potongLabel = 0;
    var label = el.getAttribute("data-label") || "";
    if (/^\(/.test(label)) { var m = mentah.match(RE_AYAT); if (m) potongLabel = m[0].length; }
    var isi = rapikan(mentah.slice(potongLabel));
    var hasil = { el: el, jenis: el.getAttribute("data-unit"), kunci: el.getAttribute("data-jalur"),
                  label: label, isi: isi, dipilih: false, teks: isi, terpotongAwal: false, terpotongAkhir: false };
    if (t.awal < 0) return hasil;
    var a = Math.max(t.awal, potongLabel), b = t.akhir;
    var pilih = b > a ? rapikan(mentah.slice(a, b)) : "";
    if (!pilih) return hasil;
    hasil.dipilih = true;
    hasil.terpotongAwal = !SISA_WAJAR.test(mentah.slice(potongLabel, a));
    hasil.terpotongAkhir = !SISA_WAJAR.test(mentah.slice(b));
    hasil.teks = (hasil.terpotongAwal ? "… " : "") + pilih + (hasil.terpotongAkhir ? " …" : "");
    return hasil;
  }

  /* ---------- 3. Menghitung rujukan ---------- */

  function labelRujukan(b, gaya) {
    if (b[0] === "ayat") return /^\?/.test(b[1]) ? "" : gaya.ayat + " (" + b[1] + ")";
    return b[0] + " " + b[1];
  }
  function labelBaris(b) {
    if (b[0] === "ayat") return /^\?/.test(b[1]) ? "" : "(" + b[1] + ")";
    return b[1] + ".";
  }

  // Dari simpul yang dipilih, ambil rujukan paling tepat: kalau semua anak terpilih,
  // rujuk induknya; kalau hanya sebagian, rujuk anak-anak itu.
  function pilihRujukan(s, terpilih) {
    var dariAnak = [];
    var anakKena = 0;
    s.anak.forEach(function (a) {
      var r = pilihRujukan(a, terpilih);
      if (r.length) anakKena++;
      dariAnak = dariAnak.concat(r);
    });
    if (anakKena && anakKena < s.anak.length) return dariAnak;
    if (anakKena || terpilih[s.kunci]) return [s];
    return [];
  }

  // Susun daftar simpul jadi teks: "Ayat (8) huruf b dan huruf f", "Ayat (1) sampai dengan Ayat (4)"
  function susunJalur(daftar, kedalaman, gaya) {
    var grup = [];
    daftar.forEach(function (s) {
      var b = s.jalur[kedalaman];
      var akhir = grup[grup.length - 1];
      if (akhir && akhir.b[0] === b[0] && akhir.b[1] === b[1]) akhir.isi.push(s);
      else grup.push({ b: b, isi: [s], simpul: s.jalur.length === kedalaman + 1 ? s : null });
    });
    var bagian = [];
    var i = 0;
    while (i < grup.length) {
      // Rangkaian >= 3 saudara berurutan tanpa rincian di bawahnya -> "sampai dengan"
      var j = i;
      while (j + 1 < grup.length && grup[j].simpul && grup[j + 1].simpul &&
             grup[j + 1].simpul.induk === grup[j].simpul.induk &&
             grup[j + 1].simpul.urut === grup[j].simpul.urut + 1) j++;
      if (j - i >= 2) {
        bagian.push(labelRujukan(grup[i].b, gaya) + " sampai dengan " + labelRujukan(grup[j].b, gaya));
        i = j + 1;
        continue;
      }
      var gr = grup[i];
      var lbl = labelRujukan(gr.b, gaya);
      var lebihDalam = gr.isi.filter(function (s) { return s.jalur.length > kedalaman + 1; });
      var sisa = lebihDalam.length ? susunJalur(lebihDalam, kedalaman + 1, gaya) : "";
      bagian.push([lbl, sisa].filter(Boolean).join(" "));
      i++;
    }
    return joinDan(bagian.filter(Boolean));
  }

  function teksRujukan(pasal, daftar, gaya) {
    if (!daftar.length) return "";
    if (daftar.length === 1 && daftar[0].jalur.length === 0) return "Pasal " + pasal;
    var dalam = susunJalur(daftar.filter(function (s) { return s.jalur.length; }), 0, gaya);
    return ("Pasal " + pasal + " " + dalam).trim();
  }

  function awalanSama(daftar) {
    if (!daftar.length) return [];
    var p = daftar[0].jalur.slice();
    daftar.forEach(function (s) {
      var k = 0;
      while (k < p.length && k < s.jalur.length && p[k][0] === s.jalur[k][0] && p[k][1] === s.jalur[k][1]) k++;
      p = p.slice(0, k);
    });
    return p;
  }

  // Analisis blok: hasilkan rujukan, induk, dan baris-baris teks
  function analisis(struktur, range, pasal, gaya) {
    var unit = struktur.unit.filter(function (el) {
      // Penjelasan yang tertutup tidak ikut walau blok melewatinya
      if (el.getAttribute("data-unit") !== "penjelasan") return true;
      var d = el.closest("details.penjelasan");
      return !d || d.open;
    }).map(function (el) { return bacaUnit(el, range); })
      .filter(function (u) { return u.dipilih; });
    if (!unit.length) return null;
    var batang = unit.filter(function (u) { return u.jenis !== "penjelasan"; });
    var jelas = unit.filter(function (u) { return u.jenis === "penjelasan"; });
    var peringatan = [];

    function bagian(daftarUnit, awalan) {
      if (!daftarUnit.length) return null;
      var terpilih = {};
      daftarUnit.forEach(function (u) { terpilih[u.kunci] = true; });
      var simpulPilih = Object.keys(terpilih).map(function (k) { return struktur.simpul[k]; });
      var daftar;
      if (awalan) {
        // Penjelasan dirujuk per ayat tempat penjelasan itu menempel
        daftar = simpulPilih;
      } else {
        daftar = pilihRujukan(struktur.akar, terpilih);
      }
      // Simpul "?n" (nomor ayat hilang) dirujuk ke pasalnya saja
      if (daftar.some(function (s) { return s.jalur.some(function (b) { return /^\?/.test(b[1]); }); })) {
        peringatan.push("Nomor ayat tidak tercantum di naskah aplikasi. Periksa nomor ayatnya sebelum dipakai.");
        daftar = daftar.map(function (s) {
          var k = s.jalur.findIndex(function (b) { return /^\?/.test(b[1]); });
          return k < 0 ? s : struktur.akar;
        }).filter(function (s, i, arr) { return arr.indexOf(s) === i; });
      }
      var rujuk = (awalan || "") + teksRujukan(pasal, daftar, gaya);
      var induk = awalanSama(simpulPilih.map(function (s) {
        return { jalur: s.jalur.filter(function (b) { return !/^\?/.test(b[1]); }) };
      }));
      var indukTeks = (awalan || "") + teksRujukan(pasal, [{ jalur: induk }], gaya);
      if (!induk.length) indukTeks = (awalan || "") + "Pasal " + pasal;
      // Baris: label relatif terhadap induk
      var dipakai = {};
      var baris = daftarUnit.map(function (u) {
        var s = struktur.simpul[u.kunci];
        var rel = s.jalur.slice(induk.length);
        var lbl = "";
        if (u.jenis === "penjelasan") lbl = u.label;
        else if (rel.length && u.label && !dipakai[u.kunci]) lbl = labelBaris(rel[rel.length - 1]);
        dipakai[u.kunci] = true;
        return { label: lbl, teks: u.teks, tingkat: rel.length };
      });
      var min = Math.min.apply(null, baris.map(function (b) { return b.tingkat; }));
      baris.forEach(function (b) { b.tingkat -= min; });
      return { rujukan: rujuk, induk: indukTeks, baris: baris };
    }

    var bt = bagian(batang, "");
    var pj = bagian(jelas, "Penjelasan ");
    var potong = unit.some(function (u) { return u.terpotongAwal || u.terpotongAkhir; });
    var gabung = [bt, pj].filter(Boolean);
    return {
      pasal: pasal,
      rujukan: joinDan(gabung.map(function (x) { return x.rujukan; })),
      induk: gabung.length === 1 ? gabung[0].induk : joinDan(gabung.map(function (x) { return x.induk; })),
      baris: gabung.reduce(function (a, x) { return a.concat(x.baris); }, []),
      terpotong: potong,
      peringatan: peringatan
    };
  }

  /* ---------- 4. Menyusun kalimat ---------- */

  function isiTemplat(t, v) {
    return t.replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; });
  }
  function sebaris(baris) {
    return baris.map(function (b) { return (b.label ? b.label + " " : "") + b.teks; }).join(" ");
  }

  // item: { uu, rujukan, induk, baris }
  // opsi: { pola, templat, juncto, nama(uuKey) -> string, host, bawah }
  // Hasil: { sebaris: string } atau { blok: [ {teks, label, tingkat} ] } (baris pertama = kalimat pengantar)
  function susun(items, opsi) {
    var t = opsi.templat, pola = opsi.pola, nama = opsi.nama;
    function grupUU() {
      var urut = [], peta = {};
      items.forEach(function (it) {
        if (!peta[it.uu]) { peta[it.uu] = { uu: it.uu, items: [] }; urut.push(peta[it.uu]); }
        peta[it.uu].items.push(it);
      });
      return urut;
    }
    var jo = " " + opsi.juncto + " ";

    if (pola === "A" || pola === "B" || pola === "C") {
      if (pola === "A" && opsi.bawah && items.length > 1) {
        return { blok: items.map(function (it) {
          return { label: "", teks: isiTemplat(t.A, { dasar: it.rujukan + " " + nama(it.uu), rujukan: it.rujukan, uu: nama(it.uu), induk: it.induk + " " + nama(it.uu) }), tingkat: 0 };
        }), tanpaKepala: true };
      }
      var grup = grupUU().map(function (g) {
        var r = g.items.map(function (it) { return it.rujukan; });
        return { r: pola === "A" ? joinDan(r) : r.join(jo), uu: nama(g.uu) };
      });
      var dasar = grup.map(function (g) { return g.r + " " + g.uu; }).join(pola === "A" ? ", " : jo);
      var v = { dasar: dasar, rujukan: grup.map(function (g) { return g.r; }).join(", "),
                uu: grup.map(function (g) { return g.uu; }).join(", "),
                induk: items.length === 1 ? items[0].induk + " " + grup[0].uu : dasar,
                isi: items.length === 1 ? sebaris(items[0].baris) : "" };
      return { sebaris: isiTemplat(t[pola], v) };
    }

    if (pola === "D") {
      var kal = items.map(function (it) {
        var n = nama(it.uu);
        return isiTemplat(t.D, { dasar: it.rujukan + " " + n, rujukan: it.rujukan, uu: n, induk: it.induk + " " + n, isi: sebaris(it.baris) });
      });
      if (kal.length === 1) return { sebaris: kal[0] };
      return { blok: kal.map(function (k) { return { label: "", teks: k, tingkat: 0 }; }), tanpaKepala: true };
    }

    if (pola === "E") {
      var blok = [];
      items.forEach(function (it, i) {
        var n = nama(it.uu);
        blok.push({ label: "", teks: isiTemplat(t.E, { dasar: it.rujukan + " " + n, rujukan: it.rujukan, uu: n, induk: it.induk + " " + n }), tingkat: 0, kepala: true });
        it.baris.forEach(function (b) { blok.push({ label: b.label, teks: b.teks, tingkat: b.tingkat + 1 }); });
      });
      return { blok: blok };
    }

    // F: per UU, tiap pasal jadi butir a., b., c.
    var hasil = [];
    grupUU().forEach(function (g) {
      var n = nama(g.uu);
      hasil.push({ label: "", teks: isiTemplat(t.F, { uu: n, dasar: n, rujukan: "", induk: n }), tingkat: 0, kepala: true });
      g.items.forEach(function (it, i) {
        hasil.push({ label: hurufKe(i) + ".", teks: it.rujukan, tingkat: 1 });
        it.baris.forEach(function (b) { hasil.push({ label: b.label, teks: b.teks, tingkat: b.tingkat + 2 }); });
      });
    });
    return { blok: hasil };
  }

  // Teks polos untuk clipboard dan pratinjau
  function polos(h) {
    if (h.sebaris !== undefined) return h.sebaris;
    return h.blok.map(function (b) {
      return new Array(b.tingkat + 1).join("    ") + (b.label ? b.label + " " : "") + b.teks;
    }).join("\n");
  }

  g.Kutip = { tandai: tandai, analisis: analisis, susun: susun, polos: polos, rapikan: rapikan,
              joinDan: joinDan, hurufKe: hurufKe, RE_AYAT: RE_AYAT };
})(window);
