import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Input, Dropdown } from '@/components/ui';
import type { IndustryType } from '@/types';
import { enterpriseApplicationsApi } from '@/lib/api/applications';

const industryOptions: { label: string; value: IndustryType }[] = [
  { label: 'Technology', value: 'technology' },
  { label: 'Finance', value: 'finance' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Retail', value: 'retail' },
  { label: 'Government', value: 'government' },
  { label: 'Other', value: 'other' },
];

const companySizeOptions = [
  { label: '1-50 employees', value: '1-50' },
  { label: '51-200 employees', value: '51-200' },
  { label: '201-500 employees', value: '201-500' },
  { label: '501-1000 employees', value: '501-1000' },
  { label: '1000+ employees', value: '1000+' },
];

export function SignupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Personal Info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 2 - Enterprise Info
    companyName: '',
    industry: '' as IndustryType | '',
    companySize: '',
    phone: '',
    // Step 3 - Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
  });
  const [skipAdminCreation, setSkipAdminCreation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNum === 1 && !skipAdminCreation) {
      // Only validate Step 1 if we're not skipping admin creation
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (stepNum === 2) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.industry) newErrors.industry = 'Industry is required';
      if (!formData.companySize) newErrors.companySize = 'Company size is required';
    }

    if (stepNum === 3) {
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state.trim()) newErrors.state = 'State is required';
      if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsLoading(true);
    try {
      // Build the address string from form fields
      const addressParts = [formData.street, formData.city, formData.state, formData.zipCode, formData.country]
        .filter(Boolean);
      const registeredAddress = addressParts.join(', ');

      // Submit enterprise application via backend API
      const result = await enterpriseApplicationsApi.create({
        company_name: formData.companyName,
        industry_type: formData.industry || undefined,
        company_size: formData.companySize || undefined,
        registered_address: registeredAddress || undefined,
        // Org admin details (only if not skipping)
        org_admin_name: skipAdminCreation ? formData.companyName : formData.name,
        org_admin_email: skipAdminCreation ? `pending-${Date.now()}@placeholder.com` : formData.email,
        org_admin_phone: formData.phone || undefined,
        password: skipAdminCreation ? undefined : formData.password,
      });

      if (!result.success) {
        // Extract validation details from backend response
        const details = result.error?.details;
        if (details?.detail && Array.isArray(details.detail)) {
          const fieldErrors = details.detail
            .map((d: any) => {
              const field = d.loc?.[d.loc.length - 1] || 'unknown';
              return `${field}: ${d.msg}`;
            })
            .join('; ');
          throw new Error(fieldErrors || result.error?.message || 'Validation failed');
        }
        throw new Error(result.error?.message || 'Failed to submit application');
      }

      // Navigate to pending approval page
      navigate('/signup/pending-approval', {
        state: {
          companyName: formData.companyName,
          email: skipAdminCreation ? 'N/A - No admin created yet' : formData.email
        }
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create account. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Your Details' },
    { number: 2, title: 'Enterprise Info' },
    { number: 3, title: 'Address' },
  ];

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <motion.h1
              className="font-brand font-black text-4xl tracking-tight text-black dark:text-white leading-none"
              whileHover={{ scale: 1.02 }}
            >
              ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
            </motion.h1>
          </Link>
          <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">Register Your Enterprise</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: step >= s.number ? 'rgb(132, 204, 22)' : 'rgba(0, 0, 0, 0.1)',
                  scale: step === s.number ? 1.1 : 1,
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono transition-colors backdrop-blur-sm border ${
                  step >= s.number
                    ? 'text-black border-ecotribe-primary'
                    : 'text-black/40 dark:text-white/40 border-black/10 dark:border-white/10'
                }`}
              >
                {step > s.number ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  s.number
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 transition-colors ${
                  step > s.number ? 'bg-ecotribe-primary' : 'bg-black/10 dark:bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="p-8 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/5 shadow-2xl dark:shadow-none">
          <div className="text-center mb-8">
            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase mb-2">{steps[step - 1].title}</h2>
            <p className="text-black/60 dark:text-zinc-400 font-mono text-xs uppercase tracking-wider">
              {step === 1 && (skipAdminCreation ? 'Skipping initial admin account' : 'Create your IT Admin account (Optional)')}
              {step === 2 && 'Tell us about your company'}
              {step === 3 && 'Where is your company located?'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-8">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Skip Admin Creation Checkbox */}
                  <div className="p-4 bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded backdrop-blur-sm">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={skipAdminCreation}
                        onChange={(e) => {
                          setSkipAdminCreation(e.target.checked);
                          // Clear Step 1 errors when toggling
                          if (e.target.checked) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.name;
                              delete newErrors.email;
                              delete newErrors.password;
                              delete newErrors.confirmPassword;
                              return newErrors;
                            });
                          }
                        }}
                        className="mt-0.5 w-4 h-4 accent-ecotribe-primary"
                      />
                      <div className="flex-1">
                        <p className="font-mono text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
                          Skip initial admin account
                        </p>
                        <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 mt-1">
                          Create enterprise only. Admin users (IT Admin/CFO) can be added later by Super Admin.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Admin Account Fields - Only show if not skipping */}
                  {!skipAdminCreation && (
                    <>
                      <Input
                        label="Full Name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        error={errors.name}
                      />
                      <Input
                        label="Work Email"
                        type="email"
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        error={errors.email}
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        error={errors.password}
                        hint="Minimum 8 characters"
                      />
                      <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        error={errors.confirmPassword}
                      />
                    </>
                  )}

                  {/* Info message when skipping */}
                  {skipAdminCreation && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                      <p className="font-mono text-xs text-amber-800 dark:text-amber-200 font-bold mb-1">
                        ℹ️ No admin account will be created
                      </p>
                      <p className="font-mono text-xs text-amber-700 dark:text-amber-300">
                        After enterprise approval, Super Admin can add IT Admin, CFO, or other users to this enterprise.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 2: Enterprise Info */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Input
                    label="Company Name"
                    placeholder="Acme Corporation"
                    value={formData.companyName}
                    onChange={(e) => updateField('companyName', e.target.value)}
                    error={errors.companyName}
                  />
                  <Dropdown
                    label="Industry"
                    placeholder="Select your industry"
                    options={industryOptions}
                    value={formData.industry}
                    onChange={(value) => updateField('industry', value)}
                    error={errors.industry}
                  />
                  <Dropdown
                    label="Company Size"
                    placeholder="Select company size"
                    options={companySizeOptions}
                    value={formData.companySize}
                    onChange={(value) => updateField('companySize', value)}
                    error={errors.companySize}
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </motion.div>
              )}

              {/* Step 3: Address */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Input
                    label="Street Address"
                    placeholder="123 Main Street"
                    value={formData.street}
                    onChange={(e) => updateField('street', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      placeholder="San Francisco"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      error={errors.city}
                    />
                    <Input
                      label="State"
                      placeholder="CA"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      error={errors.state}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="ZIP Code"
                      placeholder="94102"
                      value={formData.zipCode}
                      onChange={(e) => updateField('zipCode', e.target.value)}
                      error={errors.zipCode}
                    />
                    <Input
                      label="Country"
                      placeholder="USA"
                      value={formData.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      disabled
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {errors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="font-mono text-xs text-red-700 dark:text-red-300">{errors.submit}</p>
                </div>
              )}
              <div className="flex gap-3 w-full">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={handleNext}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                )}
              </div>

              <p className="text-center text-black/60 dark:text-white/60 text-sm font-mono">
                Already have an account?{' '}
                <Link to="/login" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-bold">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Terms */}
        <p className="text-center text-black/40 dark:text-white/40 text-xs mt-6 font-mono">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
