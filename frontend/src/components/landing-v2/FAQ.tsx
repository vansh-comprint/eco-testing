import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: 'What asset categories do you handle?',
    answer: 'We handle laptops, desktops, servers, networking equipment (switches, routers, firewalls), monitors, printers, and other IT peripherals. We can also manage mixed lots with varied asset types.',
  },
  {
    question: 'How do you ensure chain-of-custody?',
    answer: 'Every asset is tracked from pickup to final disposition with unique identifiers, geo-tagged handovers, digital signatures at each checkpoint, and tamper-evident packaging. You receive real-time visibility through our portal.',
  },
  {
    question: 'What\'s your data sanitization approach?',
    answer: 'We follow NIST 800-88 guidelines for data sanitization. Depending on your policy, we perform secure wipe (with certificate) or physical destruction (with video evidence). All processes are documented with device-level reports.',
  },
  {
    question: 'Can we do onsite destruction?',
    answer: 'Yes, for organizations with strict data policies, we offer onsite drive shredding services with our mobile destruction unit. You witness the destruction and receive immediate certification.',
  },
  {
    question: 'How do you decide refurb vs recycle?',
    answer: 'Assets undergo a detailed grading process. Working devices with viable remaining life are refurbished. Non-functional or obsolete assets go to certified recyclers. Our reuse-first approach maximizes value and environmental impact.',
  },
  {
    question: 'What documentation do we get for audits?',
    answer: 'You receive a comprehensive disposition pack including: Asset Inventory Sheet, Data Sanitization Reports, Chain-of-Custody Logs, Refurb/Recycle Outcome Reports, applicable certificates, and an ESG Impact Summary.',
  },
  {
    question: 'Do you support multi-location pickups?',
    answer: 'Absolutely. We have pan-India logistics coverage and can coordinate simultaneous pickups across multiple locations, consolidating everything for centralized processing and single-point reporting.',
  },
  {
    question: 'How does EPR documentation work?',
    answer: 'We align our documentation with India\'s E-Waste Management Rules and the CPCB EPR framework. We provide all necessary paperwork for your EPR compliance, including quantity reconciliation and authorized recycler certificates.',
  },
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faqs" className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
            FAQs
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-brand font-bold text-black dark:text-white mb-4">
            Frequently Asked{' '}
            <span className="text-ecotribe-primary">Questions</span>
          </h2>
          <p className="text-black/60 dark:text-white/60">
            Everything you need to know about our IT asset lifecycle services.
          </p>
        </motion.div>

        {/* FAQ Accordion - Sharp */}
        <div className="space-y-px bg-ecotribe-primary/10">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.05 }}
                className="group"
              >
                <div
                  className={`bg-white dark:bg-[#050505] transition-all duration-300 overflow-hidden ${
                    isOpen ? 'border-l-2 border-ecotribe-primary' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-ecotribe-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-ecotribe-primary/50">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`font-medium transition-colors ${
                        isOpen ? 'text-ecotribe-primary' : 'text-black dark:text-white'
                      }`}>
                        {faq.question}
                      </span>
                    </div>
                    <div
                      className={`flex-shrink-0 ml-4 w-8 h-8 border flex items-center justify-center transition-all ${
                        isOpen
                          ? 'bg-ecotribe-primary border-ecotribe-primary text-black'
                          : 'border-ecotribe-primary/20 text-ecotribe-primary/60 hover:border-ecotribe-primary/50'
                      }`}
                    >
                      {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <div className="px-5 pb-5">
                          <div className="ml-10 pl-4 border-l border-ecotribe-primary/20">
                            <p className="text-black/60 dark:text-white/60 leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Still have questions? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-black/40 dark:text-white/40 mb-4">
            Still have questions?
          </p>
          <motion.button
            onClick={() => {
              const el = document.getElementById('contact');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-chamfer inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-ecotribe-primary hover:text-black transition-all hover:shadow-[0_0_20px_rgba(132,204,22,0.4)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get in Touch
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
