/* Toolkit Pajak — pencarian di semua naskah (berjalan di perangkat, tanpa server) */
(function () {
  "use strict";
  var form = document.getElementById("form-cari");
  var input = document.getElementById("q");
  var status = document.getElementById("status-cari");
  var daftar = document.getElementById("hasil-cari");
  var data = null;

  function norm(s) { return s.toLowerCase(); }

  function muat() {
    if (data) return Promise.resolve(data);
    status.textContent = "Menyiapkan indeks…";
    return fetch("assets/data/cari.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d.map(function (e) { e.tl = norm(e.t); e.xl = norm(e.x); return e; });
      return data;
    });
  }

  function escape(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function potongan(e, terms) {
    var p = terms.length ? e.xl.indexOf(terms[0]) : 0;
    if (p < 0) p = 0;
    var mulai = Math.max(0, p - 70), akhir = Math.min(e.x.length, p + 160);
    var s = (mulai > 0 ? "… " : "") + e.x.slice(mulai, akhir) + (akhir < e.x.length ? " …" : "");
    var h = escape(s);
    terms.forEach(function (t) {
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      h = h.replace(re, "<mark>$1</mark>");
    });
    return h;
  }

  function cari(q) {
    var terms = TKP.istilah(q);
    if (!terms.length) { daftar.innerHTML = ""; status.textContent = ""; return; }
    // "pasal 17" → utamakan judul pasal yang persis
    var pasal = /pasal\s+(\d+[a-z]?)/i.exec(q);
    muat().then(function (d) {
      var hasil = [];
      for (var i = 0; i < d.length; i++) {
        var e = d[i], skor = 0, semua = true;
        for (var j = 0; j < terms.length; j++) {
          var t = terms[j];
          var diJudul = e.tl.indexOf(t) > -1, diIsi = e.xl.indexOf(t) > -1;
          if (!diJudul && !diIsi) { semua = false; break; }
          if (diJudul) skor += 20;
          if (diIsi) skor += Math.min(10, e.xl.split(t).length - 1);
        }
        if (!semua) continue;
        if (pasal && new RegExp("pasal " + pasal[1].toLowerCase() + "$").test(e.tl)) skor += 100;
        if (e.k === "uu") skor += 3;
        hasil.push([skor, e]);
      }
      hasil.sort(function (a, b) { return b[0] - a[0]; });
      var tampil = hasil.slice(0, 60);
      status.textContent = hasil.length
        ? hasil.length + " hasil" + (hasil.length > 60 ? ", ditampilkan 60 teratas. Tambah kata kunci untuk mempersempit." : ".")
        : "Tidak ditemukan. Periksa ejaan, atau coba kata yang lebih umum.";
      var qs = "?q=" + encodeURIComponent(q.trim());
      daftar.innerHTML = tampil.map(function (h) {
        var e = h[1], u = e.u.split("#");
        var sorot = TKP.istilah(q.replace(/pasal\s+\d+[a-z]*/ig, " "));
        return "<li><a href='" + u[0] + qs + (u[1] ? "#" + u[1] : "") + "'><span class='letak'>" + escape(e.s) +
          "</span><span class='judul'>" + escape(e.t) + "</span><span class='potong'>" + potongan(e, sorot) + "</span></a></li>";
      }).join("");
    }).catch(function () {
      status.textContent = "Indeks pencarian belum termuat. Buka aplikasi sekali saat online, lalu coba lagi.";
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    history.replaceState(null, "", "?q=" + encodeURIComponent(input.value.trim()));
    cari(input.value);
  });
  var t;
  input.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { cari(input.value); }, 300); });

  var awal = new URLSearchParams(location.search).get("q");
  if (awal) { input.value = awal; cari(awal); }
})();
