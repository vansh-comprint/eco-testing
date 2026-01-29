import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Recycle, FileCheck, TrendingUp } from 'lucide-react';

const trustChips = [
  'ITAD',
  'Buyback',
  'Data Sanitization',
  'EPR Compliance',
  'ESG Reporting',
];

const stats = [
  { value: '99.9%', label: 'Data Security', icon: <Shield className="w-4 h-4" /> },
  { value: '500+', label: 'Enterprises', icon: <TrendingUp className="w-4 h-4" /> },
  { value: '50L+', label: 'Assets Processed', icon: <Recycle className="w-4 h-4" /> },
  { value: 'Pan-India', label: 'Coverage', icon: <FileCheck className="w-4 h-4" /> },
];

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen w-full flex items-center overflow-hidden pt-20 lg:pt-0">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-ecotribe-primary/5 dark:from-[#050505] dark:via-[#050505] dark:to-ecotribe-primary/5" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(132,204,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(132,204,22,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left Column - Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Badge - Sharp */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-ecotribe-primary/30 bg-ecotribe-primary/5"
            >
              <span className="w-2 h-2 bg-ecotribe-primary animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary">IT Sustainability Partner</span>
            </motion.div>

            {/* Headline with "broken" text */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-5xl lg:text-6xl font-brand font-bold text-black dark:text-white leading-[1.1] tracking-tight"
            >
              Turn IT{' '}
              <span className="font-accent line-through decoration-ecotribe-primary decoration-4 italic text-black/40 dark:text-white/40">
                waste
              </span>{' '}
              assets into{' '}
              <span className="text-ecotribe-primary">compliance</span>
              , cost recovery, and measurable{' '}
              <span className="text-ecotribe-primary">ESG impact</span>.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg text-black/60 dark:text-white/60 leading-relaxed max-w-xl"
            >
              Ecotribe helps enterprises collect, secure, refurbish, and responsibly recycle
              IT assets—backed by audit-ready documentation and sustainability reporting.
            </motion.p>

            {/* CTA Row - Chamfered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center gap-4"
            >
              <motion.button
                onClick={() => {
                  const el = document.getElementById('contact');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group btn-chamfer inline-flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-mono text-sm uppercase tracking-widest font-bold hover:bg-ecotribe-primary hover:text-black transition-all hover:shadow-[0_0_30px_rgba(132,204,22,0.4)]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Book Assessment
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.button
                onClick={() => {
                  const el = document.getElementById('compliance');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-6 py-4 font-mono text-sm uppercase tracking-widest text-black/70 dark:text-white/70 hover:text-ecotribe-primary transition-colors border border-transparent hover:border-ecotribe-primary/30"
                whileHover={{ x: 4 }}
              >
                Compliance Pack
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>

            {/* Trust Line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="pt-8 border-t border-ecotribe-primary/10"
            >
              <p className="font-mono text-xs uppercase tracking-widest text-black/40 dark:text-white/40 mb-4">
                Built for IT, Finance & ESG teams · Pan-India · Chain-of-custody · Audit-ready
              </p>

              {/* Proof Chips - Sharp */}
              <div className="flex flex-wrap gap-2">
                {trustChips.map((chip, i) => (
                  <motion.span
                    key={chip}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                    className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 bg-ecotribe-primary/5"
                  >
                    {chip}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Corner decorations */}
              <div className="absolute -top-4 -left-4 w-8 h-8 border-l-2 border-t-2 border-ecotribe-primary" />
              <div className="absolute -bottom-4 -right-4 w-8 h-8 border-r-2 border-b-2 border-ecotribe-primary" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-px bg-ecotribe-primary/10 border border-ecotribe-primary/10">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    className="group p-8 bg-white dark:bg-[#050505] hover:bg-ecotribe-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-ecotribe-primary">{stat.icon}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
                        {stat.label}
                      </span>
                    </div>
                    <span className="font-brand font-bold text-3xl md:text-4xl text-black dark:text-white group-hover:text-ecotribe-primary transition-colors">
                      {stat.value}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Bottom tagline */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 text-center"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-black/30 dark:text-white/30">
                  Trusted by enterprises across India
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator - Sharp */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="w-6 h-12 border border-ecotribe-primary/30 flex items-start justify-center p-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-3 bg-ecotribe-primary"
            animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
