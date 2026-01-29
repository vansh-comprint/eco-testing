
import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useTheme } from '../App';
import { Moon, Sun } from 'lucide-react';

interface NavbarProps {
  onNavigate: (view: 'home' | 'login') => void;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate }) => {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setScrolled(latest > 50);
  });

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOnboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: -100 },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-500 
        ${scrolled 
          ? 'bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5' 
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <a href="#" onClick={handleLogoClick} className="interactive flex flex-col items-start group">
          <span className="font-brand font-black text-2xl tracking-tight text-black dark:text-white leading-none">
            ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
          </span>
          
          {/* COMPRINT Sub-brand */}
          <div className="flex items-center gap-1.5 mt-1 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
            <span className="font-mono text-[9px] text-black/60 dark:text-zinc-500 uppercase tracking-wider">a</span>
            
            {/* COMPRINT Identity */}
            <div className="flex items-baseline tracking-[-0.03em]">
              <span className="font-brand font-bold text-[10px] uppercase text-slate-900 dark:text-comprint-primary">COM</span>
              <span className="font-brand font-bold text-[10px] uppercase text-slate-900 dark:text-comprint-primary">PRINT</span>
              <div className="w-[3px] h-[3px] ml-[2px] rounded-[0.5px] animate-pulse bg-slate-900 dark:bg-comprint-primary"></div>
            </div>
            
            <span className="font-mono text-[9px] text-black/60 dark:text-zinc-500 uppercase tracking-wider">brand</span>
          </div>
        </a>

        {/* Desktop Links - Minimalist */}
        <div className="hidden md:flex items-center gap-12">
          {['Mission', 'Process', 'Protocol'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate('home');
                // Allow a brief tick for render then scroll
                setTimeout(() => {
                  const el = document.getElementById(item.toLowerCase());
                  el?.scrollIntoView({ behavior: 'smooth' });
                }, 10);
              }}
              className="interactive font-display text-sm font-bold text-black/60 dark:text-zinc-400 hover:text-black dark:hover:text-white uppercase tracking-widest transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-6">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="interactive w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-black/70 dark:text-zinc-400 hover:text-ecotribe-primary dark:hover:text-ecotribe-primary transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* CTA */}
          <button
            onClick={handleOnboardClick}
            className="interactive hidden md:block px-8 py-2 bg-black/5 dark:bg-white/5 hover:bg-ecotribe-primary hover:text-black dark:hover:text-black border border-black/10 dark:border-white/10 hover:border-transparent text-xs font-mono font-bold text-black dark:text-white uppercase tracking-widest transition-all duration-300 btn-chamfer"
          >
            Onboard
          </button>
        </div>

        {/* Mobile Menu Icon (Placeholder) */}
        <div className="md:hidden w-8 h-8 flex flex-col justify-center gap-1.5 interactive">
          <div className="w-full h-[2px] bg-black dark:bg-white"></div>
          <div className="w-2/3 h-[2px] bg-black dark:bg-white self-end"></div>
        </div>

      </div>
    </motion.nav>
  );
};

export default Navbar;
