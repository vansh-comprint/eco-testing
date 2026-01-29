import React, { useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ClipboardList, Truck, Search, Shield, RefreshCcw, FileCheck } from 'lucide-react';

const steps = [
  {
    icon: <ClipboardList className="w-5 h-5" />,
    title: 'Plan',
    description: 'Share asset list (model/qty/location). We propose pickup plan + expected recovery bands.',
  },
  {
    icon: <Truck className="w-5 h-5" />,
    title: 'Collect',
    description: 'Secure pickup with chain-of-custody logs and handover confirmation.',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Verify',
    description: 'Inventory, grading, photo evidence, serial mapping.',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Secure',
    description: 'Data sanitization + device-wise reports. DPDP compliance aligned.',
  },
  {
    icon: <RefreshCcw className="w-5 h-5" />,
    title: 'Circular Outcome',
    description: 'Redeploy / refurb-resale / recycle (reuse-first approach aligned with R2v3).',
  },
  {
    icon: <FileCheck className="w-5 h-5" />,
    title: 'Close the Loop',
    description: 'Final pack: Asset Disposition Report + certificates + ESG impact summary.',
  },
];

const HowItWorks: React.FC = () => {
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
    <section id="process" ref={containerRef} className="py-24 lg:py-32 bg-white dark:bg-[#050505] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            The Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            A clean, auditable workflow from{' '}
            <span className="text-ecotribe-primary">pickup</span> to{' '}
            <span className="text-ecotribe-primary">proof</span>
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-2xl mx-auto">
            Six steps to complete IT asset lifecycle management with full traceability.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Central line - Desktop */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-ecotribe-primary/10 -translate-x-1/2" />

          {/* Animated progress line with glow - Desktop */}
          <motion.div
            className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-[2px] bg-ecotribe-primary -translate-x-1/2 origin-top shadow-[0_0_15px_#84CC16]"
            style={{ scaleY }}
          />

          {/* Steps */}
          <div className="space-y-8 lg:space-y-0">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`relative flex items-center lg:min-h-[160px] ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                >
                  {/* Content Card */}
                  <div className={`w-full lg:w-[calc(50%-60px)] ${isLeft ? 'lg:pr-0' : 'lg:pl-0'}`}>
                    <motion.div
                      className="group relative p-6 bg-white dark:bg-[#050505] border border-ecotribe-primary/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all duration-300 hover:shadow-[0_0_30px_rgba(132,204,22,0.1)]"
                      whileHover={{ x: isLeft ? 8 : -8 }}
                    >
                      {/* Left/Right accent line based on position */}
                      <div className={`absolute ${isLeft ? 'right-0' : 'left-0'} top-0 bottom-0 w-[2px] bg-ecotribe-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top`} />

                      <div className="flex items-start gap-4">
                        {/* Icon container - Sharp */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                            {step.icon}
                          </div>
                        </div>

                        {/* Text content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60">
                              Step {String(i + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <h3 className="text-lg font-brand font-bold text-black dark:text-white mb-2 group-hover:text-ecotribe-primary transition-colors">
                            {step.title}
                          </h3>
                          <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Center diamond indicator - Desktop only */}
                  <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10">
                    <motion.div
                      className="relative w-6 h-6 bg-[#050505] dark:bg-[#050505] border-2 border-ecotribe-primary rotate-45 flex items-center justify-center"
                      initial={{ scale: 0, rotate: 45 }}
                      whileInView={{ scale: 1, rotate: 45 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
                    >
                      {/* Inner diamond fill on scroll */}
                      <motion.div
                        className="absolute inset-1 bg-ecotribe-primary"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                      />
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-ecotribe-primary/50 blur-md -z-10" />
                    </motion.div>
                  </div>

                  {/* Connector line to card - Desktop only */}
                  <div className={`hidden lg:block absolute top-1/2 -translate-y-1/2 h-px bg-ecotribe-primary/30 ${
                    isLeft
                      ? 'left-1/2 w-[60px] ml-3'
                      : 'right-1/2 w-[60px] mr-3'
                  }`} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-black/40 dark:text-white/40 mb-4">
            Ready to get started?
          </p>
          <motion.button
            onClick={() => {
              const el = document.getElementById('contact');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-chamfer px-8 py-4 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:shadow-[0_0_30px_rgba(132,204,22,0.4)] transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Your Assessment
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
