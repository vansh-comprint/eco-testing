import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, MapPin, FileCheck, ArrowUpRight } from 'lucide-react';

const caseStudies = [
  {
    icon: <MapPin className="w-5 h-5" />,
    metric: '15+ Locations',
    title: 'End-to-End Risk Reduction',
    description: 'Reduced end-of-life asset risk with serial-level tracking across multiple office locations for a leading BFSI enterprise.',
    tag: 'BFSI',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    metric: '40% Higher Recovery',
    title: 'Value Maximization',
    description: 'Increased recovery value by separating refurb-grade assets from scrap stream for an IT services company.',
    tag: 'IT/ITES',
  },
  {
    icon: <FileCheck className="w-5 h-5" />,
    metric: 'Single Audit Pack',
    title: 'Unified Documentation',
    description: 'Delivered an audit-ready disposition pack for Finance + ESG + IT teams in one consolidated bundle.',
    tag: 'Manufacturing',
  },
];

const CaseStudies: React.FC = () => {
  return (
    <section className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            Outcome Snapshots
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Results that{' '}
            <span className="text-ecotribe-primary">speak for themselves</span>
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-2xl mx-auto">
            Real outcomes from enterprises that chose Ecotribe for their IT sustainability journey.
          </p>
        </motion.div>

        {/* Case Study Cards - Border grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ecotribe-primary/10 border border-ecotribe-primary/10">
          {caseStudies.map((study, i) => (
            <motion.div
              key={study.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group relative"
            >
              <motion.div
                className="h-full p-8 bg-white dark:bg-[#050505] hover:bg-ecotribe-primary/5 transition-all overflow-hidden"
                whileHover={{ y: -4 }}
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-ecotribe-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                {/* Top section */}
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                    {study.icon}
                  </div>
                  <span className="px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ecotribe-primary/70 border border-ecotribe-primary/20">
                    {study.tag}
                  </span>
                </div>

                {/* Metric */}
                <motion.p
                  className="text-2xl font-brand font-bold text-ecotribe-primary mb-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  {study.metric}
                </motion.p>

                {/* Title */}
                <h3 className="text-lg font-brand font-bold text-black dark:text-white mb-3 group-hover:text-ecotribe-primary transition-colors">
                  {study.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed mb-6">
                  {study.description}
                </p>

                {/* Read more link */}
                <motion.a
                  href="#"
                  className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-ecotribe-primary hover:gap-2 transition-all"
                  whileHover={{ x: 4 }}
                >
                  View details
                  <ArrowUpRight size={12} />
                </motion.a>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;
