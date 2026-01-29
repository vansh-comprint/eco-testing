import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, TrendingDown, ArrowRight } from 'lucide-react';

const problems = [
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'Compliance Risk',
    description: 'Untracked assets, incomplete paperwork, vendor opacity, audit anxiety.',
  },
  {
    icon: <ShieldAlert className="w-6 h-6" />,
    title: 'Data Risk',
    description: 'Asset handover without verifiable sanitization and custody trails.',
  },
  {
    icon: <TrendingDown className="w-6 h-6" />,
    title: 'Value Leakage',
    description: 'Good assets get scrapped, resale value isn\'t captured, refurb is missed.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const WhatWeSolve: React.FC = () => {
  return (
    <section id="solutions" className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6"
          >
            The Problem
          </motion.span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Most IT sustainability programs fail in the{' '}
            <span className="relative inline-block">
              <span className="line-through decoration-ecotribe-primary decoration-4 italic text-black/40 dark:text-white/40">
                last mile
              </span>
            </span>
            . We fix that.
          </h2>
        </motion.div>

        {/* Problem Cards - Sharp */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-ecotribe-primary/10"
        >
          {problems.map((problem) => (
            <motion.div
              key={problem.title}
              variants={cardVariants}
              className="group relative p-8 lg:p-10 bg-white dark:bg-[#050505] hover:bg-ecotribe-primary/5 transition-all duration-300"
            >
              {/* Left accent line */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-ecotribe-primary/0 group-hover:bg-ecotribe-primary transition-colors duration-300" />

              <div className="relative z-10">
                <div className="w-14 h-14 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary mb-6 group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                  {problem.icon}
                </div>

                <h3 className="font-brand font-bold text-xl text-black dark:text-white mb-3">
                  {problem.title}
                </h3>

                <p className="text-black/60 dark:text-white/60 leading-relaxed">
                  {problem.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Outcome Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 p-8 border border-ecotribe-primary/20 bg-ecotribe-primary/5"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-lg font-brand font-bold text-black dark:text-white">
              Ecotribe delivers{' '}
              <span className="text-ecotribe-primary">traceability</span> +{' '}
              <span className="text-ecotribe-primary">data security</span> +{' '}
              <span className="text-ecotribe-primary">maximum circularity</span>{' '}
              in one workflow.
            </p>
            <motion.button
              onClick={() => {
                const el = document.getElementById('process');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 btn-chamfer px-6 py-3 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest font-bold whitespace-nowrap hover:shadow-[0_0_20px_rgba(132,204,22,0.4)] transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
            >
              See Process
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatWeSolve;
