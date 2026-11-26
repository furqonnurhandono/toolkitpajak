/* Toolkit Pajak — taskpane add-in Word & Excel.
   Membaca naskah UU dari situs yang sama (../uu/*.html), lalu memakai kutip.js
   untuk menghitung rujukan dan menyusun kalimat, dan Office.js untuk menyisipkan. */
(function () {
  "use strict";
  var K = window.Kutip;
  var $ = function (id) { return document.getElementById(id); };

  var UBAH_TERAKHIR = "sebagaimana telah beberapa kali diubah terakhir dengan Undang-Undang Nomor 6 Tahun 2023 " +
    "tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang";
  var DAFTAR_UU = [
    { k: "kup", berkas: "../uu/kup.html", singkat: "UU KUP", sedang: "UU No.6 Tahun 1983 s.t.d.t.d. UU No.6 Tahun 2023",
      lengkap: "Undang-Undang Nomor 6 Tahun 1983 tentang Ketentuan Umum dan Tata Cara Perpajakan " + UBAH_TERAKHIR },
    { k: "pph", berkas: "../uu/pph.html", singkat: "UU PPh", sedang: "UU No.7 Tahun 1983 s.t.d.t.d. UU No.6 Tahun 2023",
      lengkap: "Undang-Undang Nomor 7 Tahun 1983 tentang Pajak Penghasilan " + UBAH_TERAKHIR },
    { k: "ppn", berkas: "../uu/ppn.html", singkat: "UU PPN", sedang: "UU No.8 Tahun 1983 s.t.d.t.d. UU No.6 Tahun 2023",
      lengkap: "Undang-Undang Nomor 8 Tahun 1983 tentang Pajak Pertambahan Nilai Barang dan Jasa dan Pajak Penjualan atas Barang Mewah " + UBAH_TERAKHIR },
    { k: "pbb", berkas: "../uu/pbb.html", singkat: "UU PBB", sedang: "UU No.12 Tahun 1985 s.t.d.d. UU No.12 Tahun 1994",
      lengkap: "Undang-Undang Nomor 12 Tahun 1985 tentang Pajak Bumi dan Bangunan sebagaimana telah diubah dengan Undang-Undang Nomor 12 Tahun 1994" },
    { k: "bm", berkas: "../uu/bm.html", singkat: "UU Bea Meterai", sedang: "UU No.10 Tahun 2020",
      lengkap: "Undang-Undang Nomor 10 Tahun 2020 tentang Bea Meterai" },
    { k: "ppsp", berkas: "../uu/ppsp.html", singkat: "UU PPSP", sedang: "UU No.19 Tahun 1997 s.t.d.d. UU No.19 Tahun 2000",
      lengkap: "Undang-Undang Nomor 19 Tahun 1997 tentang Penagihan Pajak dengan Surat Paksa sebagaimana telah diubah dengan Undang-Undang Nomor 19 Tahun 2000" }
  ];
  var TEMPLAT = {
    A: "{dasar}",
    B: "Berdasarkan {dasar}, ",
    C: "sebagaimana diatur dalam {dasar}",
    D: "{dasar} mengatur bahwa “{isi}”",
    E: "{induk} mengatur hal-hal sebagai berikut :",
    F: "{uu} mengatur hal-hal sebagai berikut :"
  };

  /* ---------- Pengaturan (disimpan di perangkat) ---------- */
  var KUNCI = "tkp-kutip-v1";
  function bawaan() {
    var nama = {};
    DAFTAR_UU.forEach(function (u) { nama[u.k] = { singkat: u.singkat, sedang: u.sedang, lengkap: u.lengkap }; });
    return { ayat: "Ayat", juncto: "j.o.", sebutan: "singkat", excel: "ganti", templat: Object.assign({}, TEMPLAT),
             nama: nama, uu: "kup", pasal: {}, polaWord: "E", polaExcel: "A", polaLain: "A", keranjang: [] };
  }
  function muatAtur() {
    var a = bawaan();
    try {
      var s = JSON.parse(localStorage.getItem(KUNCI) || "null");
      if (s) {
        Object.keys(s).forEach(function (k) { if (k !== "nama" && k !== "templat") a[k] = s[k]; });
        Object.assign(a.templat, s.templat || {});
        Object.keys(s.nama || {}).forEach(function (k) { if (a.nama[k]) Object.assign(a.nama[k], s.nama[k]); });
      }
    } catch (e) { /* penyimpanan tidak tersedia: pakai bawaan */ }
    if (["singkat", "sedang", "lengkap"].indexOf(a.sebutan) < 0) a.sebutan = "singkat";
    return a;
  }
  function simpanAtur() { try { localStorage.setItem(KUNCI, JSON.stringify(atur)); } catch (e) { } }
  var atur = muatAtur();

  /* ---------- Keadaan ---------- */
  var host = null;            // "Word", "Excel", atau null (di luar Office)
  var naskah = {};            // k -> {doc, pasal:[{id,no,el}]}
  var tampil = null;          // {uu, no, struktur}
  var blok = null;            // hasil analisis blok terakhir + uu
  var bukaKeranjang = false;
  var adaPeringatan = false;

  function polaKunci() { return host === "Word" ? "polaWord" : host === "Excel" ? "polaExcel" : "polaLain"; }
  function pesan(t, galat) {
    var p = $("pesan");
    p.textContent = t || "";
    p.className = "pesan" + (galat ? " galat" : "");
  }

  /* ---------- Memuat naskah ---------- */
  function muatUU(k) {
    if (naskah[k]) return Promise.resolve(naskah[k]);
    var u = DAFTAR_UU.filter(function (x) { return x.k === k; })[0];
    return fetch(u.berkas).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var pasal = Array.prototype.map.call(doc.querySelectorAll("main details.pasal[id]"), function (d) {
        var no = (d.querySelector("summary .no") || d.querySelector("summary")).textContent.trim().replace(/^Pasal\s+/i, "");
        return { id: d.id, no: no, el: d, teks: K.rapikan(d.textContent).toLowerCase() };
      });
      naskah[k] = { doc: doc, pasal: pasal };
      return naskah[k];
    });
  }

  function isiPilihanPasal(daftar) {
    var sel = $("pilih-pasal");
    sel.innerHTML = "";
    daftar.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = "Pasal " + p.no;
      sel.appendChild(o);
    });
  }

  function tampilkan(k, id, sorot) {
    return muatUU(k).then(function (n) {
      var p = n.pasal.filter(function (x) { return x.id === id; })[0] || n.pasal[0];
      var main = $("naskah");
      main.innerHTML = "";
      var h = document.createElement("h2");
      h.className = "judul-pasal";
      h.textContent = "Pasal " + p.no + " " + atur.nama[k].singkat;
      var isi = p.el.querySelector(":scope > .isi").cloneNode(true);
      main.appendChild(h);
      main.appendChild(isi);
      var struktur = K.tandai(isi);
      tampil = { uu: k, no: p.no, id: p.id, struktur: struktur };
      $("pilih-pasal").value = p.id;
      atur.uu = k;
      atur.pasal[k] = p.id;
      simpanAtur();
      if (sorot) sorotKata(isi, sorot);
      main.scrollTop = 0;
    }).catch(function (e) {
      $("naskah").innerHTML = "";
      pesan("Naskah tidak bisa dimuat (" + e.message + "). Periksa koneksi internet.", true);
    });
  }

  function sorotKata(akar, kata) {
    var re = new RegExp("(" + kata.split(/\s+/).filter(Boolean)
      .map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
    var w = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT, null);
    var simpul = [];
    for (var t = w.nextNode(); t; t = w.nextNode()) if (re.test(t.data)) simpul.push(t);
    var pertama = null;
    simpul.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.data.split(re).forEach(function (bag, i) {
        if (i % 2) {
          var m = document.createElement("mark");
          m.textContent = bag;
          frag.appendChild(m);
          if (!pertama) pertama = m;
        } else if (bag) frag.appendChild(document.createTextNode(bag));
      });
      t.parentNode.replaceChild(frag, t);
    });
    if (pertama) {
      var det = pertama.closest("details");
      if (det) det.open = true;
      pertama.scrollIntoView({ block: "center" });
    }
  }

  /* ---------- Blok & pratinjau ---------- */
  function gaya() { return { ayat: atur.ayat }; }

  function bacaBlok() {
    var sel = window.getSelection();
    if (!tampil || !sel || !sel.rangeCount || sel.isCollapsed) return;
    var r = sel.getRangeAt(0);
    if (!$("naskah").contains(r.commonAncestorContainer)) return;
    var h = K.analisis(tampil.struktur, r, tampil.no, gaya());
    if (!h) return;
    h.uu = tampil.uu;
    blok = h;
    perbarui();
  }

  // Sebutan UU: bawaan singkat (UU KUP), juga pada sebutan pertama; penulis teks yang
  // menambahkan nama lengkap sendiri bila perlu.
  function namaUU(k) {
    var n = atur.nama[k];
    if (atur.sebutan === "lengkap") return n.lengkap;
    if (atur.sebutan === "sedang") return n.sedang;
    return n.singkat;
  }

  function sumber() { return bukaKeranjang && atur.keranjang.length ? atur.keranjang : (blok ? [blok] : []); }

  function susun(items, untukHost) {
    return K.susun(items, {
      pola: atur[polaKunci()], templat: atur.templat, juncto: atur.juncto,
      nama: namaUU, bawah: untukHost === "Excel" && atur.excel === "bawah"
    });
  }

  function perbarui() {
    var r = $("rujukan");
    if (blok) {
      r.className = "rujukan";
      r.textContent = blok.rujukan + " " + atur.nama[blok.uu].singkat + (blok.terpotong ? " (kutipan sebagian)" : "");
    } else {
      r.className = "rujukan kosong";
      r.textContent = "Blok teks pasal yang mau dikutip.";
    }
    var pola = atur[polaKunci()];
    Array.prototype.forEach.call(document.querySelectorAll("[data-pola]"), function (b) {
      b.setAttribute("aria-checked", b.getAttribute("data-pola") === pola ? "true" : "false");
    });
    var items = sumber();
    $("pratinjau").textContent = items.length ? K.polos(susun(items, host)) : "";
    $("jumlah-keranjang").textContent = atur.keranjang.length;
    var ol = $("isi-keranjang");
    ol.innerHTML = "";
    atur.keranjang.forEach(function (it, i) {
      var li = document.createElement("li");
      li.textContent = it.rujukan + " " + atur.nama[it.uu].singkat;
      var x = document.createElement("button");
      x.type = "button";
      x.className = "ikon";
      x.textContent = "×";
      x.setAttribute("aria-label", "Hapus dari keranjang");
      x.onclick = function () { atur.keranjang.splice(i, 1); simpanAtur(); perbarui(); };
      li.appendChild(x);
      ol.appendChild(li);
    });
    var w = (blok && blok.peringatan || []).join(" ");
    if (w) { pesan(w, true); adaPeringatan = true; }
    else if (adaPeringatan) { pesan(""); adaPeringatan = false; }
  }

  /* ---------- Menyisipkan ---------- */
  function salinClipboard(teks) {
    function cadangan() {
      var ta = document.createElement("textarea");
      ta.value = teks;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { }
      document.body.removeChild(ta);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(teks).catch(cadangan);
    } catch (e) { }
    cadangan();
    return Promise.resolve();
  }

  var INDEN = 24; // poin (1/3 inci)
  function sisipWord(h) {
    return Word.run(function (ctx) {
      var sel = ctx.document.getSelection();
      if (h.sebaris !== undefined) {
        var r = sel.insertText(h.sebaris, "Replace");
        r.select("End");
        return ctx.sync();
      }
      var b0 = h.blok[0];
      var r0 = sel.insertText((b0.label ? b0.label + " " : "") + b0.teks, "Replace");
      var para = r0.paragraphs.getFirst();
      para.load("leftIndent,isListItem");
      return ctx.sync().then(function () {
        var dasar = para.leftIndent || 0;
        var lepasDaftar = para.isListItem && Office.context.requirements.isSetSupported("WordApi", "1.3");
        var akhir = para;
        var min = Math.min.apply(null, h.blok.slice(1).map(function (b) { return b.tingkat; }).concat([99]));
        h.blok.slice(1).forEach(function (b) {
          var p = akhir.insertParagraph((b.label ? b.label + "\t" : "") + b.teks, "After");
          if (lepasDaftar) p.detachFromList();
          var t = h.tanpaKepala ? 0 : Math.max(0, b.tingkat - min);
          p.leftIndent = dasar + t * INDEN + (b.label ? INDEN : 0);
          p.firstLineIndent = b.label ? -INDEN : 0;
          akhir = p;
        });
        akhir.getRange("End").select();
        return ctx.sync();
      });
    });
  }

  function sisipExcel(h) {
    var baris = h.sebaris !== undefined ? [h.sebaris] : h.blok.map(function (b) {
      return new Array(Math.max(0, b.tingkat) + 1).join("   ") + (b.label ? b.label + " " : "") + b.teks;
    });
    var aman = function (t) { return /^[=+@]/.test(t) ? "'" + t : t; };
    return Excel.run(function (ctx) {
      var c = ctx.workbook.getActiveCell();
      c.load("values,address");
      return ctx.sync().then(function () {
        if (atur.excel === "bawah" && baris.length > 1) {
          var r = c.getResizedRange(baris.length - 1, 0);
          r.values = baris.map(function (t) { return [aman(t)]; });
        } else {
          var teks = baris.join("\n");
          if (atur.excel === "tambah") {
            var lama = c.values[0][0];
            if (lama !== "" && lama !== null && lama !== undefined) teks = String(lama) + "\n" + teks;
          }
          if (teks.length > 32767) throw new Error("Teks melebihi batas satu sel Excel (32.767 karakter). Pilih 'Isi ke bawah'.");
          c.values = [[aman(teks)]];
          if (teks.indexOf("\n") >= 0) c.format.wrapText = true;
        }
        return ctx.sync();
      });
    });
  }

  function sisipkan(items) {
    if (!items.length) { pesan("Blok dulu teks pasal yang mau dikutip.", true); return; }
    pesan("");
    Promise.resolve().then(function () {
      var h = susun(items, host);
      var teks = K.polos(h);
      salinClipboard(teks);
      if (host === "Word") return sisipWord(h).then(function () { pesan("Disisipkan di Word dan disalin ke clipboard."); });
      if (host === "Excel") return sisipExcel(h).then(function () { pesan("Dimasukkan ke sel dan disalin ke clipboard."); });
      pesan("Disalin ke clipboard. Tempel dengan Ctrl+V.");
    }).catch(function (e) {
      var kode = e && (e.code || "");
      if (/CellEditMode|InvalidOperationInCellEditMode/i.test(kode + " " + (e.message || ""))) {
        pesan("Sel Excel masih dalam mode edit. Tekan Enter atau Esc dulu, lalu klik Sisipkan lagi.", true);
      } else {
        pesan("Gagal menyisipkan: " + (e && e.message ? e.message : e) + ". Teks sudah disalin ke clipboard.", true);
      }
    }).then(perbarui);
  }

  /* ---------- Pengaturan ---------- */
  function bukaAtur() {
    var f = $("atur").querySelector("form");
    f.ayat.value = atur.ayat;
    f.juncto.value = atur.juncto;
    f.sebutan.value = atur.sebutan;
    "ABCDEF".split("").forEach(function (p) { f["t" + p].value = atur.templat[p]; });
    var fs = $("atur-uu");
    fs.querySelectorAll(".uu-nama").forEach(function (x) { x.remove(); });
    DAFTAR_UU.forEach(function (u) {
      var d = document.createElement("div");
      d.className = "uu-nama";
      d.innerHTML = "<strong></strong><label>Singkat <input data-uu='" + u.k + "' data-bag='singkat'></label>" +
        "<label>Sedang <input data-uu='" + u.k + "' data-bag='sedang'></label>" +
        "<label>Lengkap <textarea rows='3' data-uu='" + u.k + "' data-bag='lengkap'></textarea></label>";
      d.querySelector("strong").textContent = atur.nama[u.k].singkat;
      d.querySelectorAll("[data-bag]").forEach(function (i) { i.value = atur.nama[u.k][i.getAttribute("data-bag")]; });
      fs.appendChild(d);
    });
    var dlg = $("atur");
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  }
  function tutupAtur(simpan) {
    var dlg = $("atur"), f = dlg.querySelector("form");
    if (simpan) {
      atur.ayat = f.ayat.value;
      atur.juncto = f.juncto.value;
      atur.sebutan = f.sebutan.value;
      "ABCDEF".split("").forEach(function (p) { atur.templat[p] = f["t" + p].value || TEMPLAT[p]; });
      dlg.querySelectorAll("[data-uu]").forEach(function (i) {
        var v = i.value.trim();
        if (v) atur.nama[i.getAttribute("data-uu")][i.getAttribute("data-bag")] = v;
      });
      simpanAtur();
      bacaUlang();
    }
  }
  function bacaUlang() {
    // Gaya "Ayat" mungkin berubah: hitung ulang blok yang masih terseleksi
    bacaBlok();
    perbarui();
  }

  /* ---------- Saring ---------- */
  function saring() {
    var q = $("saring").value.trim();
    var n = naskah[atur.uu];
    if (!n) return;
    $("info-saring").textContent = "";
    if (!q) { isiPilihanPasal(n.pasal); $("pilih-pasal").value = tampil ? tampil.id : ""; return; }
    var m = q.match(/^(?:pasal\s*)?(\d+[a-z]?)$/i);
    if (m) {
      var id = "pasal-" + m[1].toLowerCase();
      if (n.pasal.some(function (p) { return p.id === id; })) {
        isiPilihanPasal(n.pasal);
        tampilkan(atur.uu, id);
      } else $("info-saring").textContent = "Pasal " + m[1] + " tidak ada di " + atur.nama[atur.uu].singkat + ".";
      return;
    }
    if (q.length < 3) return;
    var kata = q.toLowerCase().split(/\s+/);
    var cocok = n.pasal.filter(function (p) { return kata.every(function (w) { return p.teks.indexOf(w) >= 0; }); });
    $("info-saring").textContent = cocok.length ? cocok.length + " pasal memuat kata itu." : "Tidak ada pasal yang memuat kata itu.";
    if (cocok.length) {
      isiPilihanPasal(cocok);
      tampilkan(atur.uu, cocok[0].id, q);
    }
  }

  /* ---------- Mulai ---------- */
  function mulai() {
    var su = $("pilih-uu");
    DAFTAR_UU.forEach(function (u) {
      var o = document.createElement("option");
      o.value = u.k;
      o.textContent = u.singkat;
      su.appendChild(o);
    });
    su.value = atur.uu;
    su.onchange = function () {
      $("saring").value = "";
      $("info-saring").textContent = "";
      muatUU(su.value).then(function (n) {
        isiPilihanPasal(n.pasal);
        tampilkan(su.value, atur.pasal[su.value] || n.pasal[0].id);
      });
    };
    $("pilih-pasal").onchange = function () { tampilkan(atur.uu, this.value, $("saring").value.trim().length >= 3 ? $("saring").value.trim() : null); };
    function geser(d) {
      var sel = $("pilih-pasal");
      var i = sel.selectedIndex + d;
      if (i >= 0 && i < sel.options.length) { sel.selectedIndex = i; sel.onchange(); }
    }
    $("mundur").onclick = function () { geser(-1); };
    $("maju").onclick = function () { geser(1); };
    var tunda;
    $("saring").addEventListener("input", function () { clearTimeout(tunda); tunda = setTimeout(saring, 300); });

    document.addEventListener("selectionchange", function () { clearTimeout(bacaBlok.t); bacaBlok.t = setTimeout(bacaBlok, 120); });
    $("naskah").addEventListener("mouseup", bacaBlok);

    Array.prototype.forEach.call(document.querySelectorAll("[data-pola]"), function (b) {
      b.onclick = function () { atur[polaKunci()] = b.getAttribute("data-pola"); simpanAtur(); perbarui(); };
    });
    $("mode-excel").value = atur.excel;
    $("mode-excel").onchange = function () { atur.excel = this.value; simpanAtur(); perbarui(); };
    $("sisipkan").onclick = function () { sisipkan(blok ? [blok] : []); };
    $("ke-keranjang").onclick = function () {
      if (!blok) { pesan("Blok dulu teks pasal yang mau dimasukkan ke keranjang.", true); return; }
      atur.keranjang.push(JSON.parse(JSON.stringify(blok)));
      simpanAtur();
      pesan("Masuk keranjang: " + blok.rujukan + " " + atur.nama[blok.uu].singkat + ".");
      perbarui();
    };
    $("buka-keranjang").onclick = function () {
      bukaKeranjang = !bukaKeranjang;
      $("keranjang").hidden = !bukaKeranjang;
      this.setAttribute("aria-expanded", bukaKeranjang ? "true" : "false");
      perbarui();
    };
    $("sisipkan-keranjang").onclick = function () { sisipkan(atur.keranjang.slice()); };
    $("kosongkan").onclick = function () { atur.keranjang = []; simpanAtur(); perbarui(); };

    $("tombol-atur").onclick = bukaAtur;
    $("atur").addEventListener("close", function () { tutupAtur(this.returnValue === "simpan"); });
    $("kembalikan").onclick = function () {
      var b = bawaan();
      atur.ayat = b.ayat; atur.juncto = b.juncto; atur.sebutan = b.sebutan; atur.templat = b.templat; atur.nama = b.nama;
      simpanAtur();
      $("atur").close("batal");
      bacaUlang();
    };

    $("pilihan-excel").hidden = host !== "Excel";
    document.body.setAttribute("data-host", host || "luar");
    muatUU(atur.uu).then(function (n) {
      isiPilihanPasal(n.pasal);
      return tampilkan(atur.uu, atur.pasal[atur.uu] || n.pasal[0].id);
    }).catch(function (e) { pesan("Naskah tidak bisa dimuat: " + e.message, true); });
    perbarui();
  }

  var sudahMulai = false;
  function sekali(h) { if (sudahMulai) return; sudahMulai = true; host = h; mulai(); }
  if (window.Office && Office.onReady) {
    Office.onReady(function (info) {
      var h = info && info.host;
      sekali(h === Office.HostType.Word ? "Word" : h === Office.HostType.Excel ? "Excel" : null);
    });
    setTimeout(function () { sekali(null); }, 4000);
  } else {
    sekali(null);
  }

  window.TKPKutip = { atur: function () { return atur; }, blok: function () { return blok; }, susun: susun };
})();
