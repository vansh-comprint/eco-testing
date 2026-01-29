import {
  Navbar,
  Hero,
  WhatWeSolve,
  CorePillars,
  ServicesGrid,
  HowItWorks,
  Compliance,
  ESGReporting,
  Industries,
  CaseStudies,
  LeadCapture,
  FAQ,
  FinalCTA,
  Footer,
} from '@/components/landing-v2';
import { useThemeStore } from '@/stores';

export function LandingPage() {
  const { theme } = useThemeStore();

  return (
    <div className={`relative min-h-screen ${theme === 'dark' ? 'bg-[#050505] text-white' : 'bg-white text-slate-900'}`}>
      {/* Main Content */}
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <WhatWeSolve />
        <CorePillars />
        <ServicesGrid />
        <HowItWorks />
        <Compliance />
        <ESGReporting />
        <Industries />
        <CaseStudies />
        <LeadCapture />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>

      {/* Film Grain Overlay */}
      <div
        className={`fixed inset-0 pointer-events-none z-[9999] ${
          theme === 'dark' ? 'opacity-[0.03] mix-blend-overlay' : 'opacity-[0.02] mix-blend-multiply'
        }`}
        style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
      />
    </div>
  );
}
