import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, Search, ArrowLeft, Plus, Edit2, Save, X } from 'lucide-react';
import { Input, Button, Card, Badge, PageHeader } from '@/components/ui';
import { glass, text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface DeviceType {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  grades: {
    grade: string;
    condition: string;
    priceMultiplier: number;
    description: string;
  }[];
}

export function Pricing() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingDevice, setEditingDevice] = useState<string | null>(null);

  // Mock device types with grading
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([
    {
      id: 'dt-001',
      name: 'Laptop',
      category: 'Computing',
      basePrice: 25000,
      grades: [
        { grade: 'A+', condition: 'Excellent', priceMultiplier: 1.0, description: 'Like new, no signs of wear' },
        { grade: 'A', condition: 'Very Good', priceMultiplier: 0.85, description: 'Minor cosmetic wear' },
        { grade: 'B', condition: 'Good', priceMultiplier: 0.70, description: 'Moderate wear, fully functional' },
        { grade: 'C', condition: 'Fair', priceMultiplier: 0.50, description: 'Significant wear, functional' },
        { grade: 'D', condition: 'Poor', priceMultiplier: 0.30, description: 'Heavy wear, parts only' },
      ],
    },
    {
      id: 'dt-002',
      name: 'Desktop',
      category: 'Computing',
      basePrice: 20000,
      grades: [
        { grade: 'A+', condition: 'Excellent', priceMultiplier: 1.0, description: 'Like new, no signs of wear' },
        { grade: 'A', condition: 'Very Good', priceMultiplier: 0.85, description: 'Minor cosmetic wear' },
        { grade: 'B', condition: 'Good', priceMultiplier: 0.70, description: 'Moderate wear, fully functional' },
        { grade: 'C', condition: 'Fair', priceMultiplier: 0.50, description: 'Significant wear, functional' },
        { grade: 'D', condition: 'Poor', priceMultiplier: 0.30, description: 'Heavy wear, parts only' },
      ],
    },
    {
      id: 'dt-003',
      name: 'Tablet',
      category: 'Mobile',
      basePrice: 15000,
      grades: [
        { grade: 'A+', condition: 'Excellent', priceMultiplier: 1.0, description: 'Like new, no signs of wear' },
        { grade: 'A', condition: 'Very Good', priceMultiplier: 0.85, description: 'Minor cosmetic wear' },
        { grade: 'B', condition: 'Good', priceMultiplier: 0.70, description: 'Moderate wear, fully functional' },
        { grade: 'C', condition: 'Fair', priceMultiplier: 0.50, description: 'Significant wear, functional' },
        { grade: 'D', condition: 'Poor', priceMultiplier: 0.30, description: 'Heavy wear, parts only' },
      ],
    },
  ]);

  const filteredDeviceTypes = deviceTypes.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || device.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(deviceTypes.map(d => d.category)));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="Device Pricing & Grading"
        subtitle="Configure base prices and grading multipliers"
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/super')}
              leftIcon={<ArrowLeft className={iconSize.sm} />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className={iconSize.sm} />}
            >
              Add Device Type
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Device Types</p>
          <p className={`font-brand text-2xl font-bold ${text.primary} mt-1`}>{deviceTypes.length}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Categories</p>
          <p className={`font-brand text-2xl font-bold text-blue-500 mt-1`}>{categories.length}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Grading Levels</p>
          <p className={`font-brand text-2xl font-bold text-emerald-500 mt-1`}>5</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Avg Base Price</p>
          <p className={`font-brand text-2xl font-bold text-amber-500 mt-1`}>
            {formatCurrency(deviceTypes.reduce((sum, d) => sum + d.basePrice, 0) / deviceTypes.length)}
          </p>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search device types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className={iconSize.sm} />}
              />
            </div>
            <div className="w-full md:w-64">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Device Types Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {filteredDeviceTypes.map((device, index) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <Card>
              {/* Device Header */}
              <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center">
                      <IndianRupee className={`${iconSize.lg} text-lime-700 dark:text-lime-400`} />
                    </div>
                    <div>
                      <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>{device.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="info" size="sm">{device.category}</Badge>
                        <p className={`font-mono text-xs ${text.muted}`}>
                          Base Price: {formatCurrency(device.basePrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit2 className={iconSize.xs} />}
                    onClick={() => setEditingDevice(editingDevice === device.id ? null : device.id)}
                  >
                    {editingDevice === device.id ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
              </div>

              {/* Grading Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-zinc-800">
                      <th className={`px-6 py-3 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                        Grade
                      </th>
                      <th className={`px-6 py-3 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                        Condition
                      </th>
                      <th className={`px-6 py-3 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                        Multiplier
                      </th>
                      <th className={`px-6 py-3 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                        Price
                      </th>
                      <th className={`px-6 py-3 text-left font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                    {device.grades.map((grade, gradeIndex) => (
                      <tr key={gradeIndex} className={hoverStyles.row}>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              grade.grade === 'A+' ? 'success' :
                              grade.grade === 'A' ? 'info' :
                              grade.grade === 'B' ? 'warning' :
                              'default'
                            }
                            size="sm"
                          >
                            {grade.grade}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                            {grade.condition}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-mono text-sm ${text.primary}`}>
                            {(grade.priceMultiplier * 100).toFixed(0)}%
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-mono text-sm font-bold text-lime-600 dark:text-lime-400`}>
                            {formatCurrency(device.basePrice * grade.priceMultiplier)}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-mono text-xs ${text.muted}`}>
                            {grade.description}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredDeviceTypes.length === 0 && (
        <Card className="p-12 text-center">
          <p className={`font-mono text-sm ${text.muted}`}>No device types found</p>
        </Card>
      )}
    </div>
  );
}
