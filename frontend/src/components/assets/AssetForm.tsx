import { useState } from 'react';
import { motion } from 'framer-motion';
import { Laptop, Save, X, ChevronDown, Cpu, Monitor, UserCheck, User } from 'lucide-react';
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Dropdown, EmployeeSelector } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { CreateAssetInput } from '@/hooks/useAssets';
import type { AssetSpecs } from '@/types';

interface AssetFormProps {
  enterpriseId: string;
  batchId?: string;
  branchId?: string;    // V3.2: Branch assignment
  itAdminId?: string;   // V3.2: IT Admin who created the asset
  userId?: string;      // V3.2: Current user ID for self-assignment
  onSubmit: (data: CreateAssetInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  showSelfAssign?: boolean;  // V3.2: Show self-assign option
}

const BRANDS = ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'Microsoft', 'Other'];

const COMMON_MODELS: Record<string, string[]> = {
  Dell: ['XPS 13', 'XPS 15', 'Latitude 5420', 'Latitude 5520', 'Latitude 7420', 'Precision 5560', 'Inspiron 15'],
  HP: ['EliteBook 840', 'EliteBook 850', 'ProBook 450', 'ProBook 640', 'ZBook 15', 'Pavilion 15'],
  Lenovo: ['ThinkPad T14', 'ThinkPad T15', 'ThinkPad X1 Carbon', 'ThinkPad E14', 'IdeaPad 5', 'Legion 5'],
  ASUS: ['ZenBook 14', 'ZenBook 15', 'VivoBook 15', 'ROG Zephyrus', 'ExpertBook'],
  Acer: ['Aspire 5', 'Swift 3', 'Spin 5', 'Nitro 5', 'TravelMate P6'],
  Apple: ['MacBook Air M1', 'MacBook Air M2', 'MacBook Pro 13', 'MacBook Pro 14', 'MacBook Pro 16'],
  Microsoft: ['Surface Laptop 4', 'Surface Laptop 5', 'Surface Pro 8', 'Surface Pro 9'],
  Other: [],
};

const PROCESSOR_BRANDS = ['Intel', 'AMD', 'Apple Silicon', 'Qualcomm', 'Other'];

const PROCESSOR_SERIES: Record<string, string[]> = {
  Intel: ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Celeron', 'Pentium', 'Xeon'],
  AMD: ['Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Athlon', 'A-Series'],
  'Apple Silicon': ['M1', 'M1 Pro', 'M1 Max', 'M2', 'M2 Pro', 'M2 Max', 'M3', 'M3 Pro', 'M3 Max'],
  Qualcomm: ['Snapdragon 7c', 'Snapdragon 8cx', 'Snapdragon X Elite'],
  Other: [],
};

const GPU_BRANDS = ['Integrated', 'NVIDIA', 'AMD', 'Intel Arc', 'Other'];

const GPU_MODELS: Record<string, string[]> = {
  Integrated: ['Intel UHD Graphics', 'Intel Iris Xe', 'AMD Radeon Graphics', 'Apple GPU'],
  NVIDIA: ['GeForce GTX 1650', 'GeForce GTX 1660', 'GeForce RTX 3050', 'GeForce RTX 3060', 'GeForce RTX 3070', 'GeForce RTX 3080', 'GeForce RTX 4050', 'GeForce RTX 4060', 'GeForce RTX 4070', 'GeForce RTX 4080', 'GeForce RTX 4090', 'Quadro'],
  AMD: ['Radeon RX 6500', 'Radeon RX 6600', 'Radeon RX 6700', 'Radeon RX 7600', 'Radeon RX 7700', 'Radeon RX 7800', 'Radeon RX 7900'],
  'Intel Arc': ['Arc A370M', 'Arc A550M', 'Arc A730M', 'Arc A770M'],
  Other: [],
};

