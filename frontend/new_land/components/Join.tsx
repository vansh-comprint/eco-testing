import React from 'react';
import { ArrowRight } from 'lucide-react';

const Join: React.FC = () => {
  return (
    <section id="join" className="bg-transparent py-32 md:py-48 relative overflow-hidden transition-colors duration-500">
      <div className="container mx-auto px-6 max-w-[1400px] text-center">
        
        <h2 className="font-brand font-bold text-5xl md:text-7xl text-black dark:text-white mb-12">
          Join the <span className="font-accent italic font-light tracking-normal text-black/50 dark:text-zinc-500">Collective.</span>
        </h2>
        
        <div className="max-w-xl mx-auto relative group">
          <input 
            type="email" 
            placeholder="ENTER PROTOCOL ID (EMAIL)" 
            className="w-full bg-transparent border-b-2 border-black/20 dark:border-white/20 py-6 text-xl md:text-2xl font-mono font-medium text-center text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary dark:focus:border-ecotribe-primary transition-colors uppercase"
          />
          <button className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 dark:text-zinc-500 hover:text-ecotribe-primary dark:hover:text-ecotribe-primary transition-colors">
            <ArrowRight className="w-8 h-8" strokeWidth={3} />
          </button>
        </div>

        <p className="mt-8 font-mono font-bold text-xs text-black/40 dark:text-zinc-600 uppercase tracking-widest">
          Secure Transmission // Encrypted
        </p>

      </div>
    </section>
  );
};

export default Join;