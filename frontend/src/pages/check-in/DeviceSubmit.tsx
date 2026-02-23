import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  Laptop,
  X,
  AlertCircle,
  Smartphone,
  Battery,
  Monitor,
  Keyboard,
  MousePointer2,
  Usb,
  Box,
  Zap,
  FileCheck,
  Send,
} from 'lucide-react';
import { useAuth, useAsset, useApiError } from '@/hooks';
import { useSubmissionStore } from '@/stores';
import {
  PHOTO_SLOTS,
  batteryOptions,
  screenConditionOptions,
  keyboardConditionOptions,
  trackpadConditionOptions,
  portsConditionOptions,
  hingeConditionOptions,
  bodyConditionOptions,
  chargerStatusOptions,
} from '@/types/submission';

const STEPS = [
  { id: 1, label: 'Confirm', icon: Smartphone },
  { id: 2, label: 'Photos', icon: Camera },
  { id: 3, label: 'Condition', icon: FileCheck },
  { id: 4, label: 'Submit', icon: Send },
];

export function DeviceSubmit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { assetId } = useParams<{ assetId: string }>();
  const { user } = useAuth();
  
  // Determine base path for navigation based on current route
  const basePath = location.pathname.startsWith('/org-admin') 
    ? '/org-admin' 
    : location.pathname.startsWith('/admin') 
      ? '/admin' 
      : '/check-in';
  const { data: asset, isLoading: assetLoading } = useAsset(assetId || '');
  const {
    currentDraft,
    startSubmission,
    setStep,
    setDeviceConfirmed,
    updatePhotos,
    updateFunctionalChecks,
    submitDevice,
    getSubmissionByAssetId,
  } = useSubmissionStore();
  const { handleError, showSuccess, showError } = useApiError();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhotoKey, setCurrentPhotoKey] = useState<string | null>(null);

  useEffect(() => {
    if (assetId && asset) {
      // Check if submission already exists OR asset status indicates submission
      const existingSubmission = getSubmissionByAssetId(assetId);
      const isAlreadySubmitted = existingSubmission || !['assigned', 'check_in_started'].includes(asset.status);

      if (isAlreadySubmitted) {
        // Already submitted, redirect to success/evaluations based on context
        const successPath = basePath === '/check-in' ? `${basePath}/success` : `${basePath}/my-evaluations`;
        navigate(successPath);
        return;
      }

      // Only start new submission if no draft exists or draft is for different asset
      if (!currentDraft || currentDraft.assetId !== assetId) {
        startSubmission(assetId);
      }
    }
  }, [assetId, asset, currentDraft, startSubmission, getSubmissionByAssetId, navigate, basePath]);

  const currentStep = currentDraft?.step || 1;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePhotoCapture = (key: string) => {
    setCurrentPhotoKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentPhotoKey) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePhotos({ [currentPhotoKey]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    setCurrentPhotoKey(null);
  };

  const handleSubmit = async () => {
    if (!currentDraft || !assetId || !user) {
      showError('Submission Error', 'Missing required data. Please try again.');
      return;
    }

    console.log('📤 Starting submission for assetId:', assetId);
    console.log('📋 Current draft:', currentDraft);
    console.log('🔍 Current asset status BEFORE submit:', asset?.status);

    setIsSubmitting(true);
    try {
      const submission = await submitDevice({
        assetId,
        photos: currentDraft.photos as any,
        functionalChecks: currentDraft.functionalChecks,
        submittedBy: user.id,
        deviceConfirmed: currentDraft.deviceConfirmed,
        declaration: {
          accepted: true,
          timestamp: new Date(),
        },
      });

      // Wait a bit to ensure persistence
      await new Promise(resolve => setTimeout(resolve, 200));

      showSuccess('Device Submitted', 'Your device evaluation has been submitted successfully');
      const successPath = basePath === '/check-in' ? `${basePath}/success` : `${basePath}/my-evaluations`;
      navigate(successPath);
    } catch (error) {
      handleError(error, 'Submitting device');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate step completion
  const isStep1Complete = currentDraft?.deviceConfirmed === true;
  // Photos are now optional - count for display only
  const uploadedPhotos = PHOTO_SLOTS.filter(
    s => currentDraft?.photos?.[s.key as keyof typeof currentDraft.photos]
  );
  const isStep2Complete = true; // Photos are optional, can always proceed
  // All condition fields must be filled for step 3 to be complete
  const isStep3Complete = (() => {
    const checks = currentDraft?.functionalChecks;
    if (!checks) return false;
    return (
      checks.powersOn !== undefined &&
      checks.batteryBackup !== undefined &&
      checks.screenCondition && checks.screenCondition.length > 0 &&
      checks.keyboardCondition !== undefined &&
      checks.trackpadCondition !== undefined &&
      checks.portsCondition !== undefined &&
      checks.hingeCondition !== undefined &&
      checks.bodyCondition !== undefined &&
      checks.chargerStatus !== undefined
    );
  })();

  const canProceed = () => {
    switch (currentStep) {
      case 1: return isStep1Complete;
      case 2: return isStep2Complete;
      case 3: return isStep3Complete;
      default: return true;
    }
  };

  if (assetLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ecotribe-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Loading device...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-slate-500 dark:text-white/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Device Not Found</h2>
          <p className="text-slate-500 dark:text-white/50 mb-6">This device may have been removed or reassigned.</p>
          <button
            onClick={() => navigate(-1)}
            className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 -m-4 md:-m-6 lg:-m-8">
      {/* Hidden camera input - camera only, no file upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-ecotribe-dark/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10">
        <div className="px-4 py-3">
          <button
            onClick={() => {
              if (window.confirm('Are you sure? Your progress will be saved.')) {
                navigate(-1);
              }
            }}
            className="flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Save & Exit</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-ecotribe-primary/20 border border-ecotribe-primary/30 flex items-center justify-center flex-shrink-0">
              <Laptop className="w-6 h-6 text-ecotribe-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                {asset.brand} {asset.model}
              </h1>
              <p className="text-xs text-slate-500 dark:text-white/50 font-mono">S/N: {asset.serial_number}</p>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-1">
            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className="flex-1 flex items-center">
                  <div
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      isCompleted ? 'bg-ecotribe-primary' :
                      isCurrent ? 'bg-ecotribe-primary/50' :
                      'bg-slate-200 dark:bg-white/10'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isCompleted ? 'text-ecotribe-primary' :
                    isCurrent ? 'text-slate-900 dark:text-white' :
                    'text-slate-500 dark:text-white/50'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                  <span className="text-[10px] mt-1 font-medium">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-6"
        >
          {/* Step 1: Device Confirmation */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Confirm Your Device</h2>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  Please verify that the device details below match the laptop you're submitting.
                </p>
              </div>

              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-ecotribe-primary/20 flex items-center justify-center">
                    <Laptop className="w-8 h-8 text-ecotribe-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
                    <p className="text-sm text-slate-500 dark:text-white/50">{asset.category}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">Serial Number</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-white mt-1">{asset.serial_number}</p>
                  </div>
                  {asset.asset_tag && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">Asset Tag</p>
                      <p className="text-sm font-mono text-slate-900 dark:text-white mt-1">{asset.asset_tag}</p>
                    </div>
                  )}
                  {asset.processor && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">Processor</p>
                      <p className="text-sm text-slate-900 dark:text-white mt-1">{asset.processor}</p>
                    </div>
                  )}
                  {asset.ram && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider">RAM</p>
                      <p className="text-sm text-slate-900 dark:text-white mt-1">{asset.ram}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Is this your device?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeviceConfirmed(true)}
                    className={`interactive p-4 border-2 transition-all flex flex-col items-center gap-2 ${
                      currentDraft?.deviceConfirmed === true
                        ? 'border-ecotribe-primary bg-ecotribe-primary/20 text-ecotribe-primary'
                        : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <CheckCircle className="w-8 h-8" />
                    <span className="font-bold text-sm">Yes, this is mine</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeviceConfirmed(false);
                      alert('Please contact your IT administrator if this device was incorrectly assigned to you.');
                    }}
                    className={`interactive p-4 border-2 transition-all flex flex-col items-center gap-2 ${
                      currentDraft?.deviceConfirmed === false
                        ? 'border-red-400 bg-red-400/20 text-red-400'
                        : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <X className="w-8 h-8" />
                    <span className="font-bold text-sm">No, wrong device</span>
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Make sure you have the laptop with you before proceeding. You'll need to take photos and answer questions about its condition.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Photo Capture */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Take Device Photos</h2>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  Photos help us evaluate your device faster. This step is optional but recommended.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PHOTO_SLOTS.map((slot) => {
                  const photoKey = slot.key as string;
                  const hasPhoto = currentDraft?.photos?.[photoKey as keyof typeof currentDraft.photos];

                  return (
                    <div
                      key={slot.key}
                      onClick={() => handlePhotoCapture(slot.key)}
                      className={`interactive relative aspect-square border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                        hasPhoto
                          ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-white/[0.02]'
                      }`}
                    >
                      {hasPhoto ? (
                        <>
                          <img
                            src={Array.isArray(hasPhoto) ? hasPhoto[0] : hasPhoto}
                            alt={slot.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-ecotribe-primary" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePhotos({ [slot.key]: undefined });
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-500"
                          >
                            <X className="w-4 h-4 text-white dark:text-white" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-slate-300 dark:text-white/20" />
                          <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">{slot.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-white/50 text-center px-2 mt-1">{slot.description}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-sm text-slate-500 dark:text-white/50">
                {uploadedPhotos.length} of {PHOTO_SLOTS.length} photos uploaded (optional)
              </div>
            </div>
          )}

          {/* Step 3: Functional Checks */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Device Condition</h2>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  Answer honestly about your device's condition for an accurate valuation.
                </p>
              </div>

              {/* Power On */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Does the laptop power on?</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateFunctionalChecks({ powersOn: true })}
                    className={`interactive py-3 font-medium transition-all ${
                      currentDraft?.functionalChecks?.powersOn === true
                        ? 'bg-ecotribe-primary text-black'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => updateFunctionalChecks({ powersOn: false })}
                    className={`interactive py-3 font-medium transition-all ${
                      currentDraft?.functionalChecks?.powersOn === false
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Battery */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Battery className="w-5 h-5 text-green-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Battery backup</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {batteryOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFunctionalChecks({ batteryBackup: opt.value })}
                      className={`interactive py-3 px-3 text-sm font-medium transition-all ${
                        currentDraft?.functionalChecks?.batteryBackup === opt.value
                          ? 'bg-ecotribe-primary text-black'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Monitor className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Screen issues (select all)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {screenConditionOptions.map((opt) => {
                    const isSelected = currentDraft?.functionalChecks?.screenCondition?.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const current = currentDraft?.functionalChecks?.screenCondition || [];
                          if (opt.value === 'none') {
                            updateFunctionalChecks({ screenCondition: ['none'] });
                          } else {
                            const filtered = current.filter(v => v !== 'none');
                            if (isSelected) {
                              updateFunctionalChecks({ screenCondition: filtered.filter(v => v !== opt.value) });
                            } else {
                              updateFunctionalChecks({ screenCondition: [...filtered, opt.value] });
                            }
                          }
                        }}
                        className={`interactive py-2 px-4 text-sm font-medium transition-all ${
                          isSelected
                            ? opt.value === 'none' ? 'bg-ecotribe-primary text-black' : 'bg-amber-500 text-black'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keyboard */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Keyboard className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Keyboard</span>
                </div>
                <div className="space-y-2">
                  {keyboardConditionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFunctionalChecks({ keyboardCondition: opt.value })}
                      className={`interactive w-full py-3 px-4 text-sm font-medium text-left transition-all ${
                        currentDraft?.functionalChecks?.keyboardCondition === opt.value
                          ? 'bg-ecotribe-primary text-black'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trackpad */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MousePointer2 className="w-5 h-5 text-cyan-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Trackpad</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {trackpadConditionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFunctionalChecks({ trackpadCondition: opt.value })}
                      className={`interactive py-3 text-sm font-medium transition-all ${
                        currentDraft?.functionalChecks?.trackpadCondition === opt.value
                          ? 'bg-ecotribe-primary text-black'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ports */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Usb className="w-5 h-5 text-orange-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Ports</span>
                </div>
                <div className="space-y-2">
                  {portsConditionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFunctionalChecks({ portsCondition: opt.value })}
                      className={`interactive w-full py-3 px-4 text-sm font-medium text-left transition-all ${
                        currentDraft?.functionalChecks?.portsCondition === opt.value
                          ? 'bg-ecotribe-primary text-black'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hinges */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Box className="w-5 h-5 text-pink-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Hinges</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {hingeConditionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFunctionalChecks({ hingeCondition: opt.value })}
                      className={`interactive py-3 text-sm font-medium transition-all ${
                        currentDraft?.functionalChecks?.hingeCondition === opt.value
                          ? 'bg-ecotribe-primary text-black'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Condition */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Box className="w-5 h-5 text-amber-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Body condition (select all)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bodyConditionOptions.map((opt) => {
                    const isSelected = currentDraft?.functionalChecks?.bodyCondition?.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const current = currentDraft?.functionalChecks?.bodyCondition || [];
                          if (opt.value === 'none') {
                            updateFunctionalChecks({ bodyCondition: ['none'] });
                          } else {
                            const filtered = current.filter(v => v !== 'none');
                            if (isSelected) {
                              updateFunctionalChecks({ bodyCondition: filtered.filter(v => v !== opt.value) });
                            } else {
                              updateFunctionalChecks({ bodyCondition: [...filtered, opt.value] });
                            }
                          }
                        }}
                        className={`interactive py-2 px-4 text-sm font-medium transition-all ${
                          isSelected
                            ? opt.value === 'none' ? 'bg-ecotribe-primary text-black' : 'bg-amber-500 text-black'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Charger */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-lime-400" />
                  <span className="font-medium text-slate-900 dark:text-white">Charger</span>
                </div>
                <div className="space-y-2">
                  {chargerStatusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFunctionalChecks({ chargerStatus: opt.value })}
                      className={`interactive w-full py-3 px-4 text-sm font-medium text-left transition-all ${
                        currentDraft?.functionalChecks?.chargerStatus === opt.value
                          ? 'bg-ecotribe-primary text-black'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Review & Submit</h2>
                <p className="text-sm text-slate-500 dark:text-white/50">
                  Please review your submission before submitting.
                </p>
              </div>

              {/* Device */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <h3 className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3">Device</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-ecotribe-primary/20 flex items-center justify-center">
                    <Laptop className="w-7 h-7 text-ecotribe-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{asset.brand} {asset.model}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50 font-mono">S/N: {asset.serial_number}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-ecotribe-primary" />
                </div>
              </div>

              {/* Photos Summary */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <h3 className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3">Photos</h3>
                {uploadedPhotos.length > 0 ? (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {PHOTO_SLOTS.slice(0, 6).map((slot) => {
                        const photoKey = slot.key as string;
                        const photo = currentDraft?.photos?.[photoKey as keyof typeof currentDraft.photos];
                        return (
                          <div
                            key={slot.key}
                            className={`w-12 h-12 flex-shrink-0 border flex items-center justify-center ${
                              photo
                                ? 'border-ecotribe-primary bg-ecotribe-primary/10'
                                : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5'
                            }`}
                          >
                            {photo ? (
                              <img src={Array.isArray(photo) ? photo[0] : photo} alt={slot.label} className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-5 h-5 text-slate-500 dark:text-white/50" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-2">
                      {uploadedPhotos.length} photos uploaded
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-white/50">No photos uploaded (optional)</p>
                )}
              </div>

              {/* Condition Summary */}
              <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4">
                <h3 className="text-xs text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3">Condition</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-white/50">Powers On:</span>
                    <span className={`ml-2 ${currentDraft?.functionalChecks?.powersOn ? 'text-ecotribe-primary' : 'text-red-400'}`}>
                      {currentDraft?.functionalChecks?.powersOn ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-white/50">Battery:</span>
                    <span className="ml-2 text-slate-900 dark:text-white">
                      {batteryOptions.find(o => o.value === currentDraft?.functionalChecks?.batteryBackup)?.label || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-white/50">Keyboard:</span>
                    <span className="ml-2 text-slate-900 dark:text-white">
                      {keyboardConditionOptions.find(o => o.value === currentDraft?.functionalChecks?.keyboardCondition)?.label || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-white/50">Charger:</span>
                    <span className="ml-2 text-slate-900 dark:text-white">
                      {chargerStatusOptions.find(o => o.value === currentDraft?.functionalChecks?.chargerStatus)?.label || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-ecotribe-primary/10 border border-ecotribe-primary/20 p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-ecotribe-primary flex-shrink-0" />
                <p className="text-sm text-ecotribe-primary">
                  By clicking "Submit Device", you confirm that all information provided is accurate.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-ecotribe-dark/95 backdrop-blur-sm border-t border-slate-200 dark:border-white/10 p-4 flex gap-3 z-50">
        {currentStep > 1 && (
          <button
            onClick={handleBack}
            className="interactive flex-1 py-3.5 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {currentStep < STEPS.length ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`interactive flex-1 py-3.5 font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              canProceed()
                ? 'bg-ecotribe-primary text-black hover:bg-white'
                : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 cursor-not-allowed'
            }`}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="interactive flex-1 py-3.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Device
          </button>
        )}
      </div>
    </div>
  );
}

export default DeviceSubmit;
