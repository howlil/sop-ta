# Concurrency Testing Fitur Autosave SOP

Dokumen ini menjelaskan correctness dan load testing ketika beberapa anggota OPD mengedit SOP yang sama secara paralel.

## Tujuan

Pastikan autosave tidak menghasilkan data parsial dan, khusus section replace-all, tidak mengizinkan snapshot lama menimpa perubahan yang sudah lebih baru.

Area yang diuji:

- header partial patch tetap dapat menggabungkan perubahan pada field berbeda;
- prosedur dan konfigurasi diagram memakai optimistic concurrency;
- stale writer menerima konflik eksplisit, bukan silent overwrite;
- local draft tidak dianggap tersimpan ketika server menolak write;
- performa tetap terukur saat contention tinggi.

## Mekanisme Optimistic Concurrency

`DetailSOP` memiliki counter terpisah:

- `prosedurRevision` untuk replace-all pelaksana/langkah;
- `diagramRevision` untuk konfigurasi diagram.

Workbench mengirim revision terbaru ke client. Setiap PATCH prosedur/diagram wajib membawa `expectedRevision`.

Server melakukan compare-and-swap atomik di transaction yang sama dengan write domain:

```text
client expectedRevision = 12
        |
        v
UPDATE DetailSOP
WHERE detailSopId = ? AND prosedurRevision = 12
SET prosedurRevision = 13
        |
        +-- count = 1 -> lanjut replace-all
        |
        +-- count = 0 -> 409 SOP_EDIT_CONFLICT
```

Claim revision dilakukan sebelum delete/replace data. Karena check + increment berada pada satu atomic update, implementasi tidak memakai pola read-version-then-write yang rentan TOCTOU.

Response stale write:

```json
{
  "statusCode": 409,
  "code": "SOP_EDIT_CONFLICT",
  "section": "PROSEDUR",
  "message": "SOP telah berubah sejak versi ini dibuka. Draft lokal tidak ditimpa; ambil versi terbaru sebelum menyimpan lagi."
}
```

Autosave client hanya memajukan baseline dan revision setelah response sukses. Jika mendapat `409`, local draft tetap berbeda dari baseline dan status autosave menjadi error.

## Rekomendasi Tools

| Tool | Cocok untuk | Catatan |
| :--- | :--- | :--- |
| Playwright API testing | Correctness concurrency, auth cookie, final-state assertions | Dipakai untuk race deterministik `200 + 409`. |
| k6 | Load/contention, latency, handled-conflict rate | `409 SOP_EDIT_CONFLICT` adalah controlled outcome, bukan transport failure. |
| Artillery | Alternatif load test, terutama bila nanti memakai WebSocket | Autosave saat ini tetap HTTP PATCH. |

## Test Case

### CONC-01: Header Paralel pada Field Berbeda

Tujuan: memastikan partial patch header tetap mengizinkan perubahan independen.

Langkah:

1. Login sebagai `PENYUSUN` dan `PJ_PENYUSUN` dari OPD yang sama.
2. Buat SOP draft.
3. Kirim paralel:
   - User A mengubah `namaLembaga`.
   - User B mengubah `lampiran.peringatan`.
4. Ambil ulang workbench.

Ekspektasi:

- kedua request HTTP `200`;
- kedua perubahan tersimpan;
- log edit `HEADER` terbentuk.

Header tidak memakai satu global document revision karena partial updates pada field berbeda memang aman digabungkan dan tidak perlu dibuat saling konflik.

Status: otomatis di `client/e2e/sop-concurrency.spec.ts`.

### CONC-02: Stale Replace-All Prosedur Ditolak

Tujuan: memastikan dua user yang menulis prosedur dari snapshot revision yang sama tidak dapat saling menimpa diam-diam.

Langkah:

1. Dua user membuka workbench yang sama dan memperoleh `prosedurRevision = N`.
2. Keduanya membentuk payload prosedur berbeda.
3. Kedua request dikirim hampir bersamaan dengan `expectedRevision = N`.
4. Ambil ulang workbench.

Ekspektasi:

- tepat satu request HTTP `200`;
- tepat satu request HTTP `409`;
- response konflik memiliki `code = SOP_EDIT_CONFLICT` dan `section = PROSEDUR`;
- revision final = `N + 1`;
- prosedur final persis sama dengan payload winner, bukan campuran;
- stale writer tidak menyentuh langkah/swimlane dan tidak meng-overwrite winner.

Status: otomatis di `client/e2e/sop-concurrency.spec.ts`, dengan unit test tambahan yang memastikan stale CAS gagal sebelum operasi replace-all.

### CONC-03: Diagram Stale Ditolak

Konfigurasi diagram memakai prinsip yang sama melalui `diagramRevision`.

Ekspektasi:

- save sukses menaikkan revision;
- save berikutnya memakai revision dari response sukses, tanpa menunggu rerender React;
- stale revision mendapat `409 SOP_EDIT_CONFLICT` dengan `section = DIAGRAM`;
- baseline diagram tidak maju ketika save gagal.

### CONC-04: Load Autosave 20-100 Pengguna

Gunakan `server/scripts/k6-sop-autosave-concurrency.js`.

Setiap VU membaca revision terbaru sebelum mencoba replace-all prosedur. Karena beberapa VU dapat membaca revision yang sama sebelum salah satunya menang, `409 SOP_EDIT_CONFLICT` adalah hasil valid dari contention dan dihitung terpisah sebagai `optimistic_conflicts`.

Threshold awal:

- `http_req_failed < 1%` dengan HTTP `409` optimistic conflict didefinisikan sebagai expected status;
- p95 < 2000 ms;
- p99 < 3000 ms;
- `autosave_handled_rate > 99%`;
- `unexpected_autosave_errors = 0`.

`400`, `422`, dan `500` untuk payload valid tetap dianggap error. Jumlah `409` tidak dipaksa menjadi nol karena semakin tinggi contention, semakin banyak conflict yang memang seharusnya ditolak untuk mencegah lost update.

Contoh:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:3000/api/v1"
$env:VUS = "50"
$env:DURATION = "2m"
k6 run server/scripts/k6-sop-autosave-concurrency.js
```

## Menjalankan Correctness Test

```powershell
cd client
pnpm test:e2e sop-concurrency.spec.ts --project=chromium
```

Pastikan backend dan database test/dev aktif dan seed user tersedia.

## Invariant Utama

```text
partial independent header edits
        -> dapat sama-sama sukses

replace-all prosedur / diagram
        -> stale snapshot tidak boleh overwrite
        -> winner increments revision
        -> loser receives explicit 409
        -> local draft tetap tersedia
```
