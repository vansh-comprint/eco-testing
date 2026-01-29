import React from 'react';
import { motion } from 'framer-motion';

const Manifesto: React.FC = () => {
  return (
    <section id="mission" className="bg-transparent text-black dark:text-white py-32 md:py-48 relative transition-colors duration-500">
      <div className="container mx-auto px-6 max-w-[1400px]">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          
          {/* Left: Sticky Headline */}
          <div className="lg:sticky lg:top-32 h-fit">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-brand font-bold text-5xl md:text-7xl leading-[1.1] tracking-tight text-black dark:text-white"
            >
              The silicon<br/>
              lifecycle is<br/>
              <span className="font-accent italic font-medium tracking-normal text-black dark:text-zinc-500 line-through decoration-ecotribe-primary decoration-4">
                broken.
              </span>
            </motion.h2>
            <div className="mt-12 h-[2px] w-24 bg-ecotribe-primary"></div>
          </div>

          {/* Right: Scrolling Editorial Content */}
          <div className="space-y-24 pt-12 lg:pt-32">
            
            <ArticleBlock 
              number="01"
              title="We do not recycle."
              content="Recycling is an energy-negative delay of the inevitable. We are transmuters. We use bio-leaching to extract gold, copper, and rare earth elements from the decay of the digital age."
            />
            
            <ArticleBlock 
              number="02"
              title="The Fungal Grid."
              content="ECOTRIBE deploys distributed fungal-bacterial nodes. These biological agents consume circuitry plastics and isolate precious metals with 99.9% purity in a closed-loop system."
            />

            <ArticleBlock 
              number="03"
              title="Asset Rebirth."
              content="What was once toxic landfill becomes high-grade manufacturing filament and investment-grade bullion. We turn the problem into the supply chain."
            />

          </div>

        </div>
      </div>
    </section>
  );
};

const ArticleBlock = ({ number, title, content }: { number: string, title: string, content: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    className="group"
  >
    <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-widest mb-4 block">{number}</span>
    <h3 className="font-brand font-black text-3xl mb-6 text-black dark:text-white group-hover:text-ecotribe-light-primary dark:group-hover:text-ecotribe-tertiary transition-colors uppercase">{title}</h3>
    <p className="font-body font-medium text-black/80 dark:text-zinc-400 text-lg leading-relaxed border-l-2 border-black/10 dark:border-zinc-800 pl-6 group-hover:border-ecotribe-primary transition-colors">
      {content}
    </p>
  </motion.div>
);

export default Manifesto;