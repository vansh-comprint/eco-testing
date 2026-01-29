import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Monitor, Heart, Factory, GraduationCap, ShoppingBag, Landmark } from 'lucide-react';

const industries = [
  { icon: <Building2 className="w-5 h-5" />, name: 'BFSI' },
  { icon: <Monitor className="w-5 h-5" />, name: 'IT/ITES' },
  { icon: <Heart className="w-5 h-5" />, name: 'Healthcare' },
  { icon: <Factory className="w-5 h-5" />, name: 'Manufacturing' },
  { icon: <GraduationCap className="w-5 h-5" />, name: 'Education' },
  { icon: <ShoppingBag className="w-5 h-5" />, name: 'Retail' },
  { icon: <Landmark className="w-5 h-5" />, name: 'Govt/PSUs' },
];

const stats = [
  { value: '500+', label: 'Enterprise Clients' },
  { value: '50L+', label: 'Assets Processed' },
  { value: '99.9%', label: 'Data Security Rate' },
  { value: 'Pan-India', label: 'Coverage' },
];

const Industries: React.FC = () => {
  return (
    <section id="industries" className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            Industries
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Built for{' '}
            <span className="text-ecotribe-primary">high-compliance</span>{' '}
            industries
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-2xl mx-auto">
            We adapt chain-of-custody, sanitization standards, and reporting formats
            to your internal audit + InfoSec needs.
          </p>
        </motion.div>

        {/* Industries Grid - Sharp chips */}
        <div className="flex flex-wrap justify-center gap-3">
          {industries.map((industry, i) => (
            <motion.div
              key={industry.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group"
            >
              <motion.div
                className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#050505] border border-ecotribe-primary/10 hover:border-ecotribe-primary/40 hover:bg-ecotribe-primary/5 cursor-default transition-all"
                whileHover={{ y: -2, x: 2 }}
              >
                <div className="w-9 h-9 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                  {industry.icon}
                </div>
                <span className="font-mono text-xs uppercase tracking-widest text-black/80 dark:text-white/80 group-hover:text-ecotribe-primary transition-colors">
                  {industry.name}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Stats Grid - Border based */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-20"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ecotribe-primary/10 border border-ecotribe-primary/10">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="p-6 lg:p-8 bg-white dark:bg-[#050505] text-center hover:bg-ecotribe-primary/5 transition-colors"
              >
                <motion.p
                  className="text-3xl md:text-4xl font-brand font-bold text-ecotribe-primary mb-2"
                  initial={{ scale: 0.5 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", delay: 0.5 + i * 0.1 }}
                >
                  {stat.value}
                </motion.p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Industries;
