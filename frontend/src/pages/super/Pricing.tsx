import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, Search, ArrowLeft, Plus, Edit2, Save, X, Trash2 } from 'lucide-react';
import { Input, Button, Card, Badge, PageHeader } from '@/components/ui';
import { text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';
import { usePricingConfigApi, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule } from '@/hooks/usePricingRules';
import type { PricingRule } from '@/lib/api/pricing';

// Grade labels for display
const GRADE_LABELS: Record<string, string> = {
  'A+': 'Excellent',
  'A': 'Very Good',
  'B': 'Good',
  'C': 'Fair',
  'D': 'Poor',
};

const GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D'];

const DEFAULT_GRADE_MODIFIERS: Record<string, number> = {
  'A+': 1.0,
  'A': 0.85,
  'B': 0.70,
  'C': 0.50,
  'D': 0.30,
};

export function Pricing() {
  const navigate = useNavigate();

  // Data fetching
  const { data: config, isLoading, isError } = usePricingConfigApi();
  const createMutation = useCreatePricingRule();
  const updateMutation = useUpdatePricingRule();
  const deleteMutation = useDeletePricingRule();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, { base_price: number; grade_modifiers: Record<string, number> }>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRuleBasePrice, setNewRuleBasePrice] = useState('');
  const [newRuleBrand, setNewRuleBrand] = useState('');

  const rules = config?.pricing_rules ?? [];
  const categories = config?.categories ?? [];

  // Filter rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const uniqueCategories = new Set(rules.map(r => r.category));
  const gradeCount = rules.length > 0
    ? Object.keys(rules[0].grade_modifiers || {}).length
    : 5;
  const avgBasePrice = rules.length > 0
    ? rules.reduce((sum, r) => sum + r.base_price, 0) / rules.length
    : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  // Handlers
  const handleAddRule = async () => {
    if (!newRuleName.trim() || !newRuleCategory.trim() || !newRuleBasePrice.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: newRuleName.trim(),
        category: newRuleCategory.trim().toLowerCase(),
        base_price: parseFloat(newRuleBasePrice) || 0,
        brand: newRuleBrand.trim() || undefined,
        grade_modifiers: { ...DEFAULT_GRADE_MODIFIERS },
        age_min: 0,
        priority: 0,
        is_active: true,
      });
      setNewRuleName('');
      setNewRuleCategory('');
      setNewRuleBasePrice('');
      setNewRuleBrand('');
      setShowAddForm(false);
    } catch {
      // Error is handled by mutation state
    }
  };

  const startEditing = (rule: PricingRule) => {
    setEditedData(prev => ({
      ...prev,
      [rule.id]: {
        base_price: rule.base_price,
        grade_modifiers: { ...(rule.grade_modifiers || DEFAULT_GRADE_MODIFIERS) },
      },
    }));
    setEditingRule(rule.id);
  };

  const cancelEditing = () => {
    if (editingRule) {
      setEditedData(prev => {
        const next = { ...prev };
        delete next[editingRule];
        return next;
      });
    }
    setEditingRule(null);
  };

  const saveEditing = async (ruleId: string) => {
    const edited = editedData[ruleId];
    if (!edited) return;
    try {
      await updateMutation.mutateAsync({
        id: ruleId,
        data: {
          base_price: edited.base_price,
          grade_modifiers: edited.grade_modifiers,
        },
      });
      setEditingRule(null);
      setEditedData(prev => {
        const next = { ...prev };
        delete next[ruleId];
        return next;
      });
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await deleteMutation.mutateAsync(ruleId);
    } catch {
      // Error is handled by mutation state
    }
  };

  const updateGradeModifier = (ruleId: string, grade: string, value: string) => {
    setEditedData(prev => {
      const rule = prev[ruleId];
      if (!rule) return prev;
      return {
        ...prev,
        [ruleId]: {
          ...rule,
          grade_modifiers: {
            ...rule.grade_modifiers,
            [grade]: parseFloat(value) / 100 || 0,
          },
        },
      };
    });
  };

  const updateBasePrice = (ruleId: string, value: string) => {
    setEditedData(prev => {
      const rule = prev[ruleId];
      if (!rule) return prev;
      return { ...prev, [ruleId]: { ...rule, base_price: parseFloat(value) || 0 } };
    });
  };

  // Get ordered grades for a rule
  const getOrderedGrades = (gradeModifiers: Record<string, number>) => {
    return GRADE_ORDER
      .filter(g => g in gradeModifiers)
      .map(g => ({ grade: g, multiplier: gradeModifiers[g] }));
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
              onClick={() => setShowAddForm(true)}
            >
              Add Pricing Rule
            </Button>
          </div>
        }
      />

      {/* Loading State */}
      {isLoading && (
        <Card className="p-12 text-center">
          <p className={`font-mono text-sm ${text.muted}`}>Loading pricing configuration...</p>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Card className="p-12 text-center">
          <p className="font-mono text-sm text-red-500">Failed to load pricing configuration. Please try again.</p>
        </Card>
      )}

      {!isLoading && !isError && (
        <>
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card className="p-4">
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Pricing Rules</p>
              <p className={`font-brand text-2xl font-bold ${text.primary} mt-1`}>{rules.length}</p>
            </Card>
            <Card className="p-4">
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Categories</p>
              <p className={`font-brand text-2xl font-bold text-blue-500 mt-1`}>{uniqueCategories.size}</p>
            </Card>
            <Card className="p-4">
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Grading Levels</p>
              <p className={`font-brand text-2xl font-bold text-emerald-500 mt-1`}>{gradeCount}</p>
            </Card>
            <Card className="p-4">
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Avg Base Price</p>
              <p className={`font-brand text-2xl font-bold text-amber-500 mt-1`}>
                {formatCurrency(avgBasePrice)}
              </p>
            </Card>
          </motion.div>

          {/* Add Rule Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <h3 className={`font-brand font-bold text-sm uppercase ${text.primary} mb-4`}>Add New Pricing Rule</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Rule name (e.g. Dell Laptop 0-2yr)"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    label="Rule Name"
                    required
                  />
                  <Input
                    placeholder="Category (e.g. laptop)"
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    label="Category"
                    required
                  />
                  <Input
                    placeholder="Base price (₹)"
                    type="number"
                    value={newRuleBasePrice}
                    onChange={(e) => setNewRuleBasePrice(e.target.value)}
                    label="Base Price (₹)"
                    required
                  />
                  <Input
                    placeholder="Brand (optional)"
                    value={newRuleBrand}
                    onChange={(e) => setNewRuleBrand(e.target.value)}
                    label="Brand"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="primary"
                    onClick={handleAddRule}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Rule'}
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setShowAddForm(false);
                    setNewRuleName('');
                    setNewRuleCategory('');
                    setNewRuleBasePrice('');
                    setNewRuleBrand('');
                  }}>
                    Cancel
                  </Button>
                </div>
                {createMutation.isError && (
                  <p className="font-mono text-xs text-red-500 mt-2">
                    {createMutation.error?.message || 'Failed to create rule'}
                  </p>
                )}
              </Card>
            </motion.div>
          )}

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
                    placeholder="Search pricing rules..."
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

          {/* Pricing Rule Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {filteredRules.map((rule, index) => {
              const isEditing = editingRule === rule.id;
              const gradeModifiers = isEditing
                ? (editedData[rule.id]?.grade_modifiers ?? rule.grade_modifiers ?? DEFAULT_GRADE_MODIFIERS)
                : (rule.grade_modifiers ?? DEFAULT_GRADE_MODIFIERS);
              const basePrice = isEditing
                ? (editedData[rule.id]?.base_price ?? rule.base_price)
                : rule.base_price;
              const orderedGrades = getOrderedGrades(gradeModifiers);

              return (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Card>
                    {/* Rule Header */}
                    <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center">
                            <IndianRupee className={`${iconSize.lg} text-lime-700 dark:text-lime-400`} />
                          </div>
                          <div>
                            <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>{rule.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="info" size="sm">{rule.category}</Badge>
                              {rule.brand && <Badge variant="default" size="sm">{rule.brand}</Badge>}
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono text-xs ${text.muted}`}>Base Price: ₹</span>
                                  <input
                                    type="number"
                                    value={basePrice}
                                    onChange={(e) => updateBasePrice(rule.id, e.target.value)}
                                    className="w-28 px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:border-lime-500"
                                  />
                                </div>
                              ) : (
                                <p className={`font-mono text-xs ${text.muted}`}>
                                  Base Price: {formatCurrency(rule.base_price)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isEditing && (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<Save className={iconSize.xs} />}
                              onClick={() => saveEditing(rule.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={isEditing ? <X className={iconSize.xs} /> : <Edit2 className={iconSize.xs} />}
                            onClick={() => isEditing ? cancelEditing() : startEditing(rule)}
                          >
                            {isEditing ? 'Cancel' : 'Edit'}
                          </Button>
                          {!isEditing && (
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Trash2 className={iconSize.xs} />}
                              onClick={() => handleDelete(rule.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                      {updateMutation.isError && isEditing && (
                        <p className="font-mono text-xs text-red-500 mt-2">
                          {updateMutation.error?.message || 'Failed to update rule'}
                        </p>
                      )}
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                          {orderedGrades.map(({ grade, multiplier }) => (
                            <tr key={grade} className={hoverStyles.row}>
                              <td className="px-6 py-4">
                                <Badge
                                  variant={
                                    grade === 'A+' ? 'success' :
                                    grade === 'A' ? 'info' :
                                    grade === 'B' ? 'warning' :
                                    'default'
                                  }
                                  size="sm"
                                >
                                  {grade}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                                  {GRADE_LABELS[grade] || grade}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={Math.round(multiplier * 100)}
                                    onChange={(e) => updateGradeModifier(rule.id, grade, e.target.value)}
                                    min={0}
                                    max={100}
                                    className="w-20 px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-sm focus:outline-none focus:border-lime-500"
                                  />
                                ) : (
                                  <p className={`font-mono text-sm ${text.primary}`}>
                                    {(multiplier * 100).toFixed(0)}%
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <p className={`font-mono text-sm font-bold text-lime-600 dark:text-lime-400`}>
                                  {formatCurrency(basePrice * multiplier)}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredRules.length === 0 && (
            <Card className="p-12 text-center">
              <p className={`font-mono text-sm ${text.muted}`}>No pricing rules found</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
