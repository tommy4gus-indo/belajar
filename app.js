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
  addDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
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
const halamanApp = $("halaman-app");
const memuat = $("memuat");
const formAuth = $("form-auth");
const errorEl = $("error");
const statusProfil = $("status-profil");

let modeDaftar = false;   // false = masuk, true = daftar
let namaSaya = "";        // nama dari profil (dipakai sebagai nama di chat)
let hentiChat = null;     // fungsi untuk berhenti mendengarkan chat

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

// ---------- LOGIN / DAFTAR ----------

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

$("tombol-keluar").addEventListener("click", () => signOut(auth));

// ---------- TAB CHAT / PROFIL ----------

function bukaTab(nama) {
  const chat = nama === "chat";
  $("bagian-chat").hidden = !chat;
  $("bagian-profil").hidden = chat;
  $("tab-chat").classList.toggle("aktif", chat);
  $("tab-profil").classList.toggle("aktif", !chat);
  if (chat) gulirKeBawah();
}
$("tab-chat").addEventListener("click", () => bukaTab("chat"));
$("tab-profil").addEventListener("click", () => bukaTab("profil"));

// ---------- PROFIL ----------

function tampilStatus(teks, adaError = false) {
  statusProfil.textContent = teks;
  statusProfil.className = adaError ? "status error" : "status";
}

async function muatProfil(user) {
  $("profil-email").value = user.email;
  $("profil-nama").value = "";
  $("profil-hp").value = "";
  namaSaya = "";
  tampilStatus("Memuat data...");

  try {
    const snap = await getDoc(doc(db, "profil", user.uid));
    if (snap.exists()) {
      const data = snap.data();
      $("profil-nama").value = data.nama || "";
      $("profil-hp").value = data.hp || "";
      namaSaya = data.nama || "";
      tampilStatus("");
    } else {
      tampilStatus("Lengkapi data kamu lalu klik Simpan.");
    }
  } catch (err) {
    tampilStatus(pesanError(err.code), true);
  }
  aturInfoChat();
}

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
    namaSaya = nama;
    aturInfoChat();
    tampilStatus("Tersimpan!");
  } catch (err) {
    tampilStatus(pesanError(err.code), true);
  } finally {
    tombol.disabled = false;
  }
});

// ---------- CHAT ----------

const KANAL = "world"; // nanti bisa diganti: id PT, id divisi, dan seterusnya
const daftarPesan = $("daftar-pesan");

function gulirKeBawah() {
  daftarPesan.scrollTop = daftarPesan.scrollHeight;
}

// Aktifkan atau matikan kolom ketik tergantung sudah ada nama atau belum
function aturInfoChat() {
  const bisa = namaSaya !== "";
  $("teks-chat").disabled = !bisa;
  $("tombol-chat").disabled = !bisa;
  $("info-chat").textContent = bisa ? "" : "Isi nama di tab Profil dulu supaya bisa chat.";
}

function formatJam(ts) {
  if (!ts) return "";
  return ts.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

// Tampilkan daftar pesan (pakai textContent supaya aman dari kode jahat)
function gambarPesan(snapshot) {
  const dekatBawah =
    daftarPesan.scrollHeight - daftarPesan.scrollTop - daftarPesan.clientHeight < 80;

  const uidSaya = auth.currentUser ? auth.currentUser.uid : null;
  const urut = snapshot.docs.map((d) => d.data({ serverTimestamps: "estimate" })).reverse();

  daftarPesan.replaceChildren();
  if (urut.length === 0) {
    const kosong = document.createElement("p");
    kosong.className = "status";
    kosong.textContent = "Belum ada pesan. Jadi yang pertama menyapa!";
    daftarPesan.appendChild(kosong);
  }

  for (const p of urut) {
    const gelembung = document.createElement("div");
    gelembung.className = "pesan" + (p.uid === uidSaya ? " saya" : "");

    const nama = document.createElement("div");
    nama.className = "pesan-nama";
    nama.textContent = p.nama;

    const teks = document.createElement("div");
    teks.className = "pesan-teks";
    teks.textContent = p.teks;

    const jam = document.createElement("div");
    jam.className = "pesan-jam";
    jam.textContent = formatJam(p.waktu);

    gelembung.append(nama, teks, jam);
    daftarPesan.appendChild(gelembung);
  }

  if (dekatBawah || urut.length > 0 && !daftarPesan.dataset.sudahGulir) {
    gulirKeBawah();
    daftarPesan.dataset.sudahGulir = "1";
  }
}

function mulaiChat() {
  if (hentiChat) hentiChat();
  delete daftarPesan.dataset.sudahGulir;
  const q = query(
    collection(db, "chat", KANAL, "pesan"),
    orderBy("waktu", "desc"),
    limit(50)
  );
  hentiChat = onSnapshot(
    q,
    gambarPesan,
    (err) => { $("info-chat").textContent = pesanError(err.code); }
  );
}

function hentikanChat() {
  if (hentiChat) { hentiChat(); hentiChat = null; }
  daftarPesan.replaceChildren();
}

$("form-chat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const input = $("teks-chat");
  const teks = input.value.trim();
  if (!user || !namaSaya || !teks) return;

  input.value = "";
  try {
    await addDoc(collection(db, "chat", KANAL, "pesan"), {
      teks,
      uid: user.uid,
      nama: namaSaya,
      waktu: serverTimestamp()
    });
  } catch (err) {
    input.value = teks; // kembalikan teks supaya tidak hilang
    $("info-chat").textContent = pesanError(err.code);
  }
});

// ---------- STATUS LOGIN ----------

onAuthStateChanged(auth, (user) => {
  memuat.hidden = true;
  if (user) {
    halamanLogin.hidden = true;
    halamanApp.hidden = false;
    bukaTab("chat");
    aturInfoChat();
    muatProfil(user);
    mulaiChat();
  } else {
    hentikanChat();
    namaSaya = "";
    halamanApp.hidden = true;
    halamanLogin.hidden = false;
  }
});

// Daftarkan service worker (supaya bisa di-install dan jalan offline)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
