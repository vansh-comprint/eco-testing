/**
 * Enterprise Registration Page - Multi-step Form
 * V3: New registration flow with document upload and admin approval
 *
 * Flow:
 * 0. Document Requirements Modal (landing) - Shows required docs checklist
 * 1. Company Details (name, GST, PAN, address)
 * 2. Org Admin Details (name, email, phone, designation)
 * 3. Document Upload (GST cert, PAN card, incorporation)
 * 4. Set Password & Submit
 */

import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  User,
  FileText,
  Lock,
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
  FileCheck,
  CheckCircle2,
  Circle,
  ClipboardList
} from 'lucide-react';
import { useCreateEnterpriseApplication, useCheckGSTExists, useCheckEmailExists, useUploadDocument } from '@/hooks';
import { API_BASE_URL } from '@/lib/api/client';
import { text } from '@/lib/design-tokens';
import { validatePassword, PASSWORD_HINT } from '@/lib/validation';

// Required documents list
const requiredDocuments = [
  { id: 'gst', label: 'GST Certificate', description: 'Valid GST registration certificate (PDF/Image)' },
  { id: 'pan', label: 'Company PAN Card', description: 'PAN card of the company (PDF/Image)' },
  { id: 'incorporation', label: 'Certificate of Incorporation', description: 'Company registration certificate (PDF/Image)' },
  { id: 'signatory', label: 'Authorized Signatory ID Proof', description: 'Aadhaar/PAN/Passport of authorized person (PDF/Image)' },
  { id: 'address', label: 'Company Address Proof', description: 'Utility bill or bank statement (PDF/Image)' },
];

const optionalDocuments = [
  { id: 'msme', label: 'MSME Certificate', description: 'If applicable for your organization' },
  { id: 'logo', label: 'Company Logo', description: 'PNG/JPG format for branding' },
];

// Industry options
const industryOptions = [
  { label: 'Information Technology', value: 'technology' },
  { label: 'Banking & Finance', value: 'finance' },
  { label: 'Healthcare & Pharma', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Retail & E-commerce', value: 'retail' },
  { label: 'Government & PSU', value: 'government' },
  { label: 'Telecom', value: 'telecom' },
  { label: 'Media & Entertainment', value: 'media' },
  { label: 'Other', value: 'other' },
];

// Company size options
const companySizeOptions = [
  { label: '1-50 employees', value: '1-50' },
  { label: '51-200 employees', value: '51-200' },
  { label: '201-500 employees', value: '201-500' },
  { label: '501-1000 employees', value: '501-1000' },
  { label: '1000+ employees', value: '1000+' },
];

// Indian states
const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry'
];

