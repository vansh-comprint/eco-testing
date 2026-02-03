import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[44px] text-slate-500 dark:text-white/50 hover:text-lime-500 transition-colors font-mono text-sm uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-lime-500/10 border border-lime-500/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-7 sm:h-7 text-lime-500" />
            </div>
            <div>
              <h1 className="font-brand font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Privacy Policy
              </h1>
              <p className="font-mono text-sm text-slate-500 dark:text-white/50 mt-1">
                Last updated: December 2024
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Introduction
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              EcoTribe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our IT asset lifecycle management platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Personal Information</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  Name, email address, phone number, company name, and job title when you register for our services.
                </p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Device Information</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  Details about IT assets submitted for evaluation, including serial numbers, specifications, and condition assessments.
                </p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Usage Data</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  Information about how you interact with our platform, including pages visited and features used.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              How We Use Your Information
            </h2>
            <ul className="space-y-2">
              {[
                'Process and manage IT asset trade-in requests',
                'Provide accurate device valuations and estimates',
                'Communicate with you about your submissions',
                'Generate compliance and ESG reports',
                'Improve our services and user experience',
                'Comply with legal obligations',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-lime-500 mt-2 flex-shrink-0" />
                  <span className="font-mono text-sm text-slate-600 dark:text-white/70">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Data Security
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure data centers, and regular security audits. Our platform is designed to meet enterprise compliance requirements.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Contact Us
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="p-4 border border-lime-500/30 bg-lime-500/5">
              <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                Email: <a href="mailto:privacy@ecotribe.in" className="text-lime-500 hover:underline">privacy@ecotribe.in</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default PrivacyPolicy;
