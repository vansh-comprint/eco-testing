import React from 'react';
import { motion } from 'framer-motion';
import { Truck, ClipboardCheck, ShieldCheck, Wrench, Wallet, Recycle, HardDrive, Users, LineChart } from 'lucide-react';

const services = [
  {
    icon: <Truck className="w-5 h-5" />,
    title: 'Asset Pickup & Reverse Logistics',
    description: 'Scheduled pickup, tamper-evident packing, centralized consolidation, geo-tracked handovers.',
  },
  {
    icon: <ClipboardCheck className="w-5 h-5" />,
    title: 'Asset Inventory & Audit Tagging',
    description: 'Serial-level cataloging, condition grading, photo evidence, discrepancy flags.',
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: 'Secure Data Sanitization',
    description: 'Certified wipe (and destruction where required), device-wise sanitization report.',
  },
  {
    icon: <Wrench className="w-5 h-5" />,
    title: 'Refurbishment & Redeployment',
    description: 'Repair, parts replacement, re-imaging, QA; redeploy internally or to approved channels.',
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    title: 'Buyback / Value Recovery',
    description: 'Transparent pricing model, recovery statements, settlement workflows.',
  },
  {
    icon: <Recycle className="w-5 h-5" />,
    title: 'Responsible Recycling & Documentation',
    description: 'Recycling through authorized ecosystem + documentation aligned to India\'s e-waste/EPR framework.',
  },
];

const addOns = [
  { icon: <HardDrive className="w-4 h-4" />, title: 'Onsite drive destruction' },
  { icon: <Users className="w-4 h-4" />, title: 'Employee buyback program' },
  { icon: <LineChart className="w-4 h-4" />, title: 'ESG dashboard & reports' },
];

const ServicesGrid: React.FC = () => {
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
            Services
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            What Ecotribe Does
          </h2>
          <p className="text-black/60 dark:text-white/60 max-w-2xl mx-auto">
            Comprehensive IT asset lifecycle management, from first pickup to final documentation.
          </p>
        </motion.div>

        {/* Services Grid - Border-based cells */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-ecotribe-primary/10">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group relative p-8 bg-white dark:bg-[#050505] border-ecotribe-primary/10 hover:bg-ecotribe-primary/5 transition-all duration-300 ${
                i % 3 !== 2 ? 'lg:border-r' : ''
              } ${i < 3 ? 'border-b' : ''} ${i >= 3 && i < 6 ? 'md:border-b lg:border-b-0' : ''}`}
            >
              {/* Left accent line on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-ecotribe-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />

              {/* Icon - Sharp */}
              <div className="w-12 h-12 border border-ecotribe-primary/20 flex items-center justify-center text-ecotribe-primary mb-4 group-hover:border-ecotribe-primary/50 group-hover:bg-ecotribe-primary/10 transition-all">
                {service.icon}
              </div>

              <span className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60 mb-2 block">
                {String(i + 1).padStart(2, '0')}
              </span>

              <h3 className="font-brand font-bold text-lg text-black dark:text-white mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Add-ons - Sharp */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-black/40 dark:text-white/40 text-center mb-6">
            Optional add-ons
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {addOns.map((addon, i) => (
              <motion.div
                key={addon.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 border border-ecotribe-primary/20 font-mono text-xs uppercase tracking-widest text-black/70 dark:text-white/70 hover:border-ecotribe-primary/50 hover:bg-ecotribe-primary/5 transition-all cursor-default"
                whileHover={{ y: -2 }}
              >
                <span className="text-ecotribe-primary">{addon.icon}</span>
                {addon.title}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesGrid;
