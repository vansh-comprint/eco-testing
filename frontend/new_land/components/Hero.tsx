
import React from 'react';
import { motion } from 'framer-motion';

const Hero: React.FC = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-transparent">
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center justify-center text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="flex items-center gap-4">
            <div className="h-[2px] w-12 bg-ecotribe-primary"></div>
            <span className="font-mono font-bold text-ecotribe-primary text-xs tracking-[0.3em] uppercase">Bio-Synthesis v4.0</span>
            <div className="h-[2px] w-12 bg-ecotribe-primary"></div>
          </div>

          <h1 className="font-brand font-black text-6xl md:text-8xl lg:text-9xl tracking-tight text-black dark:text-white leading-[0.9] drop-shadow-sm dark:drop-shadow-none">
            DIGITAL<br />
            <span className="font-light italic text-black/60 dark:text-zinc-300">ALCHEMY</span>
          </h1>

          <p className="mt-8 font-body font-medium text-black/80 dark:text-zinc-300 text-lg md:text-xl max-w-xl leading-relaxed drop-shadow-sm dark:drop-shadow-none">
            We are the ecological firewall. Converting global e-waste into pristine biological assets through advanced enzymatic synthesis.
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex gap-6">
            <a href="#process" className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black font-mono font-bold uppercase tracking-widest hover:bg-ecotribe-primary hover:text-white dark:hover:bg-ecotribe-primary dark:hover:text-black transition-colors shadow-lg dark:shadow-none btn-chamfer">
              Explore Cycle
            </a>
          </div>
        </motion.div>

      </div>
      
    </section>
  );
};

export default Hero;
