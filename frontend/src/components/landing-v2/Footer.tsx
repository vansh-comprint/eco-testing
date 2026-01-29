import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Linkedin, Twitter, ArrowUpRight } from 'lucide-react';

const footerLinks = {
  company: [
    { label: 'About', href: '#solutions' },
    { label: 'Process', href: '#process' },
    { label: 'Industries', href: '#industries' },
    { label: 'Careers', href: 'mailto:careers@ecotribe.in' },
  ],
  compliance: [
    { label: 'Documentation', href: '#compliance' },
    { label: 'Data Security', href: '#compliance' },
    { label: 'ESG Reporting', href: '#impact' },
    { label: 'Certifications', href: '#compliance' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
  ],
  account: [
    { label: 'Login', href: '/login' },
    { label: 'Register', href: '/signup' },
  ],
};

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith('#') && href !== '#') {
      e.preventDefault();
      const el = document.getElementById(href.replace('#', ''));
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
    }
    // For mailto: and external links, let the default behavior work
  };

  return (
    <footer className="bg-white dark:bg-[#050505] border-t border-ecotribe-primary/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="font-brand font-black text-2xl text-black dark:text-white mb-4 leading-none">
                ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
              </div>
              <p className="text-sm text-black/60 dark:text-white/60 mb-6 max-w-sm leading-relaxed">
                Your IT Sustainability Partner. End-to-end asset lifecycle management with
                compliance, security, and measurable ESG impact.
              </p>

              {/* Contact info */}
              <div className="space-y-3">
                <a
                  href="mailto:hello@ecotribe.in"
                  className="flex items-center gap-3 text-sm text-black/60 dark:text-white/60 hover:text-ecotribe-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  hello@ecotribe.in
                </a>
                <a
                  href="tel:+919876543210"
                  className="flex items-center gap-3 text-sm text-black/60 dark:text-white/60 hover:text-ecotribe-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +91 98765 43210
                </a>
                <div className="flex items-start gap-3 text-sm text-black/60 dark:text-white/60">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>Mumbai, India</span>
                </div>
              </div>

              {/* Social links - Sharp */}
              <div className="flex items-center gap-2 mt-6">
                {[
                  { icon: <Twitter className="w-4 h-4" />, href: '#', label: 'Twitter' },
                  { icon: <Linkedin className="w-4 h-4" />, href: '#', label: 'LinkedIn' },
                ].map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 border border-ecotribe-primary/20 flex items-center justify-center text-black/60 dark:text-white/60 hover:bg-ecotribe-primary hover:border-ecotribe-primary hover:text-black transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.label}
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([title, links], colIndex) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: colIndex * 0.1 }}
            >
              <h3 className="font-mono text-xs uppercase tracking-widest text-ecotribe-primary/60 mb-4">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.href)}
                      className="group flex items-center gap-1 text-sm text-black/60 dark:text-white/60 hover:text-ecotribe-primary transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-ecotribe-primary/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40 text-center md:text-left">
              © {currentYear} Ecotribe. All rights reserved.
            </p>
            <p className="text-xs text-black/40 dark:text-white/40 text-center md:text-right max-w-lg">
              Ecotribe works within India's evolving compliance landscape, including e-waste/EPR frameworks
              and DPDP-aligned data handling practices.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
