
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-transparent py-20">
      
      <div className="relative z-10 w-full max-w-md px-6">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col gap-12 text-center"
        >
          {/* Header */}
          <div className="space-y-2">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mb-6"
            >
               <div className="h-[1px] w-8 bg-black/20 dark:bg-white/20"></div>
               <span className="font-mono font-bold text-[10px] uppercase tracking-[0.3em] text-black/40 dark:text-white/40">
                 System v4.0
               </span>
               <div className="h-[1px] w-8 bg-black/20 dark:bg-white/20"></div>
            </motion.div>

            <h1 className="font-brand font-black text-5xl md:text-6xl text-black dark:text-white uppercase tracking-tight leading-none">
              Portal <br />
              {/* Stick to brand fonts only: Rajdhani for the subtext */}
              <span className="font-display italic font-semibold lowercase tracking-normal text-black/60 dark:text-white/60">access</span>
            </h1>
          </div>

          {/* Form */}
          <form className="w-full space-y-8" onSubmit={handleSubmit}>
            
            <div className="space-y-6">
              <div className="group relative">
                <input 
                  type="email" 
                  placeholder="PROTOCOL ID" 
                  className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-4 font-mono text-sm font-medium text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary dark:focus:border-ecotribe-primary transition-colors uppercase tracking-widest text-center"
                />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-ecotribe-primary scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500 origin-center"></div>
              </div>

              <div className="group relative">
                <input 
                  type="password" 
                  placeholder="ACCESS KEY" 
                  className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-4 font-mono text-sm font-medium text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary dark:focus:border-ecotribe-primary transition-colors uppercase tracking-widest text-center"
                />
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-ecotribe-primary scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500 origin-center"></div>
              </div>
            </div>

            <motion.button 
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 bg-black dark:bg-white text-white dark:text-black font-brand font-bold uppercase tracking-[0.2em] hover:bg-ecotribe-primary hover:text-white dark:hover:bg-ecotribe-primary dark:hover:text-black transition-all duration-300 shadow-lg dark:shadow-none flex items-center justify-center gap-4 group btn-chamfer"
            >
              <span>Initialize Session</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.button>

            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-black/40 dark:text-white/40">
              <a href="#" className="hover:text-ecotribe-primary transition-colors">Recover Key</a>
              <a href="#" className="hover:text-ecotribe-primary transition-colors">Request Node</a>
            </div>

          </form>

        </motion.div>

      </div>
    </section>
  );
};

export default Login;