export function AssetForm({ enterpriseId, batchId, branchId, itAdminId, userId, onSubmit, onCancel, isLoading, showSelfAssign = false }: AssetFormProps) {
  const [selfAssign, setSelfAssign] = useState(false);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    serialNumber: '',
    brand: '',
    model: '',
    customModel: '',
    processorBrand: '',
    processorSeries: '',
    processorDetail: '',
    ram: '',
    customRam: '',
    storage: '',
    customStorage: '',
    screenSize: '',
    customScreenSize: '',
    os: '',
    customOs: '',
    gpuBrand: '',
    gpuModel: '',
    customGpu: '',
    purchaseDate: '',
  });

  // Track which fields are using custom input
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [useCustomRam, setUseCustomRam] = useState(false);
  const [useCustomStorage, setUseCustomStorage] = useState(false);
  const [useCustomScreenSize, setUseCustomScreenSize] = useState(false);
  const [useCustomOs, setUseCustomOs] = useState(false);
  const [useCustomProcessor, setUseCustomProcessor] = useState(false);
  const [useCustomGpu, setUseCustomGpu] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.serialNumber.trim()) {
      newErrors.serialNumber = 'Serial number is required';
    } else if (formData.serialNumber.length < 5) {
      newErrors.serialNumber = 'Serial number must be at least 5 characters';
    }

    if (!formData.brand) {
      newErrors.brand = 'Brand is required';
    }

    const modelValue = useCustomModel ? formData.customModel : formData.model;
    if (!modelValue.trim()) {
      newErrors.model = 'Model is required';
    }

    // FIX: Validate purchase date is not in the future
    if (formData.purchaseDate) {
      const purchaseDate = new Date(formData.purchaseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (purchaseDate > today) {
        newErrors.purchaseDate = 'Purchase date cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build processor string from parts
  const getProcessorString = (): string => {
    if (useCustomProcessor) return formData.processorDetail;
    const parts = [formData.processorBrand, formData.processorSeries, formData.processorDetail].filter(Boolean);
    return parts.join(' ');
  };

  // Build GPU string from parts
  const getGpuString = (): string => {
    if (useCustomGpu) return formData.customGpu;
    if (formData.gpuBrand === 'Integrated') return formData.gpuModel || 'Integrated';
    const parts = [formData.gpuBrand, formData.gpuModel].filter(Boolean);
    return parts.join(' ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const processor = getProcessorString();
    const gpu = getGpuString();
    const ram = useCustomRam ? formData.customRam : formData.ram;
    const storage = useCustomStorage ? formData.customStorage : formData.storage;
    const screenSize = useCustomScreenSize ? formData.customScreenSize : formData.screenSize;
    const os = useCustomOs ? formData.customOs : formData.os;
    const model = useCustomModel ? formData.customModel : formData.model;

    const specs: AssetSpecs & { gpu?: string } = {};
    if (processor) specs.processor = processor;
    if (ram) specs.ram = ram;
    if (storage) specs.storage = storage;
    if (screenSize) specs.screenSize = screenSize;
    if (os) specs.os = os;
    if (gpu) specs.gpu = gpu;

    // V3: Use snake_case for database fields
    // V3.2: Include branch_id and it_admin_id for proper branch association
    const input: CreateAssetInput = {
      enterprise_id: enterpriseId,
      batch_id: batchId,
      branch_id: branchId,
      it_admin_id: itAdminId,
      serial_number: formData.serialNumber.trim().toUpperCase(),
      brand: formData.brand,
      model: model.trim(),
      // FIX: Actually save specs to the asset!
      specs: Object.keys(specs).length > 0 ? specs : undefined,
      // FIX: Save purchase date if provided
      purchase_date: formData.purchaseDate || undefined,
      // V3.2: Self-assignment fields
      ...(selfAssign && userId && {
        assigned_user_id: userId,
        is_self_assigned: true,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      }),
      // V3.3: Employee assignment (not self-assign)
      ...(!selfAssign && assignedEmployeeId && {
        assigned_sub_user_id: assignedEmployeeId,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
      }),
    };

    await onSubmit(input);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const suggestedModels = formData.brand ? COMMON_MODELS[formData.brand] || [] : [];
  const processorSeriesOptions = formData.processorBrand ? PROCESSOR_SERIES[formData.processorBrand] || [] : [];
  const gpuModelOptions = formData.gpuBrand ? GPU_MODELS[formData.gpuBrand] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-ecotribe-primary" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Serial Number */}
          <Input
            label="Serial Number"
            placeholder="e.g., DELL-XPS15-A1B2C3"
            value={formData.serialNumber}
            onChange={(e) => handleChange('serialNumber', e.target.value)}
            error={errors.serialNumber}
            required
            className="uppercase"
          />

          {/* Brand & Model Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Brand <span className="text-red-400">*</span>
              </label>
              <Dropdown
                options={BRANDS.map(b => ({ label: b, value: b }))}
                value={formData.brand}
                onChange={(value) => {
                  handleChange('brand', value);
                  handleChange('model', '');
                  handleChange('customModel', '');
                  setUseCustomModel(value === 'Other');
                }}
                placeholder="Select brand"
                error={errors.brand}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Model <span className="text-red-400">*</span>
              </label>
              {!useCustomModel && suggestedModels.length > 0 ? (
                <Dropdown
                  options={[
                    ...suggestedModels.map(m => ({ label: m, value: m })),
                    { label: 'Other (enter custom)', value: '__custom__' }
                  ]}
                  value={formData.model}
                  onChange={(value) => {
                    if (value === '__custom__') {
                      setUseCustomModel(true);
                      handleChange('model', '');
                    } else {
                      handleChange('model', value);
                    }
                  }}
                  placeholder="Select model"
                  error={errors.model}
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter model name"
                    value={formData.customModel}
                    onChange={(e) => handleChange('customModel', e.target.value)}
                    error={errors.model}
                  />
                  {suggestedModels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomModel(false);
                        handleChange('customModel', '');
                      }}
                      className="text-xs text-ecotribe-primary hover:underline"
                    >
                      Back to suggested models
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-ecotribe-primary" />
            Employee Assignment
            <span className="text-xs font-normal text-white/40 ml-2">(Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Self-Assign Option */}
          {showSelfAssign && userId && (
            <label className="flex items-center gap-3 cursor-pointer group p-3 border border-white/10 hover:border-white/20 transition-colors">
              <div className={cn(
                "w-5 h-5 border-2 flex items-center justify-center transition-all",
                selfAssign
                  ? "bg-ecotribe-primary border-ecotribe-primary"
                  : "border-white/30 group-hover:border-white/50"
              )}>
                {selfAssign && <UserCheck className="w-3 h-3 text-black" />}
              </div>
              <input
                type="checkbox"
                checked={selfAssign}
                onChange={(e) => {
                  setSelfAssign(e.target.checked);
                  if (e.target.checked) {
                    setAssignedEmployeeId(null); // Clear employee selection when self-assigning
                  }
                }}
                className="sr-only"
              />
              <div>
                <span className="text-sm font-medium text-white">Assign to myself</span>
                <p className="text-xs text-white/50">This asset will appear in your "My Evaluations" section</p>
              </div>
            </label>
          )}

          {/* Employee Selection (when not self-assigning) */}
          {!selfAssign && (
            <div className="space-y-2">
              <p className="text-xs text-white/50 mb-3">
                Assign this asset to an employee for evaluation. They will receive an email with evaluation instructions.
              </p>
              <EmployeeSelector
                enterpriseId={enterpriseId}
                branchId={branchId}
                value={assignedEmployeeId}
                onChange={(id) => setAssignedEmployeeId(id)}
                placeholder="Select or add an employee..."
                showAddNew={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processor & GPU Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white/70">
            <Cpu className="w-4 h-4 text-ecotribe-primary" />
            Processor & Graphics
            <span className="text-xs font-normal text-white/40 ml-2">(Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Processor */}
          <div>
            <h4 className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              Processor
            </h4>
            {!useCustomProcessor ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">Processor Brand</label>
                    <Dropdown
                      options={[
                        ...PROCESSOR_BRANDS.map(b => ({ label: b, value: b })),
                      ]}
                      value={formData.processorBrand}
                      onChange={(value) => {
                        handleChange('processorBrand', value);
                        handleChange('processorSeries', '');
                        if (value === 'Other') {
                          setUseCustomProcessor(true);
                        }
                      }}
                      placeholder="Select processor brand"
                    />
                  </div>
                  {formData.processorBrand && formData.processorBrand !== 'Other' && processorSeriesOptions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">Series</label>
                      <Dropdown
                        options={processorSeriesOptions.map(s => ({ label: s, value: s }))}
                        value={formData.processorSeries}
                        onChange={(value) => handleChange('processorSeries', value)}
                        placeholder="Select series"
                      />
                    </div>
                  )}
                </div>
                {formData.processorBrand && (
                  <div className="mt-4">
                    <Input
                      label="Additional Details (Generation, Speed, etc.)"
                      placeholder="e.g., 12700H, 4.7GHz, 12th Gen"
                      value={formData.processorDetail}
                      onChange={(e) => handleChange('processorDetail', e.target.value)}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <Input
                  label="Processor (Full Specification)"
                  placeholder="e.g., Intel Core i7-12700H 4.7GHz"
                  value={formData.processorDetail}
                  onChange={(e) => handleChange('processorDetail', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomProcessor(false);
                    handleChange('processorBrand', '');
                    handleChange('processorSeries', '');
                    handleChange('processorDetail', '');
                  }}
                  className="text-xs text-ecotribe-primary hover:underline"
                >
                  Use guided selection
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* GPU */}
          <div>
            <h4 className="font-mono text-xs text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Monitor className="w-3 h-3" />
              Graphics (GPU)
            </h4>
            {!useCustomGpu ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">GPU Type</label>
                    <Dropdown
                      options={GPU_BRANDS.map(b => ({ label: b, value: b }))}
                      value={formData.gpuBrand}
                      onChange={(value) => {
                        handleChange('gpuBrand', value);
                        handleChange('gpuModel', '');
                        if (value === 'Other') {
                          setUseCustomGpu(true);
                        }
                      }}
                      placeholder="Select GPU type"
                    />
                  </div>
                  {formData.gpuBrand && formData.gpuBrand !== 'Other' && gpuModelOptions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1.5">GPU Model</label>
                      <Dropdown
                        options={[
                          ...gpuModelOptions.map(m => ({ label: m, value: m })),
                          { label: 'Other', value: '__custom__' },
                        ]}
                        value={formData.gpuModel}
                        onChange={(value) => {
                          if (value === '__custom__') {
                            setUseCustomGpu(true);
                            handleChange('gpuModel', '');
                          } else {
                            handleChange('gpuModel', value);
                          }
                        }}
                        placeholder="Select model"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Input
                  label="GPU (Full Specification)"
                  placeholder="e.g., NVIDIA GeForce RTX 4070 8GB"
                  value={formData.customGpu}
                  onChange={(e) => handleChange('customGpu', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomGpu(false);
                    handleChange('gpuBrand', '');
                    handleChange('gpuModel', '');
                    handleChange('customGpu', '');
                  }}
                  className="text-xs text-ecotribe-primary hover:underline"
                >
                  Use guided selection
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Specifications (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white/70">
            Specifications
            <span className="text-xs font-normal text-white/40 ml-2">(Optional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* RAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">RAM</label>
              {!useCustomRam ? (
                <div className="space-y-2">
                  <Dropdown
                    options={[
                      { label: '4GB', value: '4GB' },
                      { label: '8GB', value: '8GB' },
                      { label: '16GB', value: '16GB' },
                      { label: '32GB', value: '32GB' },
                      { label: '64GB', value: '64GB' },
                      { label: 'Other', value: '__custom__' },
                    ]}
                    value={formData.ram}
                    onChange={(value) => {
                      if (value === '__custom__') {
                        setUseCustomRam(true);
                        handleChange('ram', '');
                      } else {
                        handleChange('ram', value);
                      }
                    }}
                    placeholder="Select RAM"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., 24GB DDR5"
                    value={formData.customRam}
                    onChange={(e) => handleChange('customRam', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomRam(false);
                      handleChange('customRam', '');
                    }}
                    className="text-xs text-ecotribe-primary hover:underline"
                  >
                    Select from list
                  </button>
                </div>
              )}
            </div>

            {/* Storage */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Storage</label>
              {!useCustomStorage ? (
                <Dropdown
                  options={[
                    { label: '128GB SSD', value: '128GB SSD' },
                    { label: '256GB SSD', value: '256GB SSD' },
                    { label: '512GB SSD', value: '512GB SSD' },
                    { label: '1TB SSD', value: '1TB SSD' },
                    { label: '2TB SSD', value: '2TB SSD' },
                    { label: '500GB HDD', value: '500GB HDD' },
                    { label: '1TB HDD', value: '1TB HDD' },
                    { label: 'Other', value: '__custom__' },
                  ]}
                  value={formData.storage}
                  onChange={(value) => {
                    if (value === '__custom__') {
                      setUseCustomStorage(true);
                      handleChange('storage', '');
                    } else {
                      handleChange('storage', value);
                    }
                  }}
                  placeholder="Select storage"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., 2TB NVMe SSD"
                    value={formData.customStorage}
                    onChange={(e) => handleChange('customStorage', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomStorage(false);
                      handleChange('customStorage', '');
                    }}
                    className="text-xs text-ecotribe-primary hover:underline"
                  >
                    Select from list
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Screen Size & OS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Screen Size</label>
              {!useCustomScreenSize ? (
                <Dropdown
                  options={[
                    { label: '11.6"', value: '11.6"' },
                    { label: '13.3"', value: '13.3"' },
                    { label: '14"', value: '14"' },
                    { label: '15.6"', value: '15.6"' },
                    { label: '16"', value: '16"' },
                    { label: '17.3"', value: '17.3"' },
                    { label: 'Other', value: '__custom__' },
                  ]}
                  value={formData.screenSize}
                  onChange={(value) => {
                    if (value === '__custom__') {
                      setUseCustomScreenSize(true);
                      handleChange('screenSize', '');
                    } else {
                      handleChange('screenSize', value);
                    }
                  }}
                  placeholder="Select size"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., 15.3 inch OLED"
                    value={formData.customScreenSize}
                    onChange={(e) => handleChange('customScreenSize', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomScreenSize(false);
                      handleChange('customScreenSize', '');
                    }}
                    className="text-xs text-ecotribe-primary hover:underline"
                  >
                    Select from list
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Operating System</label>
              {!useCustomOs ? (
                <Dropdown
                  options={[
                    { label: 'Windows 11 Pro', value: 'Windows 11 Pro' },
                    { label: 'Windows 11 Home', value: 'Windows 11 Home' },
                    { label: 'Windows 10 Pro', value: 'Windows 10 Pro' },
                    { label: 'Windows 10 Home', value: 'Windows 10 Home' },
                    { label: 'macOS Sonoma', value: 'macOS Sonoma' },
                    { label: 'macOS Ventura', value: 'macOS Ventura' },
                    { label: 'Ubuntu', value: 'Ubuntu' },
                    { label: 'Chrome OS', value: 'Chrome OS' },
                    { label: 'Other', value: '__custom__' },
                  ]}
                  value={formData.os}
                  onChange={(value) => {
                    if (value === '__custom__') {
                      setUseCustomOs(true);
                      handleChange('os', '');
                    } else {
                      handleChange('os', value);
                    }
                  }}
                  placeholder="Select OS"
                />
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., Fedora 39"
                    value={formData.customOs}
                    onChange={(e) => handleChange('customOs', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomOs(false);
                      handleChange('customOs', '');
                    }}
                    className="text-xs text-ecotribe-primary hover:underline"
                  >
                    Select from list
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Date */}
          <Input
            label="Purchase Date"
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleChange('purchaseDate', e.target.value)}
            error={errors.purchaseDate}
            max={new Date().toISOString().split('T')[0]}  // Prevent selecting future dates
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          <Save className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>
    </form>
  );
}

export default AssetForm;
