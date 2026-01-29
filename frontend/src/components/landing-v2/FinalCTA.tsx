import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, MessageCircle } from 'lucide-react';

const FinalCTA: React.FC = () => {
  return (
    <section className="py-24 lg:py-32 bg-ecotribe-primary/5 dark:bg-ecotribe-primary/10 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(132,204,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(132,204,22,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-ecotribe-primary/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-ecotribe-primary/20" />

      <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <motion.h2
            className="text-3xl md:text-5xl font-brand font-bold text-black dark:text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Ready to make your IT sustainability program{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-ecotribe-primary">audit-proof</span>
              <motion.span
                className="absolute bottom-1 left-0 right-0 h-3 bg-ecotribe-primary/30"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
              />
            </span>
            ?
          </motion.h2>

          <motion.p
            className="text-lg text-black/60 dark:text-white/60 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Join enterprises that trust Ecotribe for compliant, secure, and sustainable IT asset management.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              onClick={() => {
                const el = document.getElementById('contact');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group btn-chamfer inline-flex items-center gap-2 px-8 py-4 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:shadow-[0_0_30px_rgba(132,204,22,0.5)] transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Calendar size={16} />
              Book a Sustainability Audit
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </motion.button>

            <motion.button
              onClick={() => {
                const el = document.getElementById('contact');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-[#050505] text-black dark:text-white font-mono text-xs uppercase tracking-widest font-bold border border-ecotribe-primary/20 hover:border-ecotribe-primary/50 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle size={16} />
              Talk to an Expert
            </motion.button>
          </motion.div>

          {/* Trust badges - Sharp */}
          <motion.div
            className="mt-12 flex flex-wrap justify-center items-center gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            {['Pan-India Coverage', '99.9% Data Security', 'Audit-Ready Reports'].map((badge, i) => (
              <span
                key={badge}
                className="flex items-center gap-2 px-4 py-2 border border-ecotribe-primary/10 font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50"
              >
                <div className="w-1.5 h-1.5 bg-ecotribe-primary" />
                {badge}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
