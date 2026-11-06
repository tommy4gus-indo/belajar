import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Config Firebase proyek kamu
const firebaseConfig = {
  apiKey: "AIzaSyBSlVP7L6Mh6mGr5GrZALO7bta0rzj84ig",
  authDomain: "tommy-ki.firebaseapp.com",
  projectId: "tommy-ki",
  storageBucket: "tommy-ki.firebasestorage.app",
  messagingSenderId: "767490230447",
  appId: "1:767490230447:web:ab2268c80d3e6212b8ec5a",
  measurementId: "G-Y87NKHYRE6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Ambil elemen-elemen di halaman
const $ = (id) => document.getElementById(id);
const halamanLogin = $("halaman-login");
const halamanUtama = $("halaman-utama");
const memuat = $("memuat");
const formAuth = $("form-auth");
const errorEl = $("error");
const statusProfil = $("status-profil");

let modeDaftar = false; // false = masuk, true = daftar

// Terjemahan pesan error supaya mudah dimengerti
function pesanError(kode) {
  const daftar = {
    "auth/invalid-email": "Format email tidak benar.",
    "auth/missing-password": "Password belum diisi.",
    "auth/weak-password": "Password terlalu pendek, minimal 6 karakter.",
    "auth/email-already-in-use": "Email ini sudah terdaftar. Coba masuk saja.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
    "auth/network-request-failed": "Tidak ada koneksi internet.",
    "auth/operation-not-allowed": "Login Email/Password belum diaktifkan di Firebase.",
    "permission-denied": "Tidak punya izin. Cek Rules di Firestore.",
    "unavailable": "Tidak ada koneksi internet."
  };
  return daftar[kode] || "Terjadi kesalahan: " + kode;
}

// Ganti tampilan antara Masuk dan Daftar
function aturMode() {
  $("judul-form").textContent = modeDaftar ? "Daftar" : "Masuk";
  $("tombol-kirim").textContent = modeDaftar ? "Daftar" : "Masuk";
  $("teks-ganti").textContent = modeDaftar ? "Sudah punya akun?" : "Belum punya akun?";
  $("link-ganti").textContent = modeDaftar ? "Masuk" : "Daftar";
  $("password").autocomplete = modeDaftar ? "new-password" : "current-password";
  errorEl.textContent = "";
}

$("link-ganti").addEventListener("click", (e) => {
  e.preventDefault();
  modeDaftar = !modeDaftar;
  aturMode();
});

// Saat form login/daftar dikirim
formAuth.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const tombol = $("tombol-kirim");
  tombol.disabled = true;

  const email = $("email").value.trim();
  const password = $("password").value;

  try {
    if (modeDaftar) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    formAuth.reset();
  } catch (err) {
    errorEl.textContent = pesanError(err.code);
  } finally {
    tombol.disabled = false;
  }
});

// Tombol keluar
$("tombol-keluar").addEventListener("click", () => signOut(auth));

// ---------- PROFIL ----------

function tampilStatus(teks, adaError = false) {
  statusProfil.textContent = teks;
  statusProfil.className = adaError ? "status error" : "status";
}

// Ambil data profil dari Firestore dan isi ke form
async function muatProfil(user) {
  $("profil-email").value = user.email;
  $("profil-nama").value = "";
  $("profil-hp").value = "";
  tampilStatus("Memuat data...");

  try {
    const snap = await getDoc(doc(db, "profil", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      $("profil-nama").value = data.nama || "";
      $("profil-hp").value = data.hp || "";
      tampilStatus("");
    } else {
      tampilStatus("Lengkapi data kamu lalu klik Simpan.");
    }
  } catch (err) {
    tampilStatus(pesanError(err.code), true);
  }
}

// Simpan data profil ke Firestore
$("form-profil").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const nama = $("profil-nama").value.trim();
  const hp = $("profil-hp").value.trim();

  if (!/^[0-9+\-\s]{8,20}$/.test(hp)) {
    tampilStatus("Nomor HP tidak valid. Isi angka saja, minimal 8 digit.", true);
    return;
  }

  const tombol = $("tombol-simpan");
  tombol.disabled = true;
  tampilStatus("Menyimpan...");

  try {
    await setDoc(
      doc(db, "profil", user.uid),
      { nama, hp, email: user.email, diubah: serverTimestamp() },
      { merge: true }
    );
    tampilStatus("Tersimpan!");
  } catch (err) {
    tampilStatus(pesanError(err.code), true);
  } finally {
    tombol.disabled = false;
  }
});

// Dipanggil otomatis tiap status login berubah (login, keluar, atau buka ulang app)
onAuthStateChanged(auth, (user) => {
  memuat.hidden = true;
  if (user) {
    halamanLogin.hidden = true;
    halamanUtama.hidden = false;
    muatProfil(user);
  } else {
    halamanUtama.hidden = true;
    halamanLogin.hidden = false;
  }
});

// Daftarkan service worker (supaya bisa di-install dan jalan offline)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
