import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie } from 'lucide-react';

export function CookiePolicy() {
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
              <Cookie className="w-5 h-5 sm:w-7 sm:h-7 text-lime-500" />
            </div>
            <div>
              <h1 className="font-brand font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Cookie Policy
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
              What Are Cookies
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help us provide a better user experience by remembering your preferences and understanding how you use our platform.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Types of Cookies We Use
            </h2>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Essential Cookies</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  Required for the platform to function properly. These include authentication cookies and session management.
                </p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Preference Cookies</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  Remember your settings and preferences, such as theme (light/dark mode) and language preferences.
                </p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-2">Analytics Cookies</h3>
                <p className="font-mono text-sm text-slate-600 dark:text-white/70">
                  Help us understand how visitors interact with our platform so we can improve our services.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Managing Cookies
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-4">
              You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our platform.
            </p>
            <ul className="space-y-2">
              {[
                'Chrome: Settings > Privacy and Security > Cookies',
                'Firefox: Options > Privacy & Security > Cookies',
                'Safari: Preferences > Privacy > Cookies',
                'Edge: Settings > Cookies and Site Permissions',
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
              Third-Party Cookies
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed">
              We may use third-party services that set their own cookies, such as analytics providers. These cookies are governed by the respective third parties' privacy policies.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white uppercase tracking-wide mb-4">
              Contact Us
            </h2>
            <p className="font-mono text-sm text-slate-600 dark:text-white/70 leading-relaxed mb-4">
              If you have any questions about our use of cookies, please contact us:
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

export default CookiePolicy;
