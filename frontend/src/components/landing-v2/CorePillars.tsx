import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Shield, BarChart3 } from 'lucide-react';

const pillars = [
  {
    icon: <RefreshCcw className="w-6 h-6" />,
    title: 'Circular IT Asset Lifecycle',
    description: 'Redeploy → Refurbish → Resell → Recycle (only when reuse is not possible)',
    features: ['Maximize asset value', 'Extend device lifespan', 'Minimize waste'],
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Secure & Auditable ITAD',
    description: 'Asset-level tracking, chain-of-custody, verified sanitization, disposition proofs',
    features: ['Serial-level tracking', 'Data destruction certificates', 'Full audit trail'],
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'ESG Impact You Can Report',
    description: 'Carbon/landfill diversion estimates, circularity metrics, audit-ready packs',
    features: ['Sustainability metrics', 'Board-ready reports', 'CSR documentation'],
  },
];

const CorePillars: React.FC = () => {
  return (
    <section className="py-24 lg:py-32 bg-white dark:bg-[#050505] border-t border-ecotribe-primary/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            Our Approach
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Your IT Sustainability Partner, end-to-end
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-2xl mx-auto">
            Three core pillars that make enterprise IT sustainability achievable and measurable.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 mr-1">We handle:</span>
            {['Servers', 'Storage', 'Networking', 'Laptops', 'Desktops', 'Workstations', 'Mobile Devices'].map((category) => (
              <span key={category} className="px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10">
                {category}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Pillars Grid - Border-based layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group relative"
            >
              <div className={`relative h-full p-8 lg:p-10 bg-white dark:bg-[#050505] border border-ecotribe-primary/10 ${i !== 2 ? 'lg:border-r-0' : ''} hover:bg-ecotribe-primary/5 transition-all duration-300`}>
                {/* Top accent line on hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-ecotribe-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                {/* Icon - Sharp */}
                <div className="w-14 h-14 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary mb-6 group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                  {pillar.icon}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="font-brand font-bold text-xl text-black dark:text-white mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-black/60 dark:text-white/60 mb-6 leading-relaxed">
                    {pillar.description}
                  </p>

                  {/* Features - Sharp bullets */}
                  <ul className="space-y-3">
                    {pillar.features.map((feature, j) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + j * 0.1 }}
                        className="flex items-center gap-3 text-sm text-black/70 dark:text-white/70"
                      >
                        <span className="w-2 h-[2px] bg-ecotribe-primary" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Decorative number */}
                <span className="absolute bottom-4 right-4 font-mono text-6xl font-bold text-ecotribe-primary/5 leading-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CorePillars;
