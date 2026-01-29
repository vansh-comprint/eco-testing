import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Recycle, Layers, Calendar, ArrowRight, Leaf, PieChart } from 'lucide-react';

const reportingFeatures = [
  { icon: <PieChart className="w-4 h-4" />, text: 'Circularity rate (redeployed + refurbished vs recycled)' },
  { icon: <TrendingUp className="w-4 h-4" />, text: 'Estimated landfill diversion' },
  { icon: <Recycle className="w-4 h-4" />, text: 'Estimated material recovery highlights' },
  { icon: <Layers className="w-4 h-4" />, text: 'Category-wise disposition (laptops/servers/network)' },
  { icon: <Calendar className="w-4 h-4" />, text: 'Quarter-on-quarter trends for board updates' },
];

const sampleMetrics = [
  { label: 'Circularity Rate', value: '87%' },
  { label: 'Landfill Diverted', value: '2.4 tons' },
  { label: 'Value Recovered', value: '₹12.8L' },
  { label: 'Assets Processed', value: '1,247' },
];

const ESGReporting: React.FC = () => {
  return (
    <section id="impact" className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            ESG Impact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Impact reporting your ESG team can{' '}
            <span className="text-ecotribe-primary">actually use</span>
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-3xl mx-auto">
            Get audit-ready sustainability metrics and reports that your ESG, Finance, and leadership teams
            can directly use for compliance filings, board presentations, and stakeholder communications.
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Features List */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60 mb-6">
              What's in your ESG report
            </h3>
            <div className="space-y-3">
              {reportingFeatures.map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-start gap-4 p-4 bg-white dark:bg-[#050505] border border-ecotribe-primary/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all"
                >
                  <div className="flex-shrink-0 w-10 h-10 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                    {feature.icon}
                  </div>
                  <p className="text-black/80 dark:text-white/80 text-sm leading-relaxed pt-2">
                    {feature.text}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-8 inline-flex items-center gap-2 btn-chamfer px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-ecotribe-primary hover:text-black transition-all hover:shadow-[0_0_20px_rgba(132,204,22,0.4)]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              See a sample ESG report
              <ArrowRight size={14} />
            </motion.button>
          </motion.div>

          {/* Right: Sample Report Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="sticky top-24">
              <div className="relative p-8 bg-ecotribe-primary/5 border border-ecotribe-primary/20">
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-ecotribe-primary" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-ecotribe-primary" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-ecotribe-primary" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-ecotribe-primary" />

                {/* Report Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-ecotribe-primary flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-lg font-brand font-bold text-black dark:text-white">
                      Sample ESG Report
                    </h3>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Q4 2024 Summary</p>
                  </div>
                </div>

                {/* Metrics Grid - Border based */}
                <div className="grid grid-cols-2 gap-px bg-ecotribe-primary/10 mb-6">
                  {sampleMetrics.map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="p-4 bg-white dark:bg-[#050505] hover:bg-ecotribe-primary/5 transition-colors"
                    >
                      <p className="text-2xl font-brand font-bold text-ecotribe-primary">
                        {metric.value}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mt-1">
                        {metric.label}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Disposition Breakdown - Sharp bar */}
                <div className="p-4 bg-white/50 dark:bg-[#0a0a0a] border border-ecotribe-primary/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs uppercase tracking-widest text-black/60 dark:text-white/60">Disposition Breakdown</span>
                    <Leaf className="w-4 h-4 text-ecotribe-primary" />
                  </div>
                  {/* Sharp Stacked Bar */}
                  <div className="h-3 overflow-hidden flex bg-black/5 dark:bg-white/5">
                    <motion.div
                      className="bg-ecotribe-primary h-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '45%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                    />
                    <motion.div
                      className="bg-ecotribe-primary/60 h-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '30%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    />
                    <motion.div
                      className="bg-ecotribe-primary/30 h-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '25%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.7 }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 font-mono text-[10px] tracking-wide text-black/50 dark:text-white/50">
                    <span>Redeployed 45%</span>
                    <span>Refurbished 30%</span>
                    <span>Recycled 25%</span>
                  </div>
                </div>

                {/* Footer Note */}
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 text-center">
                  Export as PDF or integrate with your ESG dashboard
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ESGReporting;
