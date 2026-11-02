// Aksi tombol
document.getElementById("tombol").addEventListener("click", () => {
  document.getElementById("pesan").textContent = "Berhasil! Kamu sudah bikin aplikasi pertama.";
});

// Daftarkan service worker (supaya bisa di-install dan jalan offline)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
