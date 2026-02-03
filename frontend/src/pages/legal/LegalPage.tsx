import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

function LegalPage({ title, lastUpdated = 'January 2026', children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-ecotribe-dark">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 min-h-[44px] text-zinc-500 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <h1 className="font-brand font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white uppercase tracking-tight mb-2">
          {title}
        </h1>
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-8">
          Last updated: {lastUpdated}
        </p>
        <div className="prose prose-slate dark:prose-invert max-w-none font-display text-sm leading-relaxed space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        EcoTribe is committed to protecting your privacy. This Privacy Policy explains how we collect,
        use, disclose, and safeguard your information when you use our platform.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Information We Collect
      </h2>
      <p>
        We collect information you provide directly to us, including your name, email address,
        phone number, company information, and asset details submitted through our platform.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        How We Use Your Information
      </h2>
      <p>
        We use the information we collect to operate, maintain, and improve our services,
        process asset evaluations and transactions, communicate with you, and comply with legal obligations.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Data Security
      </h2>
      <p>
        We implement appropriate technical and organizational measures to protect your personal
        information against unauthorized access, alteration, disclosure, or destruction.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Contact Us
      </h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at privacy@ecotribe.in.
      </p>
    </LegalPage>
  );
}

export function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        Welcome to EcoTribe. By accessing or using our platform, you agree to be bound by these
        Terms of Service and all applicable laws and regulations.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Use of Service
      </h2>
      <p>
        You may use our platform only for lawful purposes and in accordance with these Terms.
        You agree not to use the platform in any way that could damage, disable, or impair the service.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Account Responsibilities
      </h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials
        and for all activities that occur under your account.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Asset Evaluation
      </h2>
      <p>
        All asset evaluations and pricing are conducted according to our grading standards.
        Final prices are determined through our multi-stage quality assessment process.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Limitation of Liability
      </h2>
      <p>
        EcoTribe shall not be liable for any indirect, incidental, special, consequential,
        or punitive damages arising from your use of the platform.
      </p>
    </LegalPage>
  );
}

export function CookiePolicy() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        This Cookie Policy explains how EcoTribe uses cookies and similar tracking technologies
        when you visit our platform.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        What Are Cookies
      </h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. They help
        us provide you with a better experience by remembering your preferences and login sessions.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Cookies We Use
      </h2>
      <p>
        We use essential cookies for authentication and session management. These cookies are
        necessary for the platform to function and cannot be disabled.
      </p>
      <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase mt-8 mb-3">
        Managing Cookies
      </h2>
      <p>
        You can control cookies through your browser settings. Note that disabling essential
        cookies may prevent you from using certain features of our platform.
      </p>
    </LegalPage>
  );
}
