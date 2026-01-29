import React, { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

const Process: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <section id="process" ref={containerRef} className="bg-transparent text-black dark:text-white py-32 md:py-48 relative transition-colors duration-500">
      <div className="container mx-auto px-6 max-w-[1400px]">
        
        <div className="mb-32 text-center relative z-10">
          <span className="font-mono font-bold text-ecotribe-primary text-sm tracking-[0.3em] uppercase block mb-4">The Pipeline</span>
          <h2 className="font-brand font-bold text-4xl md:text-6xl text-black dark:text-white">The Transmutation Cycle</h2>
        </div>

        <div className="relative">
          {/* Central Timeline Spine */}
          <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[1px] bg-black/10 dark:bg-white/10 md:-translate-x-1/2 hidden md:block"></div>
          
          {/* Glowing Active Line */}
          <motion.div 
            style={{ scaleY: scaleY, transformOrigin: "top" }}
            className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[2px] bg-ecotribe-primary shadow-[0_0_15px_#84CC16] md:-translate-x-1/2 z-0 hidden md:block"
          />

          <div className="space-y-32 relative z-10">
            
            <ProcessCard 
              index="01"
              title="Collection"
              desc="AI-driven analysis categorizes hardware integrity."
              img="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop"
              align="left"
            />

            <ProcessCard 
              index="02"
              title="Bio-Leaching"
              desc="Proprietary enzymatic baths dissolve substrates."
              img="https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1200&auto=format&fit=crop"
              align="right"
            />

            <ProcessCard 
              index="03"
              title="Extraction"
              desc="Electro-winning recovers 99.99% pure metals."
              img="https://images.unsplash.com/photo-1614726365723-49cfae92782f?q=80&w=1200&auto=format&fit=crop"
              align="left"
            />

          </div>
        </div>
      </div>
    </section>
  );
};

interface ProcessCardProps {
  index: string;
  title: string;
  desc: string;
  img: string;
  align: 'left' | 'right';
}

const ProcessCard: React.FC<ProcessCardProps> = ({ index, title, desc, img, align }) => {
  return (
    <div className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 ${align === 'right' ? 'md:flex-row-reverse' : ''}`}>
      
      {/* Image Side */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="w-full md:w-1/2"
      >
        <div className="aspect-[3/4] md:aspect-[4/3] overflow-hidden relative group border border-black/10 dark:border-white/10 p-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm shadow-2xl dark:shadow-none">
          <div className="absolute inset-0 bg-ecotribe-primary/20 mix-blend-overlay z-10 transition-opacity duration-700 group-hover:opacity-0"></div>
          <img 
            src={img} 
            alt={title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 transform group-hover:scale-105"
          />
          {/* Connector Dot for Timeline */}
          <div className={`hidden md:block absolute top-1/2 w-4 h-4 bg-white dark:bg-[#050505] border-2 border-ecotribe-primary rounded-full z-20 ${align === 'left' ? '-right-[58px] translate-x-1/2' : '-left-[58px] -translate-x-1/2'}`}>
            <div className="absolute inset-0 bg-ecotribe-primary opacity-50 animate-ping rounded-full"></div>
          </div>
        </div>
      </motion.div>

      {/* Text Side */}
      <motion.div 
        initial={{ opacity: 0, x: align === 'left' ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="w-full md:w-1/2"
      >
        <div className={`max-w-md mx-auto md:mx-0 ${align === 'right' ? 'md:text-right' : 'md:text-left'}`}>
           <span className="font-brand font-black text-6xl md:text-8xl text-black/10 dark:text-white/10 block mb-6">{index}</span>
           <h3 className="font-brand font-bold text-4xl text-black dark:text-white mb-4 uppercase">{title}</h3>
           <p className="font-display font-medium text-black/80 dark:text-zinc-300 text-lg md:text-xl leading-relaxed">{desc}</p>
        </div>
      </motion.div>

    </div>
  );
};

export default Process;