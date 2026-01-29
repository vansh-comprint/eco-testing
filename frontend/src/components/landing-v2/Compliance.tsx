import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Lock, MapPin, Database, Award, ArrowRight } from 'lucide-react';

const compliancePoints = [
  { icon: <MapPin className="w-4 h-4" />, text: 'Chain-of-custody from pickup to final disposition' },
  { icon: <Database className="w-4 h-4" />, text: 'Asset-level traceability (serial/IMEI where applicable)' },
  { icon: <Shield className="w-4 h-4" />, text: 'Data sanitization evidence aligned to your policy requirements' },
  { icon: <Award className="w-4 h-4" />, text: 'Documentation aligned to India\'s e-waste/EPR ecosystem' },
  { icon: <Lock className="w-4 h-4" />, text: 'DPDP-era data handling discipline' },
];

const deliverables = [
  'Pickup & Handover Notes',
  'Asset Inventory Sheet (serial-wise)',
  'Data Sanitization / Destruction Report',
  'Refurb / Redeploy / Recycle Outcome Report',
  'Certificates / Proof-of-Processing',
  'ESG Impact Summary (for CSR/ESG reporting)',
];

const Compliance: React.FC = () => {
  return (
    <section id="compliance" className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            Trust & Security
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Compliance-ready. Audit-ready.{' '}
            <span className="text-ecotribe-primary">Zero ambiguity.</span>
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-3xl mx-auto">
            Ecotribe is designed for organizations that need documented outcomes, not vague promises—especially
            for e-waste compliance workflows tied to India's E-Waste Management Rules and EPR systems.
          </p>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Compliance Points */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60 mb-6">
              What makes us audit-ready
            </h3>
            <div className="space-y-3">
              {compliancePoints.map((point, i) => (
                <motion.div
                  key={point.text}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-start gap-4 p-4 bg-white dark:bg-[#050505] border border-ecotribe-primary/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all"
                >
                  {/* Angular indicator */}
                  <div className="flex-shrink-0 w-10 h-10 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                    {point.icon}
                  </div>
                  <p className="text-black/80 dark:text-white/80 text-sm leading-relaxed pt-2">
                    {point.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: What You Receive */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="sticky top-24">
              <div className="relative p-8 bg-ecotribe-primary/5 border border-ecotribe-primary/20">
                {/* Corner accent */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-ecotribe-primary" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-ecotribe-primary" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-ecotribe-primary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-xl font-brand font-bold text-black dark:text-white">
                    What you receive
                  </h3>
                </div>

                <ul className="space-y-3">
                  {deliverables.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      {/* Angular check indicator */}
                      <div className="flex-shrink-0 w-5 h-5 border border-ecotribe-primary/30 flex items-center justify-center">
                        <div className="w-2 h-2 bg-ecotribe-primary" />
                      </div>
                      <span className="text-black/80 dark:text-white/80 text-sm">
                        {item}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <motion.button
                  className="mt-8 w-full flex items-center justify-center gap-2 btn-chamfer px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-ecotribe-primary hover:text-black transition-all hover:shadow-[0_0_20px_rgba(132,204,22,0.4)]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Download Sample Report
                  <ArrowRight size={14} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Compliance;
