
import React, { useEffect, useState, createContext, useContext } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Manifesto from './components/Manifesto';
import Process from './components/Process';
import Protocol from './components/Protocol';
import Join from './components/Join';
import Footer from './components/Footer';
import CustomCursor from './components/CustomCursor';
import { Waves } from './components/Waves';
import Login from './components/Login';
import AdminPortal from './components/AdminPortal';

// Theme Context
type Theme = 'dark' | 'light';
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
export const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentView, setCurrentView] = useState<'home' | 'login' | 'admin'>('home');

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('ecotribe-theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark for "Premium" feel if no preference
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'dark');
    
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Simulate high-end asset loading
    const timer = setTimeout(() => setIsLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ecotribe-theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className="relative min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white transition-colors duration-500 selection:bg-ecotribe-primary selection:text-black">
        
        {!isLoaded ? (
          <IntroSequence />
        ) : (
          <>
            <CustomCursor />
            
            {/* Global Continuous Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
               
               {/* Grid Mesh - LAYER 1 (Behind Glow) */}
               <Waves 
                  backgroundColor="transparent" 
                  // Light Mode: Pure Black stroke with 0.4 opacity for crisp technical drawing look
                  // Dark Mode: White stroke (0.15 opacity) for subtle tech feel on black
                  strokeColor={theme === 'dark' ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.4)"}
                  pointerSize={2}
               />

               {/* Ethereal Glow Overlay - LAYER 2 (Behind Text) */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {/* 
                     Light Mode: 'mix-blend-multiply' allows the green to soak into the white background.
                     Dark Mode: 'mix-blend-normal' with low opacity to avoid washout.
                  */}
                  <div className={`w-full h-full ${theme === 'dark' ? 'mix-blend-normal opacity-30' : 'mix-blend-multiply opacity-50'}`}>
                      {/* Layer 1: Primary Glow */}
                      <div className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] bg-ecotribe-primary rounded-full blur-[140px] opacity-40 animate-breathe" />
                      
                      {/* Layer 2: Secondary Glow */}
                      <div 
                        className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] bg-ecotribe-light-primary rounded-full blur-[140px] opacity-40 animate-breathe" 
                        style={{ animationDelay: '2s' }} 
                      />
                      
                      {/* Layer 3: Ethereal Fog (Slow Mover) */}
                      <div 
                        className="absolute top-[40%] left-[20%] w-[50vw] h-[50vw] bg-ecotribe-tertiary dark:bg-ecotribe-secondary rounded-full blur-[160px] opacity-30 animate-breathe" 
                        style={{ animationDelay: '5s' }} 
                      />
                  </div>
                </div>

            </div>

            {currentView !== 'admin' && <Navbar onNavigate={setCurrentView} />}
            
            <main className={`relative z-10 flex flex-col w-full ${currentView === 'admin' ? 'h-screen overflow-hidden' : ''}`}>
              {currentView === 'home' && (
                <>
                  <Hero />
                  <Manifesto />
                  <Process />
                  <Protocol />
                  <Join />
                  <Footer />
                </>
              )}
              
              {currentView === 'login' && (
                <Login onLogin={() => setCurrentView('admin')} />
              )}

              {currentView === 'admin' && (
                <AdminPortal onLogout={() => setCurrentView('home')} />
              )}
            </main>
            
          </>
        )}
      </div>
    </ThemeContext.Provider>
  );
};

const IntroSequence = () => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]">
    <div className="flex flex-col items-center">
       <div className="h-[1px] w-24 bg-ecotribe-primary/50 mb-8 animate-pulse"></div>
       <div className="font-brand font-bold text-sm tracking-[0.5em] text-white uppercase animate-pulse">
         Eco/Tribe
       </div>
       <div className="mt-2 font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
         System Loading
       </div>
    </div>
  </div>
);

export default App;
