import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-transparent py-16 border-t border-black/10 dark:border-white/5 text-black/70 dark:text-zinc-400 transition-colors duration-500">
      <div className="container mx-auto px-6 max-w-[1400px]">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
          
          <div className="flex flex-col items-start">
            <div className="font-brand font-black text-3xl text-black dark:text-white mb-1 leading-none">
              ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
            </div>
            
            {/* COMPRINT Sub-brand */}
            <div className="flex items-center gap-1.5 mb-6 opacity-80 hover:opacity-100 transition-opacity">
              <span className="font-mono text-[9px] text-black/60 dark:text-zinc-500 uppercase tracking-wider">a</span>
              <div className="flex items-baseline tracking-[-0.03em]">
                <span className="font-brand font-bold text-[10px] uppercase text-slate-900 dark:text-comprint-primary">COM</span>
                <span className="font-brand font-bold text-[10px] uppercase text-slate-900 dark:text-comprint-primary">PRINT</span>
                <div className="w-[3px] h-[3px] ml-[2px] rounded-[0.5px] animate-pulse bg-slate-900 dark:bg-comprint-primary"></div>
              </div>
              <span className="font-mono text-[9px] text-black/60 dark:text-zinc-500 uppercase tracking-wider">brand</span>
            </div>

            <p className="font-mono font-medium text-xs uppercase tracking-widest max-w-xs leading-relaxed text-black/60 dark:text-zinc-500">
              Bio-Synthesis & E-Waste Alchemy.<br/>
              Est. 2024. Sector 7G.
            </p>
          </div>

          <div className="flex gap-8 font-mono font-bold text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors text-black/60 dark:text-zinc-500">Legal</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors text-black/60 dark:text-zinc-500">Twitter</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors text-black/60 dark:text-zinc-500">LinkedIn</a>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;