import express from "express";
import path from "path";
import zlib from "zlib";
import fs from "fs";
import crypto from "crypto";
import https from "https";
import http from "http";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import { modernCssTelonime, modernCssTeloapk, injectFloatingButton } from "./src/modernCss";
import { addExtra } from 'puppeteer-extra';
import puppeteerCore from 'puppeteer-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import chromium from '@sparticuz/chromium';
import * as cheerio from "cheerio";

const puppeteer = addExtra(puppeteerCore);
puppeteer.use(StealthPlugin());

let globalBrowser: any = null;
let browserLaunchPromise: Promise<any> | null = null;

async function getBrowser() {
  if (globalBrowser && globalBrowser.connected) {
    return globalBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  browserLaunchPromise = (async () => {
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!cfAccountId || !cfApiToken) {
      const missingMsg = "Konfigurasi Cloudflare Browser Rendering belum lengkap. Harap tentukan CLOUDFLARE_ACCOUNT_ID dan CLOUDFLARE_API_TOKEN pada file .env atau panel Environment Variables.";
      console.error(`[getBrowser] ${missingMsg}`);
      throw new Error(missingMsg);
    }

    console.log("[getBrowser] Menghubungkan ke Cloudflare Browser Rendering API (Remote Browser WSS)...");
    
    try {
      // Coba endpoint WSS utama melalui api.cloudflare.com (DNS lebih andal di berbagai sandbox)
      const primaryEndpoint = `wss://api.cloudflare.com/client/v4/accounts/${cfAccountId}/browser-rendering/connect`;
      console.log(`[getBrowser] Mencoba endpoint WSS utama: ${primaryEndpoint}`);
      globalBrowser = await puppeteer.connect({
        browserWSEndpoint: primaryEndpoint,
        headers: {
          "Authorization": `Bearer ${cfApiToken}`
        }
      });
      globalBrowser.on('disconnected', () => {
        console.log("[getBrowser] Cloudflare Remote Browser terputus (disconnected). Reset instance.");
        globalBrowser = null;
        browserLaunchPromise = null;
      });
      browserLaunchPromise = null;
      return globalBrowser;
    } catch (cfErr: any) {
      console.warn(`[getBrowser] Endpoint WSS utama gagal (${cfErr.message}). Mencoba endpoint cadangan browser.rendering.cloudflare.com...`);
      try {
        const fallbackEndpoint = `wss://browser.rendering.cloudflare.com/v1/${cfAccountId}`;
        globalBrowser = await puppeteer.connect({
          browserWSEndpoint: fallbackEndpoint,
          headers: {
            "Authorization": `Bearer ${cfApiToken}`
          }
        });
        globalBrowser.on('disconnected', () => {
          console.log("[getBrowser] Cloudflare Remote Browser terputus (disconnected). Reset instance.");
          globalBrowser = null;
          browserLaunchPromise = null;
        });
        browserLaunchPromise = null;
        return globalBrowser;
      } catch (fallbackWssErr: any) {
        const errMsg = `Gagal menghubungkan ke Cloudflare Browser Rendering: ${fallbackWssErr.message}`;
        console.error(`[getBrowser] ${errMsg}`);
        throw new Error(errMsg);
      }
    }
  })();

  try {
    return await browserLaunchPromise;
  } catch (err) {
    browserLaunchPromise = null;
    globalBrowser = null;
    throw err;
  }
}

// --- Sistem Downloader APK Latar Belakang & Cache Host Server ---
const APK_CACHE_DIR = path.join('/tmp', 'apk_cache');
if (!fs.existsSync(APK_CACHE_DIR)) {
  fs.mkdirSync(APK_CACHE_DIR, { recursive: true });
}

interface ApkDownloadState {
  status: 'downloading' | 'completed' | 'error';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  filename: string;
  localUrl: string;
  error?: string;
  timestamp: number;
}

const apkDownloads = new Map<string, ApkDownloadState>();

// Pembersihan berkala setiap 5 menit untuk menghapus file yang disimpan lebih dari 30 menit agar host tidak penuh
function cleanupOldApkFiles() {
  try {
    if (!fs.existsSync(APK_CACHE_DIR)) return;
    const now = Date.now();
    const maxAgeMs = 30 * 60 * 1000; // 30 menit

    const dirs = fs.readdirSync(APK_CACHE_DIR);
    for (const dir of dirs) {
      const dirPath = path.join(APK_CACHE_DIR, dir);
      if (fs.statSync(dirPath).isDirectory()) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            try {
              fs.unlinkSync(filePath);
              console.log(`[APK Cleanup] Menghapus file kadaluarsa (>30 menit): ${filePath}`);
            } catch (e) {}
          }
        }
        try {
          if (fs.readdirSync(dirPath).length === 0) {
            fs.rmdirSync(dirPath);
            apkDownloads.delete(dir);
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error("[APK Cleanup] Error saat pembersihan berkala:", err);
  }
}
cleanupOldApkFiles();
setInterval(cleanupOldApkFiles, 5 * 60 * 1000);

async function downloadApkToServer(fileId: string, urlStr: string, tempPath: string, targetPath: string, filename: string, referer?: string) {
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Bersihkan file lama di folder target agar tidak terjadi bentrok unduhan
  try {
    const files = fs.readdirSync(targetDir);
    for (const file of files) {
      fs.unlinkSync(path.join(targetDir, file));
    }
  } catch (err) {}

  let page: any = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Mengizinkan Chromium untuk menyimpan file hasil unduhan langsung ke folder cache target
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: targetDir,
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    if (referer) {
      await page.setExtraHTTPHeaders({
        'Referer': referer
      });
    }

    console.log(`[Puppeteer Downloader] Memulai navigasi ke link download: ${urlStr}`);
    
    // Status awal unduhan diset ke 5%
    apkDownloads.set(fileId, {
      status: 'downloading',
      progress: 5,
      downloadedBytes: 0,
      totalBytes: 0,
      filename,
      localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(filename)}`,
      timestamp: Date.now()
    });

    // Menuju ke URL unduhan. Bila link merupakan file unduhan langsung (.apk), page.goto akan memicu unduhan dan melempar error dibatalkan (aborted), hal ini normal.
    try {
      await page.goto(urlStr, { waitUntil: 'domcontentloaded', timeout: 35000 });
    } catch (gotoErr: any) {
      console.log(`[Puppeteer Downloader] Informasi navigasi (biasa terjadi pada file unduhan langsung): ${gotoErr.message}`);
    }

    // Melakukan pengecekan direktori secara berkala untuk memantau status file
    let checkAttempts = 0;
    const maxAttempts = 360; // 360 * 5 detik = maksimal 30 menit
    let completed = false;

    while (checkAttempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      checkAttempts++;

      if (!fs.existsSync(targetDir)) {
        throw new Error("Folder target unduhan hilang.");
      }

      const files = fs.readdirSync(targetDir);
      const crdownloadFile = files.find(f => f.endsWith('.crdownload'));
      const finalFile = files.find(f => !f.endsWith('.crdownload') && !f.startsWith('.'));

      if (crdownloadFile) {
        const filePath = path.join(targetDir, crdownloadFile);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        
        // Perbarui progres dalam map (menggunakan estimasi progres)
        apkDownloads.set(fileId, {
          status: 'downloading',
          progress: Math.min(5 + Math.round((size / (1024 * 1024 * 40)) * 90), 98),
          downloadedBytes: size,
          totalBytes: 0,
          filename,
          localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(filename)}`,
          timestamp: Date.now()
        });
      } else if (finalFile) {
        const finalFilePath = path.join(targetDir, finalFile);
        const stats = fs.statSync(finalFilePath);
        const size = stats.size;

        // Ganti nama file unduhan menjadi safeFilename yang konsisten
        let finalFilename = filename;
        if (finalFile !== filename) {
          try {
            fs.renameSync(finalFilePath, targetPath);
          } catch (renameErr) {
            console.error(`[Puppeteer Downloader] Gagal merename file ${finalFile} menjadi ${filename}:`, renameErr);
            finalFilename = finalFile;
          }
        }

        apkDownloads.set(fileId, {
          status: 'completed',
          progress: 100,
          downloadedBytes: size,
          totalBytes: size,
          filename: finalFilename,
          localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(finalFilename)}`,
          timestamp: Date.now()
        });

        console.log(`[Puppeteer Downloader] Sukses mengunduh file ${finalFilename} (${size} bytes) ke host.`);
        completed = true;
        break;
      } else {
        console.log(`[Puppeteer Downloader] Menunggu unduhan dimulai oleh Chromium (Percobaan ${checkAttempts}/${maxAttempts})...`);
      }
    }

    if (!completed) {
      throw new Error("Waktu tunggu unduhan habis (timeout) atau tidak ada file yang terdeteksi.");
    }

  } catch (err: any) {
    console.error(`[Puppeteer Downloader] Error:`, err);
    apkDownloads.set(fileId, {
      status: 'error',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      filename,
      localUrl: '',
      error: `Gagal mengunduh menggunakan Puppeteer host server: ${err.message}`,
      timestamp: Date.now()
    });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

async function downloadDirectFileStream(fileId: string, directUrl: string, targetDir: string, filename: string, referer?: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const targetPath = path.join(targetDir, safeFilename);

  console.log(`[Direct Stream Downloader] Memulai unduhan langsung dari: ${directUrl}`);

  apkDownloads.set(fileId, {
    status: 'downloading',
    progress: 5,
    downloadedBytes: 0,
    totalBytes: 0,
    filename: safeFilename,
    localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(safeFilename)}`,
    timestamp: Date.now()
  });

  try {
    let reqReferer = referer || 'https://liteapks.com/';
    if (reqReferer.includes('/teloapk')) {
      reqReferer = 'https://liteapks.com/';
    }

    const res = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': reqReferer,
        'Accept': '*/*'
      }
    });

    if (!res.ok) {
      throw new Error(`Server pengunduhan merespons status ${res.status} ${res.statusText}`);
    }

    const contentLength = Number(res.headers.get('content-length')) || 0;
    const fileStream = fs.createWriteStream(targetPath);
    let downloadedBytes = 0;

    if (!res.body) {
      throw new Error("Respon body kosong dari server unduhan.");
    }

    for await (const chunk of res.body as any) {
      downloadedBytes += chunk.length;
      fileStream.write(chunk);

      const progress = contentLength > 0 ? Math.min(Math.round((downloadedBytes / contentLength) * 100), 99) : 50;

      apkDownloads.set(fileId, {
        status: 'downloading',
        progress,
        downloadedBytes,
        totalBytes: contentLength,
        filename: safeFilename,
        localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(safeFilename)}`,
        timestamp: Date.now()
      });
    }

    fileStream.end();

    apkDownloads.set(fileId, {
      status: 'completed',
      progress: 100,
      downloadedBytes,
      totalBytes: downloadedBytes,
      filename: safeFilename,
      localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(safeFilename)}`,
      timestamp: Date.now()
    });

    console.log(`[Direct Stream Downloader] Unduhan sukses diselesaikan! ${safeFilename} (${downloadedBytes} bytes)`);
    return true;
  } catch (err: any) {
    console.warn(`[Direct Stream Downloader] Gagal streaming langsung (403/CF): ${err.message}. Beralih ke unduhan browser interaktif.`);
    try {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    } catch (e) {}
    return false;
  }
}

