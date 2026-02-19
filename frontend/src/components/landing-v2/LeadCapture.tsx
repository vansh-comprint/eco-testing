import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Upload, Check, Mail, Phone, ArrowRight } from 'lucide-react';

const LeadCapture: React.FC = () => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    cities: '',
    assetType: '',
    quantity: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Brief delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  // Navigate to signup with pre-filled data
  const handleContinueToSignup = () => {
    navigate('/signup', {
      state: {
        fromLanding: true,
        companyName: formState.company,
        orgAdminName: formState.name,
        orgAdminEmail: formState.email,
        orgAdminPhone: formState.phone.replace(/\D/g, '').slice(-10), // Extract last 10 digits
      }
    });
  };

  const inputClasses = "w-full px-4 py-3 bg-white dark:bg-[#050505] border border-ecotribe-primary/10 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:border-ecotribe-primary transition-colors";
  const labelClasses = "block font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-2";

  return (
    <section id="contact" className="py-24 lg:py-32 bg-white dark:bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 font-mono text-xs uppercase tracking-widest text-ecotribe-primary border border-ecotribe-primary/20 mb-6">
              Get Started
            </span>
            <h2 className="text-3xl md:text-4xl font-brand font-bold text-black dark:text-white mb-4">
              Get a pickup plan +{' '}
              <span className="text-ecotribe-primary">recovery estimate</span>
            </h2>
            <p className="text-black/60 dark:text-white/60 mb-8">
              Share your asset details and we'll get back with a customized plan within 1 business day.
            </p>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative p-8 bg-ecotribe-primary/5 border border-ecotribe-primary/20 text-center"
              >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-ecotribe-primary" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-ecotribe-primary" />

                <div className="w-16 h-16 mx-auto mb-4 bg-ecotribe-primary flex items-center justify-center">
                  <Check className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-xl font-brand font-bold text-black dark:text-white mb-2">Ready to proceed?</h3>
                <p className="text-black/60 dark:text-white/60 mb-6">
                  Complete your enterprise registration to get started with EcoTribe's IT asset management platform.
                </p>
                <motion.button
                  onClick={handleContinueToSignup}
                  className="inline-flex items-center gap-2 btn-chamfer px-6 py-3 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:shadow-[0_0_30px_rgba(132,204,22,0.4)] transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue to Registration
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <p className="text-black/40 dark:text-white/40 text-xs mt-4">
                  Your details will be pre-filled in the registration form
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClasses}>Your Name</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
                      className={inputClasses}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Company</label>
                    <input
                      type="text"
                      required
                      value={formState.company}
                      onChange={(e) => setFormState({ ...formState, company: e.target.value })}
                      className={inputClasses}
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClasses}>Email</label>
                    <input
                      type="email"
                      required
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className={inputClasses}
                      placeholder="john@company.com"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Phone</label>
                    <input
                      type="tel"
                      required
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      inputMode="numeric"
                      maxLength={10}
                      className={inputClasses}
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>City(ies)</label>
                  <input
                    type="text"
                    value={formState.cities}
                    onChange={(e) => setFormState({ ...formState, cities: e.target.value })}
                    className={inputClasses}
                    placeholder="Mumbai, Delhi, Bangalore..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClasses}>Asset Type</label>
                    <select
                      value={formState.assetType}
                      onChange={(e) => setFormState({ ...formState, assetType: e.target.value })}
                      className={inputClasses}
                    >
                      <option value="">Select type</option>
                      <option value="laptops">Laptops</option>
                      <option value="desktops">Desktops</option>
                      <option value="servers">Servers</option>
                      <option value="networking">Networking</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Approx Quantity</label>
                    <input
                      type="text"
                      value={formState.quantity}
                      onChange={(e) => setFormState({ ...formState, quantity: e.target.value })}
                      className={inputClasses}
                      placeholder="e.g., 100-500"
                    />
                  </div>
                </div>

                {/* Upload button */}
                <div>
                  <label className={labelClasses}>Upload Asset List (Optional)</label>
                  <motion.label
                    className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-ecotribe-primary/20 cursor-pointer hover:border-ecotribe-primary/50 hover:bg-ecotribe-primary/5 transition-all"
                    whileHover={{ scale: 1.01 }}
                  >
                    <Upload className="w-5 h-5 text-ecotribe-primary/50" />
                    <span className="font-mono text-xs text-black/40 dark:text-white/40">Click to upload Excel/CSV</span>
                    <input type="file" className="hidden" accept=".xlsx,.xls,.csv" />
                  </motion.label>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 btn-chamfer px-6 py-4 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:shadow-[0_0_30px_rgba(132,204,22,0.4)] transition-all disabled:opacity-70"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Get Estimate
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>

          {/* Right: Reassurance */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:pt-20"
          >
            <div className="sticky top-24 space-y-6">
              {/* Trust points */}
              <div className="p-6 bg-white dark:bg-[#050505] border border-ecotribe-primary/10">
                <h3 className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60 mb-4">
                  What to expect
                </h3>
                <ul className="space-y-3">
                  {[
                    'Response within 1 business day',
                    'NDA available upon request',
                    'Pan-India logistics support',
                    'No obligation estimate',
                  ].map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 text-sm text-black/70 dark:text-white/70"
                    >
                      <span className="flex-shrink-0 w-5 h-5 border border-ecotribe-primary/30 flex items-center justify-center">
                        <div className="w-2 h-2 bg-ecotribe-primary" />
                      </span>
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Contact info */}
              <div className="relative p-6 bg-ecotribe-primary/5 border border-ecotribe-primary/20">
                {/* Corner accent */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-ecotribe-primary" />

                <h3 className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60 mb-4">
                  Prefer to talk?
                </h3>
                <div className="space-y-3">
                  <a href="mailto:hello@ecotribe.in" className="flex items-center gap-3 text-sm text-black/70 dark:text-white/70 hover:text-ecotribe-primary transition-colors">
                    <Mail className="w-4 h-4" />
                    hello@ecotribe.in
                  </a>
                  <a href="tel:+919876543210" className="flex items-center gap-3 text-sm text-black/70 dark:text-white/70 hover:text-ecotribe-primary transition-colors">
                    <Phone className="w-4 h-4" />
                    +91 98765 43210
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LeadCapture;
