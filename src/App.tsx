import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Play, Download, ArrowRight, Compass, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 overflow-hidden font-sans">
      {/* Grid Pattern Background overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff02_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative max-w-xl w-full space-y-10 z-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium tracking-wide mb-2">
            <Compass className="w-3.5 h-3.5 text-orange-500 animate-spin-slow" />
            <span>UNIVERSAL CONTENT ACCESS PORTAL</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Media <span className="bg-gradient-to-r from-orange-400 via-zinc-100 to-emerald-400 bg-clip-text text-transparent">Hub</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
            Pintu gerbang modern untuk menikmati streaming anime terbaru dan koleksi aplikasi modifikasi terpopuler.
          </p>
        </motion.div>

        {/* Portal Links Grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Card 1: AnoBoy */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <a
              href="/telonime"
              className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-zinc-900 border border-zinc-800 hover:border-orange-500/30 rounded-2xl transition-all duration-300 overflow-hidden block"
            >
              <div className="flex items-center gap-5 w-full">
                <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 text-orange-400 flex items-center justify-center group-hover:scale-105 group-hover:border-orange-500/30 transition-transform duration-300">
                  <Play className="w-6 h-6 fill-orange-500/10" />
                </div>
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">telonime</h2>
                    <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md font-mono">ANIME</span>
                  </div>
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Nonton streaming anime subtitle Indonesia terlengkap dan terupdate setiap hari.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex items-center justify-end w-full sm:w-auto">
                <div className="p-2.5 rounded-full bg-zinc-800/50 group-hover:bg-orange-500 text-zinc-400 group-hover:text-white transition-all duration-300 transform group-hover:translate-x-1">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </a>
          </motion.div>

          {/* Card 2: teloapk */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
          >
            <a
              href="/teloapk"
              className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 rounded-2xl transition-all duration-300 overflow-hidden block"
            >
              <div className="flex items-center gap-5 w-full">
                <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 text-emerald-400 flex items-center justify-center group-hover:scale-105 group-hover:border-emerald-500/30 transition-transform duration-300">
                  <Download className="w-6 h-6" />
                </div>
                <div className="text-left space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white">teloapk</h2>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">APPLICATIONS</span>
                  </div>
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    Unduh file APK modifikasi, game premium gratis, dan aplikasi pilihan aman tanpa batas.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex items-center justify-end w-full sm:w-auto">
                <div className="p-2.5 rounded-full bg-zinc-800/50 group-hover:bg-emerald-500 text-zinc-400 group-hover:text-white transition-all duration-300 transform group-hover:translate-x-1">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </a>
          </motion.div>
        </div>

        {/* Footer info or minimal design branding */}
        <motion.div 
          variants={itemVariants}
          className="text-center pt-4"
        >
          <p className="text-xs text-zinc-600 font-mono tracking-wider uppercase">
            SECURE ACCESS &bull; HIGH PERFORMANCE &bull; NO ADS INTERFERENCE
          </p>
        </motion.div>
      </motion.div>
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