async function downloadApkViaHeadlessPage(fileId: string, urlStr: string, targetDir: string, referer?: string) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Bersihkan file lama di folder target agar tidak terjadi bentrok unduhan
  try {
    const files = fs.readdirSync(targetDir);
    for (const file of files) {
      fs.unlinkSync(path.join(targetDir, file));
    }
  } catch (err) {}

  let page: any = null;
  let filename = "app-mod.apk";
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Bypass navigator.webdriver untuk melewati Cloudflare Turnstile
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Mengizinkan Chromium untuk menyimpan file hasil unduhan langsung ke folder cache target jika fallback klik digunakan
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: targetDir,
    });

    let realReferer = referer ? referer.replace(/(?:https?:)?\/\/[^\/]+\/teloapk/gi, 'https://liteapks.com') : 'https://liteapks.com/';
    if (!realReferer.includes('liteapks.com')) {
      realReferer = 'https://liteapks.com/';
    }
    await page.setExtraHTTPHeaders({
      'Referer': realReferer
    });

    console.log(`[Headless Downloader] Membuka halaman unduhan: ${urlStr}`);
    
    apkDownloads.set(fileId, {
      status: 'downloading',
      progress: 5,
      downloadedBytes: 0,
      totalBytes: 0,
      filename,
      localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(filename)}`,
      timestamp: Date.now()
    });

    // Menuju ke URL halaman unduhan
    await page.goto(urlStr, { waitUntil: 'networkidle2', timeout: 35000 }).catch(async (e: any) => {
      console.warn("[Headless Downloader] Networkidle2 timeout, mencoba melanjutkan...", e.message);
    });

    let pageTitle = await page.title().catch(() => '');
    if (pageTitle.includes('Just a moment')) {
      console.log("[Headless Downloader] Menunggu Cloudflare Turnstile melewatinya (10 detik)...");
      await new Promise(r => setTimeout(r, 10000));
      pageTitle = await page.title().catch(() => '');
    }

    if (pageTitle.includes('Just a moment') || pageTitle.includes('Attention Required')) {
      throw new Error("Terdeteksi tantangan proteksi Cloudflare (Turnstile).");
    }

    // Ekstrak data-link dari elemen #download jika tersedia (dapat didekode base64 langsung ke URL file APK)
    const downloadInfo = await page.evaluate(() => {
      const div = document.getElementById('download');
      const btn = document.getElementById('download-loaded-link');
      let fname = 'app-mod.apk';
      const h3 = document.querySelector('#download h3');
      if (h3 && h3.textContent) {
        const match = h3.textContent.match(/downloading\s+([^\s]+)/i) || h3.textContent.match(/([a-zA-Z0-9._-]+\.(?:apk|xapk|zip|rar))/i);
        if (match) fname = match[1];
      }
      return {
        dataLink: div ? div.getAttribute('data-link') : null,
        btnHref: btn ? btn.getAttribute('href') : null,
        filename: fname
      };
    }).catch(() => null);

    if (downloadInfo && downloadInfo.filename) {
      filename = downloadInfo.filename;
    }

    let directUrl: string | null = null;
    if (downloadInfo && downloadInfo.dataLink) {
      try {
        const decoded = Buffer.from(downloadInfo.dataLink, 'base64').toString('utf8');
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          directUrl = decoded;
          console.log(`[Headless Downloader] Berhasil mengekstrak direct APK URL dari base64 data-link: ${directUrl}`);
        }
      } catch (e) {}
    }

    // Jika direct URL berhasil diekstrak, coba unduh langsung. Jika gagal (misal 403 Forbidden dari CF), lanjutkan klik tombol di dalam browser rendering
    if (directUrl) {
      console.log(`[Headless Downloader] Mencoba Direct Stream Downloader: ${directUrl}`);
      const directSuccess = await downloadDirectFileStream(fileId, directUrl, targetDir, filename, realReferer);
      if (directSuccess) {
        await page.close().catch(() => {});
        page = null;
        return;
      }
      console.warn(`[Headless Downloader] Unduhan langsung gagal (mungkin 403/proteksi CF). Melanjutkan dengan unduhan browser interaktif...`);
    }

    console.log(`[Headless Downloader] Menunggu tombol download di selector: #download-loaded-link`);
    await page.waitForSelector('#download-loaded-link', { timeout: 10000 });

    console.log(`[Headless Downloader] Menunggu tombol download aktif (pointer-events-none hilang)...`);
    await page.waitForFunction(() => {
      const btn = document.getElementById('download-loaded-link');
      return btn && !btn.classList.contains('pointer-events-none');
    }, { timeout: 20000 }).catch(() => {});

    console.log(`[Headless Downloader] Nama file terdeteksi: ${filename}. Mengklik tombol download.`);

    apkDownloads.set(fileId, {
      status: 'downloading',
      progress: 10,
      downloadedBytes: 0,
      totalBytes: 0,
      filename,
      localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(filename)}`,
      timestamp: Date.now()
    });

    // Klik tombol download
    await page.evaluate(() => {
      const btn = document.getElementById('download-loaded-link');
      if (btn) btn.click();
    });

    // Melakukan pengecekan direktori secara berkala untuk memantau status file
    let checkAttempts = 0;
    const maxAttempts = 360; // 360 * 5 detik = maksimal 30 menit
    let completed = false;

    while (checkAttempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      checkAttempts++;

      if (!fs.existsSync(targetDir)) {
        throw new Error("Folder target unduhan hilang.");
      }

      const files = fs.readdirSync(targetDir);
      const crdownloadFile = files.find(f => f.endsWith('.crdownload'));
      const finalFile = files.find(f => !f.endsWith('.crdownload') && !f.startsWith('.'));

      if (crdownloadFile) {
        const filePath = path.join(targetDir, crdownloadFile);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        
        apkDownloads.set(fileId, {
          status: 'downloading',
          progress: Math.min(10 + Math.round((size / (1024 * 1024 * 40)) * 85), 98),
          downloadedBytes: size,
          totalBytes: 0,
          filename,
          localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(filename)}`,
          timestamp: Date.now()
        });
      } else if (finalFile) {
        const finalFilePath = path.join(targetDir, finalFile);
        const stats = fs.statSync(finalFilePath);
        const size = stats.size;

        let finalFilename = filename;
        const safeExtractedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const finalTargetPath = path.join(targetDir, safeExtractedFilename);

        if (finalFile !== safeExtractedFilename) {
          try {
            if (fs.existsSync(finalTargetPath)) fs.unlinkSync(finalTargetPath);
            fs.renameSync(finalFilePath, finalTargetPath);
            finalFilename = safeExtractedFilename;
          } catch (renameErr) {
            console.error(`[Headless Downloader] Gagal merename file ${finalFile} menjadi ${safeExtractedFilename}:`, renameErr);
            finalFilename = finalFile;
          }
        }

        apkDownloads.set(fileId, {
          status: 'completed',
          progress: 100,
          downloadedBytes: size,
          totalBytes: size,
          filename: finalFilename,
          localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(finalFilename)}`,
          timestamp: Date.now()
        });

        console.log(`[Headless Downloader] Sukses mengunduh file ${finalFilename} (${size} bytes) ke host.`);
        completed = true;
        break;
      } else {
        console.log(`[Headless Downloader] Menunggu unduhan dimulai oleh Chromium (Percobaan ${checkAttempts}/${maxAttempts})...`);
      }
    }

    if (!completed) {
      throw new Error("Waktu tunggu unduhan habis (timeout) atau tidak ada file yang terdeteksi.");
    }

  } catch (err: any) {
    console.warn(`[Headless Downloader] Puppeteer/WebSocket gagal (${err.message}). Memulai fallback scraping REST API Cloudflare...`);
    try {
      const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
      if (!cfAccountId || !cfApiToken) {
        throw new Error("Konfigurasi Cloudflare Browser Rendering belum lengkap di server.");
      }

      const contentUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/browser-rendering/content`;
      console.log(`[Headless Downloader - Fallback] Mengambil konten lewat REST API: ${contentUrl}`);
      
      const response = await fetch(contentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: urlStr
        })
      });

      if (!response.ok) {
        throw new Error(`Cloudflare REST API merespons dengan status ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let html = '';
      try {
        const json = JSON.parse(text);
        if (json.success && json.result && json.result.content) {
          html = json.result.content;
        } else if (json.result) {
          html = typeof json.result === 'string' ? json.result : JSON.stringify(json.result);
        } else {
          html = text;
        }
      } catch (e) {
        html = text;
      }

      if (!html || html.length < 100) {
        throw new Error("Gagal mengambil HTML konten dari Cloudflare REST API (konten kosong).");
      }

      // Parse HTML menggunakan cheerio
      const $ = cheerio.load(html);
      const downloadDiv = $('#download');
      const dataLink = downloadDiv.attr('data-link');
      const btnHref = $('#download-loaded-link').attr('href');
      let extractedFilename = 'app-mod.apk';

      const h3Text = $('#download h3').text() || '';
      if (h3Text) {
        const match = h3Text.match(/downloading\s+([^\s]+)/i) || h3Text.match(/([a-zA-Z0-9._-]+\.(?:apk|xapk|zip|rar))/i);
        if (match) extractedFilename = match[1];
      }

      console.log(`[Headless Downloader - Fallback] Ekstraksi selesai. dataLink: ${dataLink ? 'Ada' : 'Tidak Ada'}, btnHref: ${btnHref}, filename: ${extractedFilename}`);

      let directUrl: string | null = null;
      if (dataLink) {
        try {
          const decoded = Buffer.from(dataLink, 'base64').toString('utf8');
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            directUrl = decoded;
          }
        } catch (e) {}
      }

      if (!directUrl && btnHref && (btnHref.startsWith('http://') || btnHref.startsWith('https://'))) {
        directUrl = btnHref;
      }

      if (!directUrl) {
        throw new Error("Tidak menemukan direct URL atau data-link di dalam konten halaman.");
      }

      console.log(`[Headless Downloader - Fallback] Berhasil mengekstrak URL langsung: ${directUrl}. Mengalirkan unduhan file...`);
      
      filename = extractedFilename;
      let realReferer = referer ? referer.replace(/(?:https?:)?\/\/[^\/]+\/teloapk/gi, 'https://liteapks.com') : 'https://liteapks.com/';
      if (!realReferer.includes('liteapks.com')) {
        realReferer = 'https://liteapks.com/';
      }

      const directSuccess = await downloadDirectFileStream(fileId, directUrl, targetDir, filename, realReferer);
      if (directSuccess) {
        console.log(`[Headless Downloader - Fallback] Sukses menyelesaikan unduhan lewat REST API fallback!`);
        return;
      } else {
        throw new Error("Gagal mengalirkan unduhan langsung.");
      }

    } catch (fallbackErr: any) {
      console.error(`[Headless Downloader - Fallback] Gagal total pada fallback REST API:`, fallbackErr);
      apkDownloads.set(fileId, {
        status: 'error',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        filename,
        localUrl: '',
        error: `Gagal mengunduh. Puppeteer error: ${err.message}. REST API Fallback error: ${fallbackErr.message}`,
        timestamp: Date.now()
      });
    }
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}
// --- Akhir Sistem Downloader ---

// Self-healing function to install Chromium/Puppeteer dependencies on server startup if missing
function ensurePuppeteerDependencies() {
  console.log("[Self-Healing] Checking Puppeteer/Chromium system dependencies...");
  if (fs.existsSync("/usr/lib/x86_64-linux-gnu/libnss3.so") || fs.existsSync("/usr/lib/aarch64-linux-gnu/libnss3.so") || fs.existsSync("/usr/lib/libnss3.so")) {
    console.log("[Self-Healing] All critical Puppeteer libraries are present on the system.");
    return;
  }

  const hasApt = fs.existsSync("/usr/bin/apt-get");
  if (!hasApt) {
    console.log("[Self-Healing] apt-get not found, skipping system dependencies check.");
    return;
  }
  
  exec("dpkg --configure -a 2>/dev/null; apt-get update && apt-get install -y --fix-broken libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libpangocairo-1.0-0", (err, stdout, stderr) => {
    if (err) {
      console.warn("[Self-Healing] apt-get install warning/error:", stderr);
    } else {
      console.log("[Self-Healing] Successfully installed Puppeteer libraries in background.");
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Store Google Search Console verification code in memory (defaults to process.env or 3W6PPgjdNM9crD4d1bn3b4T-8TYBvxeb2p8URfi8_3Q)
  let gscVerificationCode = process.env.GOOGLE_SITE_VERIFICATION || "3W6PPgjdNM9crD4d1bn3b4T-8TYBvxeb2p8URfi8_3Q";

  // Helper to build GSC meta tag string
  const getGscMetaTag = () => {
    if (!gscVerificationCode) return "";
    return `<meta name="google-site-verification" content="${gscVerificationCode.replace(/"/g, '&quot;')}" />\n`;
  };

  // Helper to generate 100% valid Schema.org BreadcrumbList JSON-LD with itemListElement for Google Search Console
  const generateBreadcrumbJsonLd = (reqUrl: string, host: string, portalType: 'telonime' | 'teloapk'): string => {
    const fullHost = host.startsWith('http') ? host : `https://${host}`;
    const portalPath = `/${portalType}`;
    const portalTitle = portalType === 'telonime' ? 'Telonime' : 'Teloapk';

    const items: Array<{
      "@type": string;
      position: number;
      name: string;
      item: string;
    }> = [];

    // Position 1: Beranda / Home
    items.push({
      "@type": "ListItem",
      "position": 1,
      "name": "Beranda",
      "item": `${fullHost}/`
    });

    // Position 2: Portal Root
    items.push({
      "@type": "ListItem",
      "position": 2,
      "name": portalTitle,
      "item": `${fullHost}${portalPath}`
    });

    // Position 3: Specific Page (if subpage)
    const rawPath = reqUrl.split('?')[0].split('#')[0];
    let pathWithoutPortal = rawPath;
    if (pathWithoutPortal.startsWith(portalPath)) {
      pathWithoutPortal = pathWithoutPortal.slice(portalPath.length);
    }
    pathWithoutPortal = pathWithoutPortal.replace(/^\/+/, '');

    if (pathWithoutPortal && pathWithoutPortal !== '') {
      const parts = pathWithoutPortal.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1] || '';

      const cleanSlug = lastPart
        .replace(/\.html$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      if (cleanSlug) {
        const cleanTitle = cleanSlug.replace(/\b\w/g, l => l.toUpperCase());
        const pageUrl = `${fullHost}${portalPath}/${pathWithoutPortal}`;
        items.push({
          "@type": "ListItem",
          "position": 3,
          "name": cleanTitle,
          "item": pageUrl
        });
      }
    }

    const breadcrumbObj = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items
    };

    return `<script type="application/ld+json" id="gsc-breadcrumb-schema">\n${JSON.stringify(breadcrumbObj, null, 2)}\n</script>\n`;
  };

  // Helper to sanitize broken upstream schema and inject pristine BreadcrumbList JSON-LD
  const cleanAndFixBreadcrumbSchema = (html: string, reqUrl: string, host: string, portalType: 'telonime' | 'teloapk'): string => {
    let cleaned = html;

    // 1. Neutralize microdata itemtype="...BreadcrumbList" that causes missing itemListElement error
    cleaned = cleaned.replace(/itemtype=["']https?:\/\/schema\.org\/BreadcrumbList["']/gi, 'data-schema="BreadcrumbList"');

    // 2. Remove or repair existing <script type="application/ld+json"> that contain BreadcrumbList
    cleaned = cleaned.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (match, jsonContent) => {
      if (jsonContent.includes('BreadcrumbList')) {
        try {
          const parsed = JSON.parse(jsonContent);
          const fullHost = host.startsWith('http') ? host : `https://${host}`;
          
          if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            parsed['@graph'] = parsed['@graph'].map((node: any) => {
              if (node && node['@type'] === 'BreadcrumbList') {
                const isTeloapk = portalType === 'teloapk';
                node.itemListElement = [
                  { "@type": "ListItem", "position": 1, "name": "Beranda", "item": `${fullHost}/` },
                  { "@type": "ListItem", "position": 2, "name": isTeloapk ? "Teloapk" : "Telonime", "item": `${fullHost}/${portalType}` }
                ];
              }
              return node;
            });
            return `<script type="application/ld+json">${JSON.stringify(parsed)}</script>`;
          } else if (parsed && parsed['@type'] === 'BreadcrumbList') {
            const isTeloapk = portalType === 'teloapk';
            parsed.itemListElement = [
              { "@type": "ListItem", "position": 1, "name": "Beranda", "item": `${fullHost}/` },
              { "@type": "ListItem", "position": 2, "name": isTeloapk ? "Teloapk" : "Telonime", "item": `${fullHost}/${portalType}` }
            ];
            return `<script type="application/ld+json">${JSON.stringify(parsed)}</script>`;
          }
        } catch (err) {
          return '';
        }
      }
      return match;
    });

    // 3. Inject valid BreadcrumbList JSON-LD
    const validScript = generateBreadcrumbJsonLd(reqUrl, host, portalType);
    
    // 4. If Teloapk download page, inject script to kill ad overlay traps and intercept download to server host
    let adKillerScript = '';
    if (portalType === 'teloapk' && (reqUrl.includes('/download/') || reqUrl.includes('/dl/'))) {
      adKillerScript = `<script>
        document.addEventListener('DOMContentLoaded', function() {
          // 1. Remove Ads
          const removeAds = () => {
            document.querySelectorAll('div[style*="z-index: 2147483647"], div.header-ad-wrapper, div.contentad, div.homeAd2, div.leaderAdvert, iframe[src*="damericantpast"], iframe[style*="display: none"]').forEach(el => el.remove());
          };
          removeAds();
          setInterval(removeAds, 500);

          // 2. Continuous enforcement of safe download button state & content
          const enforceSafeDownloadBtn = () => {
            const loadingContainer = document.getElementById('download-loading');
            const loadedContainer = document.getElementById('download-loaded');
            const linkBtn = document.getElementById('download-loaded-link');
            
            if (loadingContainer) {
              loadingContainer.style.display = 'none';
              loadingContainer.classList.add('hidden');
            }
            if (loadedContainer) {
              loadedContainer.classList.remove('hidden');
              loadedContainer.style.display = 'block';
              loadedContainer.style.opacity = '1';
            }
            if (linkBtn) {
              linkBtn.classList.remove('pointer-events-none', 'opacity-50');
              linkBtn.classList.add('cursor-pointer', 'bg-gradient-to-r', 'from-primary', 'to-[#659f2f]', 'hover:scale-105');
              
              // Only update the innerHTML if it doesn't already contain our server label
              if (!linkBtn.innerHTML.includes('⚡ Unduh Aman')) {
                linkBtn.innerHTML = \`
                  <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  <span>⚡ Unduh Aman via Host Server <span class="opacity-80 font-normal ml-1">(Bebas Error 403)</span></span>
                \`;
              }
              // Prevent standard click actions
              if (linkBtn.getAttribute('href') !== '#!') {
                linkBtn.setAttribute('href', '#!');
              }
            }
          };

          // Run immediately and then continuously to keep it enforced
          enforceSafeDownloadBtn();
          const enforceInterval = setInterval(enforceSafeDownloadBtn, 100);

          // 3. Capturing click event listener (independent of original event listeners)
          document.addEventListener('click', function(e) {
            const linkBtn = e.target.closest('#download-loaded-link');
            if (linkBtn) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();

              // Clear the enforcement interval so our custom download UI stays intact
              clearInterval(enforceInterval);

              // Get download parameters
              const downloadContainer = document.getElementById('download');
              if (!downloadContainer) return;
              const encodedLink = downloadContainer.dataset.link;
              if (!encodedLink) return;

              let filename = 'app-mod.apk';
              const h3El = downloadContainer.querySelector('h3');
              if (h3El && h3El.textContent) {
                const match = h3El.textContent.match(/downloading\\\\s+([^\\\\s]+)/i) || h3El.textContent.match(/([a-zA-Z0-9._-]+\\\\.(?:apk|xapk|zip|rar))/i);
                if (match) filename = match[1];
              }

              // Show local downloader progress UI
              const loadedContainer = document.getElementById('download-loaded');
              if (loadedContainer) {
                loadedContainer.innerHTML = \`
                  <div id="server-dl-ui" class="p-6 bg-white rounded-2xl border-2 border-primary/30 shadow-lg text-center max-w-lg mx-auto">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4 animate-pulse">
                      <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 class="text-lg font-bold text-dark-2 mb-2 font-primary">🚀 Server Mengunduh APK ke Host...</h3>
                    <p class="text-sm text-dark/70 mb-4 font-primary" id="server-dl-status">Menyiapkan pengunduhan latar belakang ke server lokal...</p>
                    
                    <div class="w-full bg-gray-100 h-4 rounded-full overflow-hidden mb-3 p-0.5 shadow-inner border border-gray-200">
                      <div id="server-dl-bar" class="bg-gradient-to-r from-primary to-[#659f2f] h-full rounded-full transition-all duration-300" style="width: 5%;"></div>
                    </div>
                    
                    <div class="flex justify-between text-xs font-bold text-dark/60 mb-5 font-primary">
                      <span id="server-dl-percent">0%</span>
                      <span id="server-dl-bytes">0 MB / 0 MB</span>
                    </div>
                    
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 text-left flex items-start gap-2 leading-relaxed">
                      <span class="text-base shrink-0">💡</span>
                      <div><strong>Penyimpanan Host Sementara:</strong> File diunduh oleh server kami menggunakan jaringan berkecepatan tinggi dan disimpan selama <strong>30 menit</strong> di host agar kapasitas server tidak penuh. Anda bebas dari error 404/403 atau blokir akses!</div>
                    </div>
                  </div>
                \`;
              }

              // Post download start request
              fetch('/api/teloapk/start-server-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  encodedLink: encodedLink,
                  filename: filename,
                  referer: window.location.href
                })
              })
              .then(res => res.json())
              .then(data => {
                if (!data || !data.fileId) {
                  throw new Error('Respons server tidak valid');
                }
                const fileId = data.fileId;

                const pollInterval = setInterval(() => {
                  fetch('/api/teloapk/download-status?id=' + fileId)
                  .then(r => r.json())
                  .then(status => {
                    const statusText = document.getElementById('server-dl-status');
                    const bar = document.getElementById('server-dl-bar');
                    const percentEl = document.getElementById('server-dl-percent');
                    const bytesEl = document.getElementById('server-dl-bytes');

                    if (!status) return;

                    if (status.status === 'error') {
                      clearInterval(pollInterval);
                      const ui = document.getElementById('server-dl-ui');
                      if (ui) {
                        ui.innerHTML = \`
                          <div class="p-6 bg-red-50 rounded-2xl border border-red-200 text-center">
                            <div class="text-3xl mb-3">❌</div>
                            <h3 class="text-base font-bold text-red-700 mb-2 font-primary">Gagal Mengunduh ke Server</h3>
                            <p class="text-sm text-red-600 mb-4 font-primary">\\\${status.error || 'Terjadi kesalahan pada jaringan asal.'}</p>
                            <button onclick="location.reload()" class="bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow hover:bg-red-700 transition-all">🔄 Coba Lagi</button>
                          </div>
                        \`;
                      }
                      return;
                    }

                    if (status.status === 'downloading') {
                      const p = status.progress || 0;
                      const dlMb = (status.downloadedBytes / (1024 * 1024)).toFixed(1);
                      const totMb = status.totalBytes > 0 ? (status.totalBytes / (1024 * 1024)).toFixed(1) : '?';
                      
                      if (bar) bar.style.width = Math.max(p, 5) + '%';
                      if (percentEl) percentEl.textContent = p + '%';
                      if (bytesEl) bytesEl.textContent = \\\`\\\${dlMb} MB / \\\${totMb} MB\\\`;
                      if (statusText) statusText.textContent = \\\`Sedang mengunduh file ke host server (\\\${p}%)...\\\`;
                    }

                    if (status.status === 'completed') {
                      clearInterval(pollInterval);
                      const dlMb = (status.downloadedBytes / (1024 * 1024)).toFixed(1);
                      const ui = document.getElementById('server-dl-ui');
                      if (ui) {
                        ui.innerHTML = \`
                          <div class="p-6 bg-white rounded-2xl border-2 border-[#659f2f] shadow-xl text-center animate-fade-in">
                            <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-[#659f2f] rounded-full mb-3 shadow-inner">
                              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 class="text-xl font-extrabold text-dark-2 mb-2 font-primary">✅ File Siap Diunduh dari Host!</h3>
                            <p class="text-sm text-dark/70 mb-6 font-primary">File <strong>\\\${status.filename}</strong> (\\\${dlMb} MB) sudah tersimpan aman di server lokal kami. Unduhan Anda sekarang pasti berhasil tanpa error akses!</p>
                            
                            <a href="\\\${status.localUrl}" class="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-[#659f2f] text-white px-8 py-4 rounded-full font-extrabold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-base w-full max-w-md mx-auto no-underline">
                              <svg class="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                              <span>⬇️ Download APK dari Server Now (\\\${dlMb} MB)</span>
                            </a>
                            
                            <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500 font-semibold font-primary">
                              <span>⏳ Auto-Delete host aktif: File ini akan dihapus dalam 30 menit.</span>
                            </div>
                          </div>
                        \`;
                      }
                    }
                  }, 1000)
                  .catch(err => console.error('Polling error:', err));
                }, 1000);
              })
              .catch(err => {
                const ui = document.getElementById('server-dl-ui');
                if (ui) {
                  ui.innerHTML = \`<div class="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold">Terjadi kesalahan koneksi ke server downloader: \\\${err.message}</div>\`;
                }
              });
            }
          }, true); // capturing phase!
        });
      </script>`;
    }

    let globalTeloapkScript = '';
    if (portalType === 'teloapk') {
      globalTeloapkScript = `<script>
        (function() {
          const showErrorModal = function(errorMsg) {
            const existing = document.getElementById('cf-error-modal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'cf-error-modal';
            modal.style.position = 'fixed';
            modal.style.inset = '0';
            modal.style.zIndex = '999999';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.padding = '16px';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
            modal.style.backdropFilter = 'blur(4px)';
            modal.style.fontFamily = 'sans-serif';
            modal.style.animation = 'fadeInCF 0.2s ease-out';

            const style = document.createElement('style');
            style.id = 'cf-modal-styles';
            style.innerHTML = \`
              @keyframes fadeInCF {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleInCF {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            \`;
            if (!document.getElementById('cf-modal-styles')) {
              document.head.appendChild(style);
            }

            const card = document.createElement('div');
            card.style.backgroundColor = '#18181b';
            card.style.border = '1px solid #27272a';
            card.style.borderRadius = '16px';
            card.style.width = '100%';
            card.style.maxWidth = '500px';
            card.style.padding = '24px';
            card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)';
            card.style.color = '#f4f4f5';
            card.style.animation = 'scaleInCF 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

            let detailedInstruction = '';
            if (errorMsg.indexOf('ENOTFOUND') !== -1 || errorMsg.indexOf('Cloudflare Browser Rendering') !== -1 || errorMsg.indexOf('Authorization') !== -1 || errorMsg.indexOf('Gagal menghubungkan') !== -1) {
              detailedInstruction = \`
                <div style="background-color: rgba(249, 115, 22, 0.1); border-left: 4px solid #f97316; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; line-height: 1.5; color: #fdba74; text-align: left;">
                  <strong>Mengapa ini terjadi?</strong><br/>
                  Server tidak dapat terhubung ke layanan Cloudflare Browser Rendering Anda. Masalah ini biasanya disebabkan oleh salah satu dari hal berikut:
                  <ul style="margin: 6px 0 0 16px; padding: 0;">
                    <li>Layanan <strong>Browser Rendering</strong> belum diaktifkan di akun Cloudflare Anda.</li>
                    <li>API Token yang dimasukkan tidak valid atau belum memiliki izin yang cukup (Workers Browser Rendering).</li>
                    <li>Account ID salah.</li>
                  </ul>
                </div>
                <p style="font-size: 14px; margin-bottom: 12px; font-weight: bold; color: #ffffff; text-align: left;">Langkah Aktivasi &amp; Konfigurasi:</p>
                <ol style="font-size: 13px; color: #a1a1aa; padding-left: 20px; margin-bottom: 16px; line-height: 1.6; text-align: left;">
                  <li style="margin-bottom: 8px;">Masuk ke <strong>Dashboard Cloudflare</strong> (<a href="https://dash.cloudflare.com" target="_blank" style="color: #f97316; text-decoration: underline;">dash.cloudflare.com</a>).</li>
                  <li style="margin-bottom: 8px;">Buka menu <strong>Workers &amp; Pages</strong> di bilah sisi kiri.</li>
                  <li style="margin-bottom: 8px;">Pilih menu <strong>Browser Rendering</strong>.</li>
                  <li style="margin-bottom: 8px;">Klik tombol <strong>Get Started</strong> (atau aktifkan uji coba gratis) untuk menyetujui ketentuan dan mengaktifkannya di akun Anda.</li>
                  <li style="margin-bottom: 8px;">Pastikan API Token Anda memiliki izin <strong>Workers Browser Rendering: Write</strong>.</li>
                </ol>
              \`;
            } else {
              detailedInstruction = \`
                <div style="background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; line-height: 1.5; color: #fca5a5; text-align: left;">
                  \${errorMsg}
                </div>
              \`;
            }

            card.innerHTML = \`
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; border-b: 1px solid #27272a; padding-bottom: 12px; text-align: left;">
                <span style="font-size: 24px;">⚠️</span>
                <h3 style="margin: 0; font-size: 18px; font-weight: bold; color: #ffffff; font-family: sans-serif;">Koneksi Cloudflare Gagal</h3>
              </div>
              
              <p style="font-size: 13.5px; color: #d4d4d8; line-height: 1.5; margin: 0 0 12px 0; text-align: left;">
                Terjadi kesalahan saat mencoba menghubungkan sistem pengunduh ke layanan Cloudflare Browser Rendering Anda.
              </p>

              <div style="font-size: 11px; font-family: monospace; background-color: #09090b; padding: 10px; border-radius: 8px; border: 1px solid #27272a; overflow-x: auto; color: #f43f5e; margin-bottom: 16px; white-space: pre-wrap; text-align: left;">
\${errorMsg}
              </div>

              \${detailedInstruction}

              <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                <button id="cf-close-modal-btn" style="background-color: #f97316; hover:background-color: #ea580c; color: #ffffff; border: none; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; transition: background-color 0.2s;">
                  Tutup
                </button>
              </div>
            \`;

            modal.appendChild(card);
            document.body.appendChild(modal);

            document.getElementById('cf-close-modal-btn').onclick = function() {
              modal.remove();
            };
          };

          const initApp = function() {
            // 1. Rewrite download links to include version index /1 if missing
            const rewriteDownloadLinks = () => {
              document.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') || '';
                if (href.includes('/download/')) {
                  const parts = href.split('?')[0].split('#')[0].split('/');
                  const downloadIdx = parts.indexOf('download');
                  if (downloadIdx !== -1 && parts.length === downloadIdx + 2) {
                    const base = href.split('?')[0].split('#')[0];
                    const query = href.includes('?') ? '?' + href.split('?')[1] : '';
                    if (!base.endsWith('/1')) {
                      a.setAttribute('href', base + '/1' + query);
                    }
                  }
                }
              });
            };

            // Run immediately and periodically as dynamic elements might load
            rewriteDownloadLinks();
            setInterval(rewriteDownloadLinks, 1000);
          };

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initApp);
          } else {
            initApp();
          }

          // 2. Intercept click on download links ending with /1
          document.addEventListener('click', function(e) {
            const a = e.target.closest('a[href*="/download/"]');
            if (!a) return;
            
            // If we already finished downloading and assigned the local url to href, don't intercept anymore!
            if (a.getAttribute('data-download-ready') === 'true') {
              return; // let standard download occur
            }

            const href = a.getAttribute('href');
            if (!href) return;

            // Check if it ends with /1 (or has /1 with query params)
            const cleanPath = href.split('?')[0].split('#')[0];
            if (!cleanPath.endsWith('/1')) {
              return; // only intercept primary links we rewrote
            }

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // Disable multiple clicks on this link
            if (a.getAttribute('data-download-active') === 'true') {
              return;
            }
            a.setAttribute('data-download-active', 'true');

            // Store original HTML
            const originalHTML = a.innerHTML;
            
            // Change to beautiful Android-style spinner
            a.innerHTML = \`
              <span style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; vertical-align: middle;">
                <svg class="animate-spin" style="width: 1.2em; height: 1.2em; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24"></svg>
                <span style="font-weight: bold; font-family: sans-serif;">Menyiapkan...</span>
              </span>
            \`;

            // Make request to headless-download API
            fetch('/api/teloapk/headless-download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                targetPath: href,
                referer: window.location.href
              })
            })
            .then(res => res.json())
            .then(data => {
              if (!data || !data.fileId) {
                throw new Error(data.error || 'Respons server tidak valid');
              }

              const fileId = data.fileId;
              const pollInterval = setInterval(() => {
                fetch('/api/teloapk/download-status?id=' + fileId)
                .then(r => r.json())
                .then(status => {
                  if (!status) return;

                  if (status.status === 'error') {
                    clearInterval(pollInterval);
                    a.removeAttribute('data-download-active');
                    a.innerHTML = \`
                      <span style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; vertical-align: middle;">
                        <span style="font-weight: bold; color: #ef4444; font-family: sans-serif;">⚠️ Gagal (Klik untuk Detail)</span>
                      </span>
                    \`;
                    showErrorModal(status.error || 'Terjadi kesalahan tidak dikenal.');
                  }

                  if (status.status === 'downloading') {
                    const p = status.progress || 0;
                    a.innerHTML = \`
                      <span style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; vertical-align: middle;">
                        <svg class="animate-spin" style="width: 1.2em; height: 1.2em; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24"></svg>
                        <span style="font-weight: bold; font-family: sans-serif;">Mengunduh (\${p}%)</span>
                      </span>
                    \`;
                  }

                  if (status.status === 'completed') {
                    clearInterval(pollInterval);
                    a.removeAttribute('data-download-active');
                    a.setAttribute('data-download-ready', 'true');
                    a.setAttribute('href', status.localUrl);
                    
                    a.innerHTML = \`
                      <span style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; vertical-align: middle;">
                        <span>⬇️ Unduh APK Aman (Siap)</span>
                      </span>
                    \`;
                    
                    // Auto-click the link to start actual client download!
                    a.click();
                  }
                })
                .catch(err => console.error('Status check error:', err));
              }, 1000);
            })
            .catch(err => {
              console.error('Headless download initialization error:', err);
              a.removeAttribute('data-download-active');
              a.innerHTML = \`
                <span style="display: inline-flex; align-items: center; gap: 8px; justify-content: center; vertical-align: middle;">
                  <span style="font-weight: bold; color: #ef4444; font-family: sans-serif;">⚠️ Gagal memuat (Detail)</span>
                </span>
              \`;
              showErrorModal(err.message || 'Gagal memulai pengunduhan.');
            });
          }, true); // capturing phase!
        })();
      </script>`;
    }

    if (cleaned.includes('</head>')) {
      cleaned = cleaned.replace(/<\/head>/i, validScript + adKillerScript + globalTeloapkScript + '</head>');
    } else {
      cleaned = validScript + adKillerScript + globalTeloapkScript + cleaned;
    }

    return cleaned;
  };



  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- API Unduhan APK Server Lokal ---
  app.post("/api/teloapk/start-server-download", (req, res) => {
    const { encodedLink, filename, referer } = req.body || {};
    if (!encodedLink) {
      return res.status(400).json({ error: "Link unduhan tidak ditemukan" });
    }

    let targetUrl = encodedLink;
    try {
      if (!encodedLink.startsWith('http')) {
        targetUrl = Buffer.from(encodedLink, 'base64').toString('utf8');
      }
    } catch (e) {
      targetUrl = encodedLink;
    }

    // Tambahkan token masa aktif seperti protokol asli LiteAPKs
    const timeToLive = Math.floor(Date.now() / 1000) + 3600 * 3;
    const token = Buffer.from(Buffer.from(timeToLive.toString()).toString('base64')).toString('base64');
    const finalUrl = targetUrl.includes('?') ? `${targetUrl}&token=${encodeURIComponent(token)}` : `${targetUrl}?token=${encodeURIComponent(token)}`;

    const fileId = crypto.createHash('md5').update(targetUrl).digest('hex');
    const safeFilename = (filename || path.basename(targetUrl.split('?')[0]) || 'app-mod.apk').replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetDir = path.join(APK_CACHE_DIR, fileId);
    const targetPath = path.join(targetDir, safeFilename);
    const tempPath = targetPath + '.part';

    // Cek jika file sudah ada dan masih valid (< 30 menit)
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      if (Date.now() - stats.mtimeMs < 30 * 60 * 1000) {
        const state: ApkDownloadState = {
          status: 'completed',
          progress: 100,
          downloadedBytes: stats.size,
          totalBytes: stats.size,
          filename: safeFilename,
          localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(safeFilename)}`,
          timestamp: stats.mtimeMs
        };
        apkDownloads.set(fileId, state);
        return res.json({ fileId, ...state });
      } else {
        try { fs.unlinkSync(targetPath); } catch (e) {}
      }
    }

    if (apkDownloads.has(fileId) && apkDownloads.get(fileId)!.status === 'downloading') {
      return res.json({ fileId, ...apkDownloads.get(fileId) });
    }

    const state: ApkDownloadState = {
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      filename: safeFilename,
      localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(safeFilename)}`,
      timestamp: Date.now()
    };
    apkDownloads.set(fileId, state);

    // Mulai proses unduh di background
    downloadApkToServer(fileId, finalUrl, tempPath, targetPath, safeFilename, referer);

    return res.json({ fileId, ...state });
  });

  app.post("/api/teloapk/headless-download", (req, res) => {
    const { targetPath, referer } = req.body || {};
    if (!targetPath) {
      return res.status(400).json({ error: "Target path tidak ditemukan" });
    }

    const cleanPath = targetPath.replace(/^\/teloapk/, '').replace(/^\/teloapk/, '');
    const targetUrl = `https://liteapks.com${cleanPath}`;

    const fileId = crypto.createHash('md5').update(cleanPath).digest('hex');
    const targetDir = path.join(APK_CACHE_DIR, fileId);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const files = fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : [];
    const finalFile = files.find(f => !f.endsWith('.crdownload') && !f.startsWith('.'));

    if (finalFile) {
      const finalFilePath = path.join(targetDir, finalFile);
      const stats = fs.statSync(finalFilePath);
      if (Date.now() - stats.mtimeMs < 30 * 60 * 1000) {
        const state: ApkDownloadState = {
          status: 'completed',
          progress: 100,
          downloadedBytes: stats.size,
          totalBytes: stats.size,
          filename: finalFile,
          localUrl: `/teloapk/local-dl/${fileId}/${encodeURIComponent(finalFile)}`,
          timestamp: stats.mtimeMs
        };
        apkDownloads.set(fileId, state);
        return res.json({ fileId, ...state });
      } else {
        try { fs.unlinkSync(finalFilePath); } catch (e) {}
      }
    }

    if (apkDownloads.has(fileId) && apkDownloads.get(fileId)!.status === 'downloading') {
      return res.json({ fileId, ...apkDownloads.get(fileId) });
    }

    const state: ApkDownloadState = {
      status: 'downloading',
      progress: 5,
      downloadedBytes: 0,
      totalBytes: 0,
      filename: 'app-mod.apk',
      localUrl: `/teloapk/local-dl/${fileId}/app-mod.apk`,
      timestamp: Date.now()
    };
    apkDownloads.set(fileId, state);

    downloadApkViaHeadlessPage(fileId, targetUrl, targetDir, referer);

    return res.json({ fileId, ...state });
  });

  app.get("/api/teloapk/download-status", (req, res) => {
    const fileId = String(req.query.id || '');
    if (!fileId || !apkDownloads.has(fileId)) {
      return res.status(404).json({ error: "Proses unduhan tidak ditemukan atau sudah kadaluarsa." });
    }
    return res.json(apkDownloads.get(fileId));
  });

  app.get("/teloapk/local-dl/:fileId/:filename", (req, res) => {
    const { fileId, filename } = req.params;
    const safeId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
    
    let decodedFilename = filename;
    try {
      decodedFilename = decodeURIComponent(filename);
    } catch (e) {
      console.error("[Local DL] Failed to decode filename:", filename);
    }
    
    const safeFilename = path.basename(decodedFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(APK_CACHE_DIR, safeId, safeFilename);

    console.log(`[Local DL] Request received. fileId: ${fileId}, filename: ${filename} -> safeFilename: ${safeFilename}`);
    console.log(`[Local DL] Resolved file path: ${filePath}`);

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`[Local DL] File exists. Size: ${stats.size} bytes. mtime: ${stats.mtime}`);
      
      if (Date.now() - stats.mtimeMs > 30 * 60 * 1000) {
        console.warn(`[Local DL] File has expired (older than 30 mins).`);
        try { fs.unlinkSync(filePath); } catch (e) {}
        return res.status(404).send("File APK sudah kadaluarsa (melebihi batas penyimpanan 30 menit di host server). Silakan kembali dan klik tombol download ulang.");
      }
      
      // Serve file manually via ReadStream to bypass Express's internal absolute path / directory restriction
      console.log(`[Local DL] Streaming file content to client...`);
      res.setHeader('Content-Description', 'File Transfer');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
      res.setHeader('Content-Transfer-Encoding', 'binary');
      res.setHeader('Expires', '0');
      res.setHeader('Cache-Control', 'must-revalidate, post-check=0, pre-check=0');
      res.setHeader('Pragma', 'public');
      res.setHeader('Content-Length', stats.size);

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error(`[Local DL] Stream error for file: ${safeFilename}`, err);
        if (!res.headersSent) {
          res.status(500).send("Gagal mengunduh file APK dari host.");
        }
      });
      
      fileStream.on('end', () => {
        console.log(`[Local DL] Stream finished successfully for file: ${safeFilename}`);
      });

      fileStream.pipe(res);
    } else {
      console.error(`[Local DL] File not found on disk: ${filePath}`);
      // Log existing files in targetDir to help debugging if needed
      try {
        const dirPath = path.join(APK_CACHE_DIR, safeId);
        if (fs.existsSync(dirPath)) {
          console.log(`[Local DL] Files available in ${safeId}:`, fs.readdirSync(dirPath));
        } else {
          console.log(`[Local DL] Directory ${dirPath} does not exist.`);
        }
      } catch (err) {
        console.error(`[Local DL] Error querying folder contents:`, err);
      }
      res.status(404).send("File APK tidak ditemukan di host atau masih dalam proses unduhan. Silakan tunggu hingga progres mencapai 100%.");
    }
  });

  app.get("/teloapk/direct-dl", async (req, res) => {
    const urlParam = String(req.query.url || '');
    if (!urlParam) {
      return res.status(400).send("Parameter URL unduhan tidak ditemukan.");
    }

    let targetUrl = urlParam;
    try {
      if (!urlParam.startsWith('http')) {
        targetUrl = Buffer.from(urlParam, 'base64').toString('utf8');
      }
    } catch (e) {}

    let filename = String(req.query.filename || '');
    if (!filename) {
      try {
        filename = path.basename(new URL(targetUrl).pathname) || 'app-mod.apk';
      } catch(e) {
        filename = 'app-mod.apk';
      }
    }
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    try {
      console.log(`[Direct Proxy DL] Streaming unduhan langsung untuk URL: ${targetUrl}`);
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://liteapks.com/',
          'Accept': '*/*'
        }
      });

      if (!upstreamRes.ok) {
        return res.status(upstreamRes.status).send(`Gagal mengunduh file APK dari server asal (${upstreamRes.status} ${upstreamRes.statusText})`);
      }

      res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
      if (upstreamRes.headers.get('content-length')) {
        res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
      }

      for await (const chunk of upstreamRes.body as any) {
        res.write(chunk);
      }
      res.end();
    } catch (err: any) {
      console.error("[Direct Proxy DL Error]", err);
      res.status(500).send("Gagal mengalirkan unduhan file APK: " + err.message);
    }
  });
  // --- Akhir API Unduhan APK ---

  // Google Search Console Configuration API
  app.get("/api/gsc-config", (req, res) => {
    res.json({
      verificationCode: gscVerificationCode,
      hasMetaTag: Boolean(gscVerificationCode),
      sitemapUrl: `${req.protocol}://${req.get('host')}/sitemap.xml`,
      robotsUrl: `${req.protocol}://${req.get('host')}/robots.txt`
    });
  });

  app.post("/api/gsc-config", (req, res) => {
    const { verificationCode } = req.body;
    if (typeof verificationCode === "string") {
      gscVerificationCode = verificationCode.trim();
      res.json({ success: true, verificationCode: gscVerificationCode });
    } else {
      res.status(400).json({ error: "Invalid verificationCode format" });
    }
  });

  // Google Search Console Automatic HTML Verification File Handler
  // Matches any /google*.html URL requested by Googlebot during GSC verification
  app.get(["/google:code.html", "/google*.html"], (req, res) => {
    const rawPath = req.path.replace(/^\//, "");
    res.type("text/html");
    res.send(`google-site-verification: ${rawPath}`);
  });

  // Dynamic robots.txt
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = `${protocol}://${req.get('host')}`;
    res.send(`User-agent: *\nAllow: /\n\nSitemap: ${host}/sitemap.xml\n`);
  });

  // Dynamic sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = `${protocol}://${req.get('host')}`;
    const date = new Date().toISOString().split('T')[0];
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${host}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${host}/telonime</loc>
    <lastmod>${date}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${host}/teloapk</loc>
    <lastmod>${date}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
  });

  // Proxy for Cloudflare challenge assets (/cdn-cgi)
  app.use('/cdn-cgi', createProxyMiddleware({
    target: 'https://liteapks.com',
    changeOrigin: true,
    cookieDomainRewrite: {
      '*': ''
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://liteapks.com/'
    },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('Host', 'liteapks.com');
      }
    }
  }));

  // Dynamically rewrite wp-content, wp-includes, wp-json, wp-admin based on referer to avoid slow redirects and resource mismatch
  app.use(['/wp-content', '/wp-includes', '/wp-json', '/wp-admin'], (req, res, next) => {
    const referer = req.headers.referer || '';
    if (referer.includes('/telonime')) {
      req.url = `/telonime${req.originalUrl}`;
    } else {
      req.url = `/teloapk${req.originalUrl}`;
    }
    next();
  });

  const decompressIfNeeded = (buffer: Buffer, contentEncoding?: string): Buffer => {
    if (!contentEncoding) return buffer;
    try {
      if (contentEncoding.includes('gzip')) {
        return zlib.gunzipSync(buffer);
      } else if (contentEncoding.includes('deflate')) {
        return zlib.inflateSync(buffer);
      } else if (contentEncoding.includes('br')) {
        return zlib.brotliDecompressSync(buffer);
      }
    } catch (err) {
      console.error('Failed to decompress proxy response buffer:', err);
    }
    return buffer;
  };

  // Proxy for telonime
  app.use('/telonime', createProxyMiddleware({
    target: 'https://anoboy.xyz',
    changeOrigin: true,
    cookieDomainRewrite: {
      '*': ''
    },
    pathRewrite: (path) => {
      const parts = path.split('?');
      const rewrittenPath = parts[0].replace(/^\/telonime/, '').replace(/telonime/gi, 'anoboy');
      return rewrittenPath + (parts[1] ? '?' + parts[1] : '');
    },
    selfHandleResponse: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://anoboy.xyz/',
      'Accept-Encoding': 'identity'
    },
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Host', 'anoboy.xyz');
        let referer = (req.headers['referer'] as string) || 'https://anoboy.xyz/';
        referer = referer.replace(/(?:https?:)?\/\/[^\/]+\/telonime/gi, 'https://anoboy.xyz');
        if (!referer.includes('anoboy.xyz')) {
          referer = 'https://anoboy.xyz/';
        }
        proxyReq.setHeader('Referer', referer);
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyReq.removeHeader('sec-fetch-site');
        proxyReq.removeHeader('sec-fetch-mode');
        proxyReq.removeHeader('sec-fetch-dest');
        proxyReq.removeHeader('origin');
      },
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        // Strip security headers to allow embedding
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');

        // Rewrite Location header in redirects to keep user inside proxy
        if (proxyRes.headers['location']) {
          let location = proxyRes.headers['location'];
          location = location.replace(/(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');
          if (location.startsWith('/') && !location.startsWith('/telonime')) {
            location = '/telonime' + location;
          }
          res.setHeader('location', location);
        }

        const contentEncoding = proxyRes.headers['content-encoding'];
        let decompressedBuffer = responseBuffer;
        if (contentEncoding) {
          decompressedBuffer = decompressIfNeeded(responseBuffer, contentEncoding);
          res.removeHeader('content-encoding');
        }

        const contentType = proxyRes.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          let html = decompressedBuffer.toString('utf8');
          
          const isPlayerPage = req.url ? (req.url.includes('yup.php') || req.url.includes('embed') || req.url.includes('player') || req.url.includes('uploads') || req.url.includes('adsbatch')) : false;

          // 1. Rewrite relative absolute paths (generalized to match more attributes)
          html = html.replace(/(href|src|action|data-video|data-src|data-href|data-url|data-link|data-target)=(["'])\/([^/'"\s])/gi, '$1=$2/telonime/$3');
          
          // 1b. Rewrite exact root path "/" so the Home button stays within telonime
          html = html.replace(/(href|src|action|data-video|data-src|data-href|data-url|data-link|data-target)=(["'])\/(["'])/gi, '$1=$2/telonime/$3');

          // 2. Rewrite full domain paths (handling subdomains, protocol-relative, and common anoboy TLDs)
          html = html.replace(/(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');

          // 3. Rebrand references
          html = html.replace(/anoBoy/gi, 'telonime');
          
          if (!isPlayerPage) {
            // 4. Inject modern styles, GSC meta tag, and clean/fix Breadcrumb Schema
            const expressReq = req as unknown as express.Request;
            const protocol = (req.headers['x-forwarded-proto'] as string) || expressReq.protocol || 'https';
            const hostHeader = (req.headers['host'] as string) || expressReq.get?.('host') || 'telokuh.ai.studio';
            const currentHost = `${protocol}://${hostHeader}`;
            const reqUrl = expressReq.originalUrl || req.url || '/telonime';

            html = cleanAndFixBreadcrumbSchema(html, reqUrl, currentHost, 'telonime');
            html = html.replace(/<\/head>/i, getGscMetaTag() + modernCssTelonime + '</head>');
            return injectFloatingButton(html, 'Telonime');
          }
          
          return html;
        } else if (contentType && contentType.includes('text/css')) {
          let css = decompressedBuffer.toString('utf8');
          css = css.replace(/url\((["']?)\/(?!\/)/g, 'url($1/telonime/');
          css = css.replace(/(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');
          return css;
        } else if (contentType && (contentType.includes('application/javascript') || contentType.includes('text/javascript'))) {
          let js = decompressedBuffer.toString('utf8');
          js = js.replace(/(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');
          return js;
        } else if (contentType && (contentType.includes('application/json') || contentType.includes('text/json') || contentType.includes('application/xml') || contentType.includes('text/xml'))) {
          let str = decompressedBuffer.toString('utf8');
          str = str.replace(/(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?anoboy\.(?:xyz|boo|top|best|rocks|icu|com|net|org|be|cc|ch|me)/gi, '/telonime');
          return str;
        }
        return decompressedBuffer;
      })
    }
  }));





  // Proxy for LiteAPKs
  app.use('/teloapk', createProxyMiddleware({
    target: 'https://liteapks.com',
    changeOrigin: true,
    ws: true,
    xfwd: false,
    cookieDomainRewrite: {
      '*': ''
    },
    pathRewrite: (path) => {
      const parts = path.split('?');
      const rewrittenPath = parts[0].replace(/^\/teloapk/, '').replace(/teloapk/gi, 'liteapks');
      return rewrittenPath + (parts[1] ? '?' + parts[1] : '');
    },
    selfHandleResponse: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://liteapks.com/',
      'Origin': 'https://liteapks.com',
      'Accept-Encoding': 'identity'
    },
    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Host', 'liteapks.com');
        proxyReq.setHeader('Origin', 'https://liteapks.com');

        // Clean up proxy headers so target Cloudflare doesn't block request with 403
        proxyReq.removeHeader('x-forwarded-for');
        proxyReq.removeHeader('x-forwarded-host');
        proxyReq.removeHeader('x-forwarded-proto');
        proxyReq.removeHeader('x-forwarded-port');
        proxyReq.removeHeader('x-real-ip');
        proxyReq.removeHeader('x-cloud-trace-context');
        proxyReq.removeHeader('forwarded');
        proxyReq.removeHeader('via');
        proxyReq.removeHeader('cf-connecting-ip');
        proxyReq.removeHeader('cf-ray');
        proxyReq.removeHeader('accept-encoding');
        proxyReq.removeHeader('sec-fetch-site');
        proxyReq.removeHeader('sec-fetch-mode');
        proxyReq.removeHeader('sec-fetch-dest');

        // Standard high-reputation desktop Chrome User-Agent
        if (!proxyReq.getHeader('user-agent')) {
          proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        }

        if (req.headers['accept']) {
          proxyReq.setHeader('Accept', req.headers['accept']);
        }
        if (req.headers['accept-language']) {
          proxyReq.setHeader('Accept-Language', req.headers['accept-language'] as string);
        }
        if (req.headers['cookie']) {
          proxyReq.setHeader('Cookie', req.headers['cookie'] as string);
        }

        // Compute valid Referer header for target site (especially important for /download routes)
        const reqUrl = req.url || '';
        let referer = (req.headers['referer'] as string) || '';
        if (referer) {
          referer = referer.replace(/(?:https?:)?\/\/[^\/]+\/teloapk/gi, 'https://liteapks.com');
        }

        // If referer is missing or does not belong to liteapks.com, construct it from requested URL
        if (!referer || !referer.includes('liteapks.com')) {
          const rawPath = reqUrl.replace(/^\/teloapk/, '').split('?')[0];
          // Strip /download or /dl suffixes to form parent page URL as referer
          const parentPagePath = rawPath.replace(/\/(?:download|dl)(?:\/.*)?$/i, '');
          if (parentPagePath && parentPagePath !== '/') {
            referer = `https://liteapks.com${parentPagePath.startsWith('/') ? '' : '/'}${parentPagePath}`;
          } else {
            referer = 'https://liteapks.com/';
          }
        }
        proxyReq.setHeader('Referer', referer);
      },
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        // Forward source response headers to client
        Object.keys(proxyRes.headers).forEach((headerName) => {
          const lowerName = headerName.toLowerCase();
          const headerVal = proxyRes.headers[headerName];
          if (headerVal !== undefined && !['content-length', 'content-encoding', 'transfer-encoding', 'x-frame-options', 'content-security-policy', 'content-security-policy-report-only'].includes(lowerName)) {
            res.setHeader(headerName, headerVal);
          }
        });

        // Strip security headers to allow embedding
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');
        res.removeHeader('Content-Security-Policy-Report-Only');

        // Rewrite Location header in redirects to keep user inside proxy
        if (proxyRes.headers['location']) {
          let location = proxyRes.headers['location'];
          const isDirectFile = location.toLowerCase().endsWith('.apk') || 
                               location.toLowerCase().includes('.apk?') ||
                               location.toLowerCase().includes('/dl/') ||
                               location.toLowerCase().includes('download_file');
                               
          if (!isDirectFile) {
            location = location.replace(/(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?(?:liteapks\.(?:com|co|net|org|xyz|info|cc|me|top|best|rocks|boo)|apktodo\.(?:io|com|org|net|cc|xyz)|gamedva\.com)/gi, '/teloapk');
            if (location.startsWith('/') && !location.startsWith('/teloapk')) {
              location = '/teloapk' + location;
            }
          }
          res.setHeader('location', location);
        }

        const contentEncoding = proxyRes.headers['content-encoding'];
        let decompressedBuffer = responseBuffer;
        if (contentEncoding) {
          decompressedBuffer = decompressIfNeeded(responseBuffer, contentEncoding);
          res.removeHeader('content-encoding');
        }

        const contentType = proxyRes.headers['content-type'];
        const domainRegex = /(?:https?:)?\/\/(?:[a-zA-Z0-9-]+\.)?(?:liteapks\.(?:com|co|net|org|xyz|info|cc|me|top|best|rocks|boo)|apktodo\.(?:io|com|org|net|cc|xyz)|gamedva\.com)/gi;

        if (contentType && contentType.includes('text/html')) {
          let html = decompressedBuffer.toString('utf8');
          
          // 1. Rewrite relative absolute paths (generalized to match more attributes)
          html = html.replace(/(href|src|action|data-video|data-src|data-href|data-url|data-link|data-target)=(["'])\/([^/'"\s])/gi, '$1=$2/teloapk/$3');
          
          // 1b. Rewrite exact root path "/" so the Home button stays within teloapk
          html = html.replace(/(href|src|action|data-video|data-src|data-href|data-url|data-link|data-target)=(["'])\/(["'])/gi, '$1=$2/teloapk/$3');

          // 2. Rewrite full domain paths (including protocol-relative and other TLDs)
          html = html.replace(domainRegex, '/teloapk');

          // 2b. Proxy direct file downloads through host stream so they bypass hotlink protection (Access is not allowed)
          html = html.replace(/\/teloapk\/([^"'\s>]+(?:\.apk|\.zip|\.rar)(?:\?[^"'\s>]+)?)/gi, '/teloapk/direct-dl?url=https://liteapks.com/$1');
          html = html.replace(/(https:\/\/download\.liteapks\.dev[^"'\s>]+)/gi, (m) => `/teloapk/direct-dl?url=${encodeURIComponent(m)}`);

          // 3. Rebrand references
          html = html.replace(/LITEAPKS\.COM/gi, 'teloapk');
          html = html.replace(/LITEAPKS/gi, 'teloapk');
          html = html.replace(/LiteAPKs/gi, 'teloapk');
          html = html.replace(/Liteapks/gi, 'teloapk');
          html = html.replace(/teloapk\.com/gi, 'teloapk');
          html = html.replace(/teloApk/gi, 'teloapk');
          html = html.replace(/APKTODO/gi, 'teloapk');
          html = html.replace(/apktodo/gi, 'teloapk');

          // 4. Inject modern styles, GSC meta tag, and clean/fix Breadcrumb Schema
          const expressReq = req as unknown as express.Request;
          const protocol = (req.headers['x-forwarded-proto'] as string) || expressReq.protocol || 'https';
          const hostHeader = (req.headers['host'] as string) || expressReq.get?.('host') || 'telokuh.ai.studio';
          const currentHost = `${protocol}://${hostHeader}`;
          const reqUrl = expressReq.originalUrl || req.url || '/teloapk';

          html = cleanAndFixBreadcrumbSchema(html, reqUrl, currentHost, 'teloapk');
          html = html.replace(/<\/head>/i, getGscMetaTag() + modernCssTeloapk + '</head>');
          return injectFloatingButton(html, 'Teloapk');
        } else if (contentType && contentType.includes('text/css')) {
          let css = decompressedBuffer.toString('utf8');
          css = css.replace(/url\((["']?)\/(?!\/)/g, 'url($1/teloapk/');
          css = css.replace(domainRegex, '/teloapk');
          return css;
        } else if (contentType && (contentType.includes('application/javascript') || contentType.includes('text/javascript'))) {
          let js = decompressedBuffer.toString('utf8');
          js = js.replace(domainRegex, '/teloapk');
          return js;
        } else if (contentType && (contentType.includes('application/json') || contentType.includes('text/json') || contentType.includes('application/xml') || contentType.includes('text/xml'))) {
          let str = decompressedBuffer.toString('utf8');
          str = str.replace(domainRegex, '/teloapk');
          return str;
        }
        return decompressedBuffer;
      })
    }
  }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static files excluding index.html automatically
    app.use(express.static(distPath, { index: false }));
    
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = `${protocol}://${req.get('host')}`;
        // Ganti secara dinamis tautan canonical placeholder dengan host aktif saat ini
        html = html.replace(/https:\/\/ais-pre-52nxd52x6wjiavebk3uc46-777063404450\.asia-east1\.run\.app/g, host);
        res.send(html);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
