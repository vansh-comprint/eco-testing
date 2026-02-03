import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export function TermsOfService() {
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
              <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-lime-500" />
            </div>
            <div>
              <h1 className="font-brand font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Terms of Service
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
              Agreement to Terms
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              By accessing or using the EcoTribe platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Services Description
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-4">
              EcoTribe provides an IT asset lifecycle management platform that includes:
            </p>
            <ul className="space-y-2">
              {[
                'Asset intake and cataloging',
                'Device condition assessment and valuation',
                'Secure data destruction certification',
                'Logistics coordination for asset pickup',
                'Compliance documentation and reporting',
                'ESG impact reporting',
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
              User Responsibilities
            </h2>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Accurate Information</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  You agree to provide accurate and complete information about your organization and the assets submitted for evaluation.
                </p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Asset Ownership</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  You warrant that you have the legal right to dispose of any assets submitted through our platform.
                </p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Data Backup</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  You are responsible for backing up any data on devices before submission. EcoTribe is not liable for any data loss.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Valuations and Payments
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              Device valuations are estimates based on the information provided and are subject to physical verification. Final values may differ based on actual device condition. Payment terms are as agreed in your enterprise contract.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Limitation of Liability
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              EcoTribe's liability is limited to the value of services provided. We are not liable for indirect, incidental, or consequential damages arising from the use of our platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Contact Us
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-4">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="p-4 border border-lime-500/30 bg-lime-500/5">
              <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                Email: <a href="mailto:legal@ecotribe.in" className="text-lime-500 hover:underline">legal@ecotribe.in</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default TermsOfService;