// Form data interface
interface FormData {
  // Step 1: Company Details
  companyName: string;
  gstNumber: string;
  panNumber: string;
  industryType: string;
  companySize: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  // Step 2: Org Admin Details
  orgAdminName: string;
  orgAdminEmail: string;
  orgAdminPhone: string;
  orgAdminDesignation: string;
  // Step 3: Documents (URLs after upload)
  docGstCertificate: string;
  docPanCard: string;
  docIncorporationCert: string;
  docSignatoryId: string;
  docAddressProof: string;
  docCompanyLogo: string;
  // Step 4: Password
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

// Step configuration
const steps = [
  { number: 1, title: 'Company Details', icon: Building2 },
  { number: 2, title: 'Admin Details', icon: User },
  { number: 3, title: 'Documents', icon: FileText },
  { number: 4, title: 'Set Password', icon: Lock },
];

export function EnterpriseRegister() {
  const navigate = useNavigate();
  const [showRequirementsModal, setShowRequirementsModal] = useState(true);
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    gstNumber: '',
    panNumber: '',
    industryType: '',
    companySize: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    orgAdminName: '',
    orgAdminEmail: '',
    orgAdminPhone: '',
    orgAdminDesignation: '',
    docGstCertificate: '',
    docPanCard: '',
    docIncorporationCert: '',
    docSignatoryId: '',
    docAddressProof: '',
    docCompanyLogo: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // React Query mutations
  const createApplication = useCreateEnterpriseApplication();

  // Update form field
  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate GST number format (15 characters)
  const validateGST = (gst: string): boolean => {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  // Validate PAN number format (10 characters)
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  // Validate Indian phone number (10 digits, starts with 6-9)
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  // Validate PIN code (6 digits)
  const validatePinCode = (pin: string): boolean => {
    return /^\d{6}$/.test(pin);
  };

  // Validate name (letters and spaces only, no numbers)
  const validateName = (name: string): boolean => {
    return /^[a-zA-Z\s]+$/.test(name.trim()) && name.trim().length >= 2;
  };

  // Full validation for all steps
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    // Step 1: Company Details - Full validation
    if (step === 1) {
      // Company name
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      } else if (formData.companyName.trim().length < 2) {
        newErrors.companyName = 'Company name must be at least 2 characters';
      }

      // GST Number
      if (!formData.gstNumber.trim()) {
        newErrors.gstNumber = 'GST number is required';
      } else if (!validateGST(formData.gstNumber)) {
        newErrors.gstNumber = 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
      }

      // PAN Number
      if (!formData.panNumber.trim()) {
        newErrors.panNumber = 'PAN number is required';
      } else if (!validatePAN(formData.panNumber)) {
        newErrors.panNumber = 'Invalid PAN format (e.g., AAAPL1234C)';
      }

      // Industry Type
      if (!formData.industryType) {
        newErrors.industryType = 'Please select an industry';
      }

      // Company Size
      if (!formData.companySize) {
        newErrors.companySize = 'Please select company size';
      }

      // Address Line 1
      if (!formData.addressLine1.trim()) {
        newErrors.addressLine1 = 'Address is required';
      }

      // City
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      } else if (!/^[a-zA-Z\s]+$/.test(formData.city.trim())) {
        newErrors.city = 'City must contain only letters';
      }

      // State
      if (!formData.state) {
        newErrors.state = 'State is required';
      }

      // PIN Code
      if (!formData.pinCode) {
        newErrors.pinCode = 'PIN code is required';
      } else if (!validatePinCode(formData.pinCode)) {
        newErrors.pinCode = 'PIN code must be 6 digits';
      }
    }

    // Step 2: Org Admin Details - Full validation
    if (step === 2) {
      // Full Name
      if (!formData.orgAdminName.trim()) {
        newErrors.orgAdminName = 'Full name is required';
      } else if (!validateName(formData.orgAdminName)) {
        newErrors.orgAdminName = 'Name must contain only letters (no numbers)';
      }

      // Email
      if (!formData.orgAdminEmail.trim()) {
        newErrors.orgAdminEmail = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.orgAdminEmail)) {
        newErrors.orgAdminEmail = 'Invalid email format';
      }

