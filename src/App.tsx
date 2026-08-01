import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { 
  Play, 
  Download, 
  ArrowRight, 
  Compass, 
  Search, 
  Bookmark, 
  Trash2, 
  Plus, 
  Tv,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  type: 'telonime' | 'teloapk';
  createdAt: number;
}

function Home() {
  // State pencarian
  const [searchTarget, setSearchTarget] = useState<'telonime' | 'teloapk'>('telonime');
  const [searchQuery, setSearchQuery] = useState('');

  // State bookmark lokal
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const saved = localStorage.getItem('telonime_portal_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'telonime' | 'teloapk'>('telonime');
  const [showAddBookmark, setShowAddBookmark] = useState(false);

  // Status server health
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setServerStatus('online');
        else setServerStatus('offline');
      })
      .catch(() => setServerStatus('offline'));
  }, []);

  // Simpan bookmark ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem('telonime_portal_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.error('Gagal menyimpan bookmark:', e);
    }
  }, [bookmarks]);

  // Handler Pencarian
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = encodeURIComponent(searchQuery.trim());
    const destination = searchTarget === 'telonime' 
      ? `/telonime/?s=${query}` 
      : `/teloapk/?s=${query}`;
    window.location.href = destination;
  };

  // Quick tag click
  const handleQuickTagClick = (tag: string, target: 'telonime' | 'teloapk') => {
    const query = encodeURIComponent(tag);
    const destination = target === 'telonime' 
      ? `/telonime/?s=${query}` 
      : `/teloapk/?s=${query}`;
    window.location.href = destination;
  };

  // Tambah bookmark baru
  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    
    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('/') && !formattedUrl.startsWith('http')) {
      formattedUrl = `/${newType}/${formattedUrl.replace(/^\/+/, '')}`;
    }

    const newItem: BookmarkItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url: formattedUrl,
      type: newType,
      createdAt: Date.now()
    };

    setBookmarks([newItem, ...bookmarks]);
    setNewTitle('');
    setNewUrl('');
    setShowAddBookmark(false);
  };

  // Hapus bookmark
  const handleRemoveBookmark = (id: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 120, damping: 16 }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none z-0" />

      <main className="relative max-w-3xl mx-auto space-y-8 z-10 py-6">
        
        {/* Navbar Header / Status */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-3 px-4 sm:px-6 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              T
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Portal Hub</h2>
              <p className="text-[11px] text-zinc-400">Telonime &amp; Teloapk</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/60 text-[11px] font-medium text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-400 animate-pulse' : serverStatus === 'checking' ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span className="hidden sm:inline">Proxy Server:</span>
              <span className="capitalize">{serverStatus === 'online' ? 'Aktif' : serverStatus === 'checking' ? 'Mengecek...' : 'Offline'}</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Title Section */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="text-center space-y-3 pt-2">
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium tracking-wide shadow-inner">
            <Compass className="w-3.5 h-3.5 text-orange-400 animate-spin-slow" />
            <span>PORTAL STREAMING &amp; UNDUH GRATIS</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Telonime <span className="text-zinc-500 font-light">&amp;</span> <span className="bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">Teloapk</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
            Akses langsung ke portal nonton anime subtitle Indonesia terlengkap dan koleksi aplikasi serta game APK MOD premium tanpa iklan.
          </motion.p>
        </motion.div>

        {/* Quick Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 shadow-xl space-y-3"
        >
          {/* Target Toggle */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-orange-400" />
              Pencarian Cepat Portal
            </span>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
              <button
                onClick={() => setSearchTarget('telonime')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  searchTarget === 'telonime'
                    ? 'bg-orange-500 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                Anime
              </button>
              <button
                onClick={() => setSearchTarget('teloapk')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  searchTarget === 'teloapk'
                    ? 'bg-emerald-500 text-white font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                APK &amp; Game
              </button>
            </div>
          </div>

          {/* Form Pencarian */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchTarget === 'telonime'
                    ? 'Cari judul anime (contoh: One Piece, Solo Leveling)...'
                    : 'Cari aplikasi atau game MOD (contoh: CapCut, Minecraft)...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center gap-2 transition-all shadow-md shrink-0 ${
                searchTarget === 'telonime'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Cari</span>
            </button>
          </form>

          {/* Tag Populer */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-zinc-500 font-medium">Tren:</span>
            {searchTarget === 'telonime' ? (
              <>
                {['One Piece', 'Solo Leveling', 'Naruto', 'Bleach', 'Demon Slayer'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleQuickTagClick(tag, 'telonime')}
                    className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-800/80 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border border-zinc-700/50 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </>
            ) : (
              <>
                {['Minecraft MOD', 'CapCut Pro', 'Spotify MOD', 'GTA San Andreas', 'LMC 8.4'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleQuickTagClick(tag, 'teloapk')}
                    className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-300 border border-zinc-700/50 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </>
            )}
          </div>
        </motion.div>

        {/* Main Links Grid */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Telonime */}
          <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="h-full">
            <div className="relative group bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-6 transition-all duration-300 shadow-md hover:shadow-orange-500/10 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Play className="w-6 h-6 fill-orange-500/20 text-orange-500" />
                  </div>
                  <span className="text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-md font-mono font-semibold">
                    ANIME SUB INDO
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    telonime
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                    Nonton streaming episode anime terbaru, episode ongoing lengkap, dan rekomendasi anime populer setiap hari.
                  </p>
                </div>

                {/* Sub-kategori Pintas */}
                <div className="pt-2 flex flex-wrap gap-1.5 border-t border-zinc-800/60">
                  <a href="/telonime" className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                    &bull; Halaman Utama
                  </a>
                  <a href="/telonime/?s=ongoing" className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                    &bull; Anime Ongoing
                  </a>
                  <a href="/telonime/?s=movie" className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                    &bull; Movie Anime
                  </a>
                </div>
              </div>

              <div className="pt-6">
                <a
                  href="/telonime"
                  className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-orange-500/20"
                >
                  <span>Buka Telonime</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Teloapk */}
          <motion.div variants={itemVariants} whileHover={{ y: -3 }} className="h-full">
            <div className="relative group bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-300 shadow-md hover:shadow-emerald-500/10 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Download className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono font-semibold">
                    APK &amp; GAME MOD
                  </span>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    teloapk
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-1">
                    Download ribuan aplikasi Android pilihan, game MOD uang tak terbatas, dan alat produktivitas premium gratis.
                  </p>
                </div>

                {/* Sub-kategori Pintas */}
                <div className="pt-2 flex flex-wrap gap-1.5 border-t border-zinc-800/60">
                  <a href="/teloapk" className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                    &bull; Halaman Utama
                  </a>
                  <a href="/teloapk/?s=games" className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                    &bull; Game MOD
                  </a>
                  <a href="/teloapk/?s=apps" className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors">
                    &bull; Aplikasi MOD
                  </a>
                </div>
              </div>

              <div className="pt-6">
                <a
                  href="/teloapk"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md group-hover:shadow-emerald-500/20"
                >
                  <span>Buka Teloapk</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Section Bookmark Lokal */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-bold text-white">Bookmark &amp; Favorit Saya</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                {bookmarks.length}
              </span>
            </div>
            <button
              onClick={() => setShowAddBookmark(!showAddBookmark)}
              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Form Tambah Bookmark */}
          <AnimatePresence>
            {showAddBookmark && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddBookmark}
                className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-3 overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Judul (misal: One Piece Ep 1100 / CapCut)"
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500/50"
                    required
                  />
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="URL atau Path (misal: /telonime/one-piece)"
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-orange-500/50"
                    required
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="bookmarkType"
                        checked={newType === 'telonime'}
                        onChange={() => setNewType('telonime')}
                        className="accent-orange-500"
                      />
                      <span>Telonime</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="bookmarkType"
                        checked={newType === 'teloapk'}
                        onChange={() => setNewType('teloapk')}
                        className="accent-emerald-500"
                      />
                      <span>Teloapk</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Daftar Bookmark */}
          {bookmarks.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-center py-2">
              Belum ada bookmark tersimpan. Klik "Tambah" untuk menyimpan halaman favorit Anda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors group"
                >
                  <a
                    href={bm.url}
                    className="flex items-center gap-2 truncate flex-1 pr-2 text-xs font-medium text-zinc-300 hover:text-white"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${bm.type === 'telonime' ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                    <span className="truncate">{bm.title}</span>
                  </a>
                  <button
                    onClick={() => handleRemoveBookmark(bm.id)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Hapus bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer Info */}
        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center pt-4 space-y-2 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-500 font-medium">
            &copy; {new Date().getFullYear()} Telonime &amp; Teloapk Portal. Selalu Terhubung &amp; Bebas Iklan.
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400 font-mono">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors">Sitemap.xml</a>
            <span>&bull;</span>
            <a href="/robots.txt" target="_blank" rel="noreferrer" className="hover:text-orange-400 transition-colors">Robots.txt</a>
          </div>
        </motion.footer>

      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
