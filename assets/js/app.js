/* Toolkit Pajak — perilaku bersama semua halaman */
(function () {
  "use strict";

  var simpan = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Ukuran huruf yang dipilih pengguna
  var fs = parseFloat(simpan.get("tkp-fs"));
  if (fs >= 0.85 && fs <= 1.6) document.documentElement.style.setProperty("--fs", fs + "rem");

  function aturHuruf(delta) {
    var kini = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--fs")) || 1.0625;
    var baru = Math.min(1.6, Math.max(0.85, Math.round((kini + delta) * 100) / 100));
    document.documentElement.style.setProperty("--fs", baru + "rem");
    simpan.set("tkp-fs", String(baru));
  }

  function istilah(q) {
    return (q || "").toLowerCase().replace(/\s+/g, " ").trim().split(" ").filter(function (t) { return t.length > 0; });
  }

  // Sorotan tanpa mengubah DOM (CSS Custom Highlight API); diabaikan bila tidak didukung
  function sorot(akar, terms) {
    if (!window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
    CSS.highlights.delete("tkp");
    if (!terms.length || !akar) return;
    var ranges = [];
    var akarList = akar.length !== undefined ? akar : [akar];
    for (var a = 0; a < akarList.length; a++) {
      var w = document.createTreeWalker(akarList[a], NodeFilter.SHOW_TEXT);
      var n;
      while ((n = w.nextNode())) {
        var teks = n.nodeValue.toLowerCase();
        for (var i = 0; i < terms.length; i++) {
          var t = terms[i], p = teks.indexOf(t);
          while (p > -1 && ranges.length < 2000) {
            var r = new Range();
            r.setStart(n, p); r.setEnd(n, p + t.length);
            ranges.push(r);
            p = teks.indexOf(t, p + t.length);
          }
        }
      }
    }
    if (ranges.length) CSS.highlights.set("tkp", new Highlight(...ranges));
  }

  function bukaSampai(el) {
    var d = el;
    while (d) {
      if (d.tagName === "DETAILS") d.open = true;
      d = d.parentElement;
    }
  }

  function keHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    bukaSampai(el);
    var q = new URLSearchParams(location.search).get("q");
    if (q) {
      // buka juga penjelasan yang memuat kata yang dicari
      var terms = istilah(q.replace(/pasal\s+\d+[a-z]*/ig, " "));
      el.querySelectorAll("details").forEach(function (d) {
        var tx = d.textContent.toLowerCase();
        if (terms.length && terms.every(function (t) { return tx.indexOf(t) > -1; })) d.open = true;
      });
      sorot(el, terms);
    }
    requestAnimationFrame(function () { el.scrollIntoView({ block: "start" }); });
  }

  // Penyaring pasal di halaman naskah
  function pasangSaring() {
    var kotak = document.querySelector(".saring");
    if (!kotak) return;
    var input = kotak.querySelector("input");
    var hasil = kotak.querySelector(".hasil");
    var blok = Array.prototype.slice.call(document.querySelectorAll("main details.pasal, main details.blok"));
    var judul = Array.prototype.slice.call(document.querySelectorAll("main .bab, main .bagian"));
    var cache = blok.map(function (d) { return d.textContent.toLowerCase(); });
    var timer;

    function jalankan() {
      var terms = istilah(input.value);
      if (!terms.length) {
        blok.forEach(function (d) { d.hidden = false; });
        judul.forEach(function (h) { h.hidden = false; });
        hasil.textContent = "";
        sorot(null, []);
        return;
      }
      var cocok = [];
      blok.forEach(function (d, i) {
        var ok = terms.every(function (t) { return cache[i].indexOf(t) > -1; });
        d.hidden = !ok;
        if (ok) cocok.push(d);
      });
      judul.forEach(function (h) { h.hidden = true; });
      if (cocok.length && cocok.length <= 15) {
        cocok.forEach(function (d) {
          d.open = true;
          d.querySelectorAll("details").forEach(function (p) {
            var tx = p.textContent.toLowerCase();
            p.open = terms.every(function (t) { return tx.indexOf(t) > -1; });
          });
        });
      }
      sorot(cocok, terms);
      hasil.textContent = cocok.length
        ? cocok.length + " bagian memuat “" + input.value.trim() + "”" + (cocok.length > 15 ? ". Ketuk salah satu untuk membukanya." : "")
        : "Tidak ada bagian yang memuat “" + input.value.trim() + "”. Coba kata lain, atau cari di semua UU.";
    }
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(jalankan, 200); });

    document.querySelectorAll(".perkakas [data-aksi]").forEach(function (b) {
      b.addEventListener("click", function () {
        var aksi = b.getAttribute("data-aksi");
        if (aksi === "buka") blok.forEach(function (d) { if (!d.hidden) d.open = true; });
        if (aksi === "tutup") document.querySelectorAll("main details").forEach(function (d) { d.open = false; });
        if (aksi === "kecil") aturHuruf(-0.0625);
        if (aksi === "besar") aturHuruf(0.0625);
      });
    });

    var lompat = document.querySelector(".perkakas select");
    if (lompat) lompat.addEventListener("change", function () {
      if (!lompat.value) return;
      input.value = ""; jalankan();
      history.replaceState(null, "", "#" + lompat.value);
      keHash();
      lompat.value = "";
    });
  }

  // Tombol kembali ke atas
  function pasangKeAtas() {
    var b = document.querySelector(".ke-atas");
    if (!b) return;
    var tampil = false;
    window.addEventListener("scroll", function () {
      var perlu = window.scrollY > 800;
      if (perlu !== tampil) { tampil = perlu; b.hidden = !perlu; }
    }, { passive: true });
    b.addEventListener("click", function () { window.scrollTo(0, 0); });
  }

  // Pasang aplikasi (Android/Chrome) + petunjuk iPhone
  function pasangInstal() {
    var tombol = document.getElementById("tombol-pasang");
    var ios = document.getElementById("petunjuk-ios");
    var mandiri = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (mandiri) return;
    var tunda = null;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); tunda = e;
      if (tombol) tombol.hidden = false;
    });
    if (tombol) tombol.addEventListener("click", function () {
      if (!tunda) return;
      tunda.prompt();
      tunda.userChoice.finally(function () { tunda = null; tombol.hidden = true; });
    });
    if (ios && /iphone|ipad|ipod/i.test(navigator.userAgent)) ios.hidden = false;
  }

  // Service worker + pemberitahuan versi baru
  function pasangSW() {
    if (!("serviceWorker" in navigator)) return;
    var akar = document.documentElement.getAttribute("data-akar") || "./";
    navigator.serviceWorker.register(akar + "sw.js").then(function (reg) {
      function tawarkan(sw) {
        if (document.querySelector(".toast")) return;
        var t = document.createElement("div");
        t.className = "toast"; t.setAttribute("role", "status");
        t.innerHTML = "<span>Versi baru tersedia.</span><button type='button'>Muat ulang</button>";
        t.querySelector("button").addEventListener("click", function () { sw.postMessage("lewati"); });
        document.body.appendChild(t);
      }
      if (reg.waiting && navigator.serviceWorker.controller) tawarkan(reg.waiting);
      reg.addEventListener("updatefound", function () {
        var baru = reg.installing;
        baru.addEventListener("statechange", function () {
          if (baru.state === "installed" && navigator.serviceWorker.controller) tawarkan(baru);
        });
      });
    }).catch(function () {});
    var sudah = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (sudah) return; sudah = true; location.reload();
    });
  }

  window.TKP = { istilah: istilah, sorot: sorot };

  document.addEventListener("DOMContentLoaded", function () {
    pasangSaring();
    pasangKeAtas();
    pasangInstal();
    keHash();
    window.addEventListener("hashchange", keHash);
    pasangSW();
  });
})();