      // Phone Number
      if (!formData.orgAdminPhone.trim()) {
        newErrors.orgAdminPhone = 'Phone number is required';
      } else if (!validatePhone(formData.orgAdminPhone)) {
        newErrors.orgAdminPhone = 'Invalid phone number (10 digits, starting with 6-9)';
      }
    }

    // Step 3: Document Upload - Require all 5 essential documents
    if (step === 3) {
      if (!formData.docGstCertificate) {
        newErrors.docGstCertificate = 'GST Certificate is required';
      }
      if (!formData.docPanCard) {
        newErrors.docPanCard = 'PAN Card is required';
      }
      if (!formData.docIncorporationCert) {
        newErrors.docIncorporationCert = 'Certificate of Incorporation is required';
      }
      if (!formData.docSignatoryId) {
        newErrors.docSignatoryId = 'Authorized Signatory ID Proof is required';
      }
      if (!formData.docAddressProof) {
        newErrors.docAddressProof = 'Company Address Proof is required';
      }
    }

    // Step 4: Password - Full validation
    if (step === 4) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else {
        const pwError = validatePassword(formData.password);
        if (pwError) newErrors.password = pwError;
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (!formData.termsAccepted) {
        newErrors.termsAccepted = 'You must accept the Terms of Service';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Map form field names to backend document types
  const fieldToDocType: Record<string, string> = {
    docGstCertificate: 'gst',
    docPanCard: 'pan',
    docIncorporationCert: 'incorporation',
    docSignatoryId: 'signatory_id',
    docAddressProof: 'address_proof',
    docCompanyLogo: 'logo',
  };

  // Handle file upload via API
  const handleFileUpload = async (field: keyof FormData, file: File) => {
    setUploadProgress(prev => ({ ...prev, [field]: 0 }));

    // Show incremental progress while uploading
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const current = prev[field] || 0;
        if (current >= 90) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, [field]: Math.min(current + 15, 90) };
      });
    }, 300);

    try {
      const docType = fieldToDocType[field] || 'gst';
      const formDataUpload = new window.FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('document_type', docType);

      const response = await fetch(`${API_BASE_URL}/enterprises/applications/upload-document`, {
        method: 'POST',
        body: formDataUpload,
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const fileUrl = data.data?.file_url;

      if (!fileUrl) {
        throw new Error('No file URL returned from server');
      }

      updateField(field, fileUrl);
      setUploadProgress(prev => ({ ...prev, [field]: 100 }));
    } catch (error) {
      clearInterval(interval);
      // Remove progress entry entirely so isUploading becomes false and user can retry
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setErrors(prev => ({
        ...prev,
        [field]: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const registeredAddress = [
        formData.addressLine1,
        formData.addressLine2,
        formData.city,
        formData.state,
        formData.pinCode
      ].filter(Boolean).join(', ');

      await createApplication.mutateAsync({
        company_name: formData.companyName,
        gst_number: formData.gstNumber.toUpperCase(),
        pan_number: formData.panNumber.toUpperCase(),
        registered_address: registeredAddress,
        industry_type: formData.industryType,
        company_size: formData.companySize,
        org_admin_name: formData.orgAdminName,
        org_admin_email: formData.orgAdminEmail,
        org_admin_phone: formData.orgAdminPhone,
        org_admin_designation: formData.orgAdminDesignation,
        password: formData.password,
        doc_gst_certificate: formData.docGstCertificate,
        doc_pan_card: formData.docPanCard,
        doc_incorporation_cert: formData.docIncorporationCert,
        doc_signatory_id: formData.docSignatoryId,
        doc_address_proof: formData.docAddressProof,
        doc_company_logo: formData.docCompanyLogo,
      });

      // Navigate to pending approval page with company name
      navigate('/signup/pending-approval', {
        state: {
          companyName: formData.companyName,
          email: formData.orgAdminEmail,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to submit application. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Document Requirements Landing Page
  if (showRequirementsModal) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl relative z-10"
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
            <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">B2B Refurbished Laptop Trade-In</p>
          </div>

          {/* Document Requirements Card */}
          <div className="p-5 sm:p-8 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/5 shadow-2xl dark:shadow-none">
            <div className="text-center mb-6">
              <h2 className="font-brand font-bold text-xl sm:text-2xl text-black dark:text-white uppercase">Documents Required</h2>
              <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">
                Please ensure you have the following ready
              </p>
            </div>

            {/* Required Documents */}
            <div className="mb-6">
              <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 block mb-3">
                Required Documents
              </label>
              <div className="space-y-2">
                {requiredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 border-l-2 border-l-ecotribe-primary"
                  >
                    <CheckCircle2 className="w-4 h-4 text-ecotribe-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-bold text-black dark:text-white">{doc.label}</p>
                      <p className="font-mono text-[10px] text-black/50 dark:text-white/50">{doc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Documents */}
            <div className="mb-6">
              <label className="font-mono text-[10px] uppercase tracking-widest text-black/30 dark:text-white/30 block mb-3">
                Optional
              </label>
              <div className="space-y-2">
                {optionalDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start gap-3 p-3 bg-white/20 dark:bg-black/20 border border-black/5 dark:border-white/5"
                  >
                    <Circle className="w-4 h-4 text-black/30 dark:text-white/30 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-xs text-black/60 dark:text-white/60">{doc.label}</p>
                      <p className="font-mono text-[10px] text-black/40 dark:text-white/40">{doc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="mb-6 p-4 bg-ecotribe-primary/10 border border-ecotribe-primary/30 border-l-4 border-l-ecotribe-primary">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentsConfirmed}
                  onChange={(e) => setDocumentsConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-ecotribe-primary border-black/20 dark:border-white/20 focus:ring-ecotribe-primary rounded"
                />
                <span className="font-mono text-xs text-black/70 dark:text-white/70">
                  I have all required documents ready to upload
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex-1 px-4 py-3 min-h-[44px] bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 text-black/70 dark:text-white/70 hover:border-ecotribe-primary/40 transition-all font-brand font-bold text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowRequirementsModal(false)}
                disabled={!documentsConfirmed}
                className="flex-1 px-4 py-3 min-h-[44px] bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Proceed
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center mt-6 text-black/60 dark:text-white/60 text-sm font-mono">
            Already have an account?{' '}
            <Link to="/login" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-bold">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    );
  }

  // Main Registration Form
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
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
          <p className="text-black/60 dark:text-zinc-400 mt-2 font-mono text-xs uppercase tracking-wider">B2B Refurbished Laptop Trade-In</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[320px]">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;

              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center transition-all border ${
                        isCompleted
                          ? 'bg-ecotribe-primary border-ecotribe-primary text-black'
                          : isCurrent
                          ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                          : 'bg-white/40 dark:bg-black/40 border-black/10 dark:border-white/10 text-black/50 dark:text-white/50'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span
                      className={`mt-2 font-mono text-[8px] sm:text-[10px] uppercase tracking-widest ${
                        isCurrent
                          ? 'text-black dark:text-white font-bold'
                          : isCompleted
                          ? 'text-ecotribe-primary font-bold'
                          : 'text-black/50 dark:text-white/50'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-6 sm:w-12 md:w-20 h-0.5 mx-1 ${
                        isCompleted ? 'bg-ecotribe-primary' : 'bg-black/10 dark:bg-white/10'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="p-4 sm:p-8 bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-black/10 dark:border-white/5 shadow-2xl dark:shadow-none">
            <AnimatePresence mode="wait">
              {/* Step 1: Company Details */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="font-brand font-bold text-xl text-black dark:text-white uppercase mb-6">
                    Company Details
                  </h2>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      placeholder="Enter company name"
                      className={`w-full bg-white/40 dark:bg-black/40 border ${
                        errors.companyName ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                      } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                    />
                    {errors.companyName && (
                      <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.companyName}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                        GST Number *
                      </label>
                      <input
                        type="text"
                        value={formData.gstNumber}
                        onChange={(e) => updateField('gstNumber', e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.gstNumber ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs uppercase focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                      />
                      {errors.gstNumber && (
                        <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.gstNumber}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                        PAN Number *
                      </label>
                      <input
                        type="text"
                        value={formData.panNumber}
                        onChange={(e) => updateField('panNumber', e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                        placeholder="AAAPL1234C"
                        maxLength={10}
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.panNumber ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs uppercase focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                      />
                      {errors.panNumber && (
                        <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.panNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                        Industry *
                      </label>
                      <select
                        value={formData.industryType}
                        onChange={(e) => updateField('industryType', e.target.value)}
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.industryType ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white`}
                      >
                        <option value="">Select industry</option>
                        {industryOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {errors.industryType && (
                        <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.industryType}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                        Company Size *
                      </label>
                      <select
                        value={formData.companySize}
                        onChange={(e) => updateField('companySize', e.target.value)}
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.companySize ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white`}
                      >
                        <option value="">Select size</option>
                        {companySizeOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {errors.companySize && (
                        <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.companySize}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                      Registered Address *
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => updateField('addressLine1', e.target.value)}
                      placeholder="Address Line 1"
                      className={`w-full bg-white/40 dark:bg-black/40 border ${
                        errors.addressLine1 ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                      } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 mb-3`}
                    />
                    <input
                      type="text"
                      value={formData.addressLine2}
                      onChange={(e) => updateField('addressLine2', e.target.value)}
                      placeholder="Address Line 2 (Optional)"
                      className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                        placeholder="City *"
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.city ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                      />
                    </div>
                    <div>
                      <select
                        value={formData.state}
                        onChange={(e) => updateField('state', e.target.value)}
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.state ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white`}
                      >
                        <option value="">State *</option>
                        {indianStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.pinCode}
                        onChange={(e) => updateField('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="PIN Code *"
                        maxLength={6}
                        inputMode="numeric"
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.pinCode ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Org Admin Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="font-brand font-bold text-xl text-black dark:text-white uppercase mb-6">
                    Organization Admin Details
                  </h2>

                  <div className="p-4 bg-ecotribe-primary/10 border border-ecotribe-primary/30 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-ecotribe-primary mt-0.5" />
                      <p className="font-mono text-xs text-black/70 dark:text-white/70">
                        This person will be the primary administrator for your organization and will have full access to manage branches, IT admins, and view reports.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.orgAdminName}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '');
                        updateField('orgAdminName', val);
                      }}
                      placeholder="Enter full name"
                      className={`w-full bg-white/40 dark:bg-black/40 border ${
                        errors.orgAdminName ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                      } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                    />
                    {errors.orgAdminName && (
                      <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.orgAdminName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.orgAdminEmail}
                      onChange={(e) => updateField('orgAdminEmail', e.target.value)}
                      placeholder="admin@company.com"
                      className={`w-full bg-white/40 dark:bg-black/40 border ${
                        errors.orgAdminEmail ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                      } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                    />
                    {errors.orgAdminEmail && (
                      <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.orgAdminEmail}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                        Phone Number *
                      </label>
                      <div className="flex">
                        <span className="px-3 py-3 bg-black/10 dark:bg-white/10 border border-r-0 border-black/10 dark:border-white/10 text-black/50 dark:text-white/50 font-mono text-xs">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={formData.orgAdminPhone}
                          onChange={(e) => updateField('orgAdminPhone', e.target.value.replace(/\D/g, ''))}
                          placeholder="9876543210"
                          maxLength={10}
                          inputMode="numeric"
                          className={`w-full bg-white/40 dark:bg-black/40 border ${
                            errors.orgAdminPhone ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                          } font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                        />
                      </div>
                      {errors.orgAdminPhone && (
                        <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.orgAdminPhone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={formData.orgAdminDesignation}
                        onChange={(e) => updateField('orgAdminDesignation', e.target.value)}
                        placeholder="e.g., IT Director"
                        className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary px-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Document Upload */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="font-brand font-bold text-xl text-black dark:text-white uppercase mb-6">
                    Document Upload
                  </h2>

                  <div className="p-4 bg-ecotribe-primary/10 border border-ecotribe-primary/30 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-ecotribe-primary mt-0.5" />
                      <p className="font-mono text-xs text-black/70 dark:text-white/70">
                        Upload clear, legible copies of your documents. Accepted formats: PDF, JPG, PNG (max 5MB each).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DocumentUpload
                      label="GST Certificate *"
                      field="docGstCertificate"
                      value={formData.docGstCertificate}
                      progress={uploadProgress.docGstCertificate}
                      error={errors.docGstCertificate}
                      onUpload={(file) => handleFileUpload('docGstCertificate', file)}
                      onRemove={() => updateField('docGstCertificate', '')}
                    />
                    <DocumentUpload
                      label="PAN Card *"
                      field="docPanCard"
                      value={formData.docPanCard}
                      progress={uploadProgress.docPanCard}
                      error={errors.docPanCard}
                      onUpload={(file) => handleFileUpload('docPanCard', file)}
                      onRemove={() => updateField('docPanCard', '')}
                    />
                    <DocumentUpload
                      label="Certificate of Incorporation *"
                      field="docIncorporationCert"
                      value={formData.docIncorporationCert}
                      progress={uploadProgress.docIncorporationCert}
                      error={errors.docIncorporationCert}
                      onUpload={(file) => handleFileUpload('docIncorporationCert', file)}
                      onRemove={() => updateField('docIncorporationCert', '')}
                    />
                    <DocumentUpload
                      label="Signatory ID Proof *"
                      field="docSignatoryId"
                      value={formData.docSignatoryId}
                      progress={uploadProgress.docSignatoryId}
                      error={errors.docSignatoryId}
                      onUpload={(file) => handleFileUpload('docSignatoryId', file)}
                      onRemove={() => updateField('docSignatoryId', '')}
                    />
                    <DocumentUpload
                      label="Address Proof *"
                      field="docAddressProof"
                      value={formData.docAddressProof}
                      progress={uploadProgress.docAddressProof}
                      error={errors.docAddressProof}
                      onUpload={(file) => handleFileUpload('docAddressProof', file)}
                      onRemove={() => updateField('docAddressProof', '')}
                    />
                    <DocumentUpload
                      label="Company Logo"
                      field="docCompanyLogo"
                      value={formData.docCompanyLogo}
                      progress={uploadProgress.docCompanyLogo}
                      onUpload={(file) => handleFileUpload('docCompanyLogo', file)}
                      onRemove={() => updateField('docCompanyLogo', '')}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 4: Set Password */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="font-brand font-bold text-xl text-black dark:text-white uppercase mb-6">
                    Set Your Password
                  </h2>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder={PASSWORD_HINT}
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.password ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-12 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/30" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        placeholder="Re-enter password"
                        className={`w-full bg-white/40 dark:bg-black/40 border ${
                          errors.confirmPassword ? 'border-red-500' : 'border-black/10 dark:border-white/10'
                        } font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30`}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-400 text-xs font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="pt-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) => updateField('termsAccepted', e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-ecotribe-primary border-black/20 dark:border-white/20 focus:ring-ecotribe-primary rounded"
                      />
                      <span className="font-mono text-xs text-black/60 dark:text-white/60">
                        I agree to the{' '}
                        <Link to="/terms" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-bold">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-bold">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.termsAccepted && (
                      <p className="text-red-400 text-xs font-mono mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.termsAccepted}
                      </p>
                    )}
                  </div>

                  {errors.submit && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-xs font-mono flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.submit}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={currentStep === 1 ? () => navigate('/login') : handlePrev}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors font-mono text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 1 ? 'Back to Login' : 'Previous'}
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 min-h-[44px] bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 min-h-[44px] bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center mt-6 text-black/60 dark:text-white/60 text-sm font-mono">
          Already have an account?{' '}
          <Link to="/login" className="text-ecotribe-primary hover:text-black dark:hover:text-white transition-colors font-bold">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// Document Upload Component
function DocumentUpload({
  label,
  field,
  value,
  progress,
  error,
  onUpload,
  onRemove,
}: {
  label: string;
  field: string;
  value: string;
  progress?: number;
  error?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const [sizeError, setSizeError] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSizeError('File size exceeds 5MB limit');
        e.target.value = '';
        return;
      }
      setSizeError('');
      onUpload(file);
    }
  };

  const isUploading = progress !== undefined && progress < 100;
  const isUploaded = value && progress === 100;

  return (
    <div className="space-y-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
        {label}
      </label>
      <div
        className={`relative border-2 border-dashed ${
          error
            ? 'border-red-400 bg-red-500/10'
            : isUploaded
            ? 'border-ecotribe-primary bg-ecotribe-primary/10'
            : 'border-black/20 dark:border-white/20 hover:border-ecotribe-primary bg-white/20 dark:bg-black/20'
        } p-4 transition-colors`}
      >
        {isUploading ? (
          <div className="text-center">
            <Loader2 className="w-5 h-5 animate-spin text-ecotribe-primary mx-auto mb-2" />
            <p className="font-mono text-xs text-black/60 dark:text-white/60">Uploading... {progress}%</p>
          </div>
        ) : isUploaded ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-ecotribe-primary" />
              <span className="font-mono text-xs text-ecotribe-primary font-bold">Uploaded</span>
            </div>
            <button
              type="button"
              onClick={onRemove}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-black/50 dark:text-white/50" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer">
            <Upload className="w-5 h-5 text-black/30 dark:text-white/30 mb-2" />
            <span className="font-mono text-xs text-black/50 dark:text-white/50">Click to upload</span>
            <input
              type="file"
              onChange={handleChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
            />
          </label>
        )}
      </div>
      {(error || sizeError) && (
        <p className="text-red-400 text-xs font-mono flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error || sizeError}
        </p>
      )}
    </div>
  );
}

export default EnterpriseRegister;
