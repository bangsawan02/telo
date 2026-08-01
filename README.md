# Panduan Deploy Portal Telonime ke Cloudflare Workers

Proyek ini telah dikonfigurasi sepenuhnya agar dapat dideploy langsung ke **Cloudflare Workers** dengan fitur **Wrangler Static Assets** (Hono + React SPA).

---

## 🚀 Langkah 1: Hubungkan & Push Proyek ke GitHub

1. Ekspor atau download proyek ini (dalam bentuk file **ZIP** melalui menu ekspor AI Studio di pojok kanan atas, atau gunakan integrasi GitHub jika tersedia).
2. Di komputer lokal Anda, buka terminal dan buat repository baru:
   ```bash
   git init
   git add .
   git commit -m "Initial commit untuk Cloudflare Workers"
   ```
3. Buat repository baru di akun **GitHub** Anda.
4. Hubungkan repository lokal Anda ke GitHub dan dorong kodenya:
   ```bash
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git branch -M main
   git push -u origin main
   ```

---

## 🛠️ Langkah 2: Deploy Otomatis via GitHub Actions (Sangat Direkomendasikan)

Anda bisa mengatur agar proyek ter-deploy otomatis ke Cloudflare Workers setiap kali Anda melakukan `git push` ke GitHub.

1. Buka dashboard Cloudflare Anda, pergi ke **My Profile > API Tokens** dan buat token baru dengan izin **Cloudflare Workers (Edit Cloudflare Workers)**. Salin token tersebut.
2. Dapatkan **Account ID** Cloudflare Anda (bisa dilihat di URL dashboard Anda setelah `/dashboard/`).
3. Di repository GitHub Anda, masuk ke **Settings > Secrets and variables > Actions** dan tambahkan dua rahasia baru:
   - `CLOUDFLARE_API_TOKEN` = *API Token yang Anda salin*
   - `CLOUDFLARE_ACCOUNT_ID` = *Account ID Cloudflare Anda*
4. Buat file workflow GitHub Actions baru di `.github/workflows/deploy.yml` dengan konfigurasi berikut:

   ```yaml
   name: Deploy to Cloudflare Workers

   on:
     push:
       branches:
         - main

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout Repository
           uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-node-version: 20
             cache: 'npm'

         - name: Install Dependencies
           run: npm ci

         - name: Build and Deploy
           run: npm run deploy
           env:
             CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
             CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
   ```

---

## 💻 Langkah 3: Deploy Manual via Komputer Lokal (Opsional)

Jika Anda ingin mencoba deploy langsung dari komputer Anda:

1. Buka terminal di folder proyek lokal Anda.
2. Login ke akun Cloudflare Anda melalui Wrangler:
   ```bash
   npx wrangler login
   ```
3. Lakukan build aplikasi React dan deploy ke Cloudflare Workers:
   ```bash
   npm run deploy
   ```
4. Wrangler akan otomatis mem-build file aset frontend ke dalam folder `dist` dan mengunggahnya bersama dengan file `worker.ts` ke Cloudflare.
5. Anda akan mendapatkan URL live seperti `https://telonime-portal.<subdomain>.workers.dev`.

---

## ⚙️ Detail Konfigurasi Tambahan

- **`wrangler.toml`**: Menggunakan bundler modern Cloudflare Assets untuk menyajikan frontend React di `./dist` dan merutekan API/Proxy (`/telonime/*` dan `/teloapk/*`) langsung dari Edge Worker (`worker.ts`).
- **`worker.ts`**: Skrip Hono Edge Server yang mengoptimalkan proxy, menangani fallback SPA (`index.html`), serta menyajikan data secara cepat dari Edge Cloudflare secara langsung tanpa server Node.js terpisah.
