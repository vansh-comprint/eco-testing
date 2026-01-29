import React from 'react';

const Protocol: React.FC = () => {
  return (
    <section id="protocol" className="bg-transparent py-24 border-t border-black/10 dark:border-white/5">
      <div className="container mx-auto px-6 max-w-[1400px]">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-l border-t border-black/10 dark:border-white/10">
          
          <StatBox label="Recovery Rate" value="99.9%" sub="Industry Leading" />
          <StatBox label="Active Nodes" value="842" sub="Global Network" />
          <StatBox label="Copper Saved" value="400T" sub="Metric Tonnes" />
          <StatBox label="Gold Purity" value="24K" sub="Certified Grade" />
          
        </div>

      </div>
    </section>
  );
};

const StatBox = ({ label, value, sub }: { label: string, value: string, sub: string }) => (
  <div className="p-12 border-r border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group bg-white/30 dark:bg-transparent backdrop-blur-sm">
    <h4 className="font-mono font-bold text-xs text-black/50 dark:text-zinc-400 uppercase tracking-widest mb-4 group-hover:text-ecotribe-primary transition-colors">{label}</h4>
    <div className="font-brand font-bold text-5xl md:text-6xl text-black dark:text-white mb-2">{value}</div>
    <p className="font-display font-medium text-black/70 dark:text-zinc-500 text-sm tracking-wide group-hover:text-black dark:group-hover:text-white transition-colors">{sub}</p>
  </div>
);

export default Protocol;