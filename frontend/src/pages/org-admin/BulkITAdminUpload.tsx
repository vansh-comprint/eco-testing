/**
 * Bulk IT Admin Upload Page - Org Admin Portal
 * V3.2: Upload multiple IT Admins via CSV with branch assignment
 * Branches are assigned by updating branch.it_admin_id after IT admin creation
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Info,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Mail,
  ArrowRight,
  Building2,
  Key,
} from 'lucide-react';
import { useAuth, useBranches, useBulkCreateITAdmins, useUpdateBranch } from '@/hooks';

interface ParsedRow {
  name: string;
  email: string;
  phone?: string;
  password: string; // Auto-generated
  branch_name?: string;
  branch_id?: string; // Resolved from branch_name
  errors: string[];
  warnings: string[];
}

const REQUIRED_COLUMNS = ['email'];
const OPTIONAL_COLUMNS = ['name', 'phone', 'branch_name'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const COLUMN_ALIASES: Record<string, string> = {
  'email_address': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'user_email': 'email',
  'full_name': 'name',
  'full name': 'name',
  'admin_name': 'name',
  'admin name': 'name',
  'phone_number': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'branch': 'branch_name',
  'branch_code': 'branch_name',
  'branchname': 'branch_name',
  'branch name': 'branch_name',
};

// Generate a secure random password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function BulkITAdminUpload() {
  const navigate = useNavigate();
  // V3.2: Use React Query hook for auth
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const { data: branches = [] } = useBranches(enterpriseId);
  const bulkCreate = useBulkCreateITAdmins();
  const updateBranch = useUpdateBranch();

  // Filter to branches without IT admin (available for assignment)
  const availableBranches = (branches as any[]).filter(b => !b.it_admin_id);
  const allBranches = branches as any[];

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ results: any[]; errors: Array<{ email: string; error: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = parsedData.filter(row => row.errors.length === 0);
  const invalidRows = parsedData.filter(row => row.errors.length > 0);
  const warningRows = parsedData.filter(row => row.warnings.length > 0);
  const rowsWithBranch = validRows.filter(row => row.branch_id);

  // Get branch by name or code (flexible matching)
  const getBranchByNameOrCode = (input: string) => {
    const normalized = input?.toLowerCase().trim();
    if (!normalized) return null;
    return branches.find((b: any) =>
      b.branch_name?.toLowerCase() === normalized ||
      b.branch_code?.toLowerCase() === normalized ||
      b.branch_name?.toLowerCase().includes(normalized) ||
      normalized.includes(b.branch_code?.toLowerCase())
    );
  };

  const normalizeColumnName = (name: string): string => {
    const normalized = name.toLowerCase().trim();
    return COLUMN_ALIASES[normalized] || normalized;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const parseCSV = useCallback((content: string): void => {
    setUploadStatus('parsing');

    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      setUploadStatus('error');
      return;
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const mapping: Record<string, number> = {};

    headers.forEach((header, index) => {
      const normalized = normalizeColumnName(header);
      if (ALL_COLUMNS.includes(normalized)) {
        mapping[normalized] = index;
      }
    });

    setColumnMapping(
      Object.fromEntries(
        Object.entries(mapping).map(([key, idx]) => [key, headers[idx]])
      )
    );

    // Parse data rows
    const rows: ParsedRow[] = [];
    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: ParsedRow = {
        name: '',
        email: '',
        password: generatePassword(), // Auto-generate password
        errors: [],
        warnings: [],
      };

      // Map values to fields
      Object.entries(mapping).forEach(([field, index]) => {
        const value = values[index]?.trim() || '';
        if (field in row || OPTIONAL_COLUMNS.includes(field)) {
          (row as Record<string, unknown>)[field] = value;
        }
      });

      // Validate row
      if (!row.email) {
        row.errors.push('Email is required');
      } else if (!isValidEmail(row.email)) {
        row.errors.push('Invalid email format');
      } else if (seenEmails.has(row.email.toLowerCase())) {
        row.errors.push('Duplicate email in file');
      } else {
        seenEmails.add(row.email.toLowerCase());
      }

      // Warnings for optional fields
      if (!row.name) {
        row.warnings.push('Name not provided - email will be used as display name');
      }

      // Resolve branch from branch_name (accepts name or code)
      if (row.branch_name) {
        const branch = getBranchByNameOrCode(row.branch_name);
        if (branch) {
          row.branch_id = branch.id;
        } else {
          row.warnings.push(`Branch "${row.branch_name}" not found - will be unassigned`);
        }
      }

      rows.push(row);
    }

    setParsedData(rows);
    setUploadStatus('ready');
  }, [branches]);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  const handleFile = async (selectedFile: File) => {
    const isCSV = selectedFile.name.endsWith('.csv');
    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setFile(selectedFile);

    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        parseCSV(content);
      };
      reader.readAsText(selectedFile);
    } else {
      // Parse Excel file
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await selectedFile.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        alert('No worksheet found in Excel file');
        return;
      }

      // Helper to extract text from ExcelJS cell (handles rich text, hyperlinks, etc.)
      const getCellText = (cell: any): string => {
        // First try to get the text property directly from the cell
        // This works for hyperlinks where cell.text contains the display text
        if (cell.text && typeof cell.text === 'string') {
          return cell.text;
        }

        // Get the cell value
        const cellValue = cell.value;

        if (cellValue === null || cellValue === undefined) return '';
        if (typeof cellValue === 'string') return cellValue;
        if (typeof cellValue === 'number') return cellValue.toString();
        if (typeof cellValue === 'boolean') return cellValue.toString();

        // Handle rich text (array of text runs)
        if (cellValue.richText && Array.isArray(cellValue.richText)) {
          return cellValue.richText.map((r: any) => r.text || '').join('');
        }

        // Handle hyperlink objects - ExcelJS stores them as { text: "...", hyperlink: "..." }
        if (typeof cellValue === 'object') {
          if (cellValue.text) return cellValue.text;
          if (cellValue.hyperlink) return cellValue.hyperlink;
          // Handle formula results
          if (cellValue.result !== undefined) {
            if (typeof cellValue.result === 'string') return cellValue.result;
            if (typeof cellValue.result === 'number') return cellValue.result.toString();
          }
        }

        // Fallback - try to stringify but avoid [object Object]
        return '';
      };

      // Get the expected column count - use 4 for our template (name, email, phone, branch_name)
      const columnCount = 4;

      // Convert to CSV-like format for parsing
      // Handle Excel sparse arrays properly by accessing cells by column index
      const lines: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        const rowData: string[] = [];
        // Access cells by column index (1-indexed in Excel)
        for (let col = 1; col <= columnCount; col++) {
          const cell = row.getCell(col);
          rowData.push(getCellText(cell));
        }

        // Skip completely empty rows (except header row)
        if (rowNumber === 1 || rowData.some(cell => cell.trim() !== '')) {
          // Escape commas in cell values for CSV parsing
          const csvRow = rowData.map(val =>
            val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val
          ).join(',');
          lines.push(csvRow);
        }
      });

      parseCSV(lines.join('\n'));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (validRows.length === 0) return;

    setUploadStatus('uploading');
    try {
      // V3.2: Create IT admins first (without branch_id - that's the old schema)
      const admins = validRows.map(row => ({
        enterprise_id: enterpriseId,
        email: row.email.toLowerCase(),
        name: row.name || row.email.split('@')[0],
        phone: row.phone || undefined,
        password: row.password, // Auto-generated (for Supabase Auth requirement)
      }));

      const result = await bulkCreate.mutateAsync(admins);

      // V3.2: After creating IT admins, assign them to branches
      // by updating branch.it_admin_id
      const branchAssignments: Array<{ branchId: string; adminId: string; adminEmail: string }> = [];

      for (const row of validRows) {
        if (row.branch_id) {
          // Find the created admin by email
          const createdAdmin = result.results.find(
            (r: any) => r.email?.toLowerCase() === row.email.toLowerCase()
          );
          if (createdAdmin) {
            branchAssignments.push({
              branchId: row.branch_id,
              adminId: createdAdmin.id,
              adminEmail: row.email,
            });
          }
        }
      }

      // Assign branches to IT admins
      const branchErrors: Array<{ email: string; error: string }> = [];
      for (const assignment of branchAssignments) {
        try {
          await updateBranch.mutateAsync({
            branchId: assignment.branchId,
            updates: { it_admin_id: assignment.adminId },
          });
        } catch (e) {
          branchErrors.push({
            email: assignment.adminEmail,
            error: `Failed to assign branch: ${e instanceof Error ? e.message : 'Unknown error'}`,
          });
        }
      }

      // Combine errors
      const allErrors = [...result.errors, ...branchErrors];

      setUploadResult({ results: result.results, errors: allErrors });
      setUploadStatus('success');
    } catch {
      setUploadStatus('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setColumnMapping({});
    setUploadStatus('idle');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    // Use exceljs to create Excel file with dropdown for branches
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('IT Admins');

    // Get branch names for dropdown (include empty option)
    const branchNames = ['', ...allBranches.map((b: any) => b.branch_name)];
    const branch1 = allBranches[0]?.branch_name || '';
    const branch2 = allBranches[1]?.branch_name || '';

    // Add headers
    worksheet.columns = [
      { header: 'name', key: 'name', width: 25 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'phone', key: 'phone', width: 18 },
      { header: 'branch_name', key: 'branch_name', width: 25 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };

    // Add example rows (delete these before uploading)
    worksheet.addRow({ name: 'Vikram Singh', email: 'vikram@company.com', phone: '+91 98765 11111', branch_name: branch1 });
    worksheet.addRow({ name: 'Priya Sharma', email: 'priya@company.com', phone: '+91 98765 22222', branch_name: branch2 });
    worksheet.addRow({ name: 'Amit Patel (no branch)', email: 'amit@company.com', phone: '', branch_name: '' });

    // Apply data validation (dropdown) to branch_name column for rows 2-50
    // Users can add more rows as needed
    if (branchNames.length > 1) { // Only if there are branches
      for (let row = 2; row <= 50; row++) {
        worksheet.getCell(`D${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${branchNames.join(',')}"`],
          showDropDown: true,
          errorTitle: 'Invalid Branch',
          error: 'Please select a branch from the dropdown list',
        };
      }
    }

    // Add a "Branches" reference sheet
    const branchSheet = workbook.addWorksheet('Available Branches');
    branchSheet.columns = [
      { header: 'Branch Name', key: 'name', width: 30 },
      { header: 'Branch Code', key: 'code', width: 15 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    branchSheet.getRow(1).font = { bold: true };

    allBranches.forEach((b: any) => {
      branchSheet.addRow({
        name: b.branch_name,
        code: b.branch_code,
        city: b.city,
        status: b.it_admin_id ? 'Has IT Admin' : 'Available',
      });
    });

    // Create Instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 50 },
      { width: 40 }
    ];

    // Title
    instructionsSheet.mergeCells('A1:D1');
    instructionsSheet.getCell('A1').value = 'IT ADMIN BULK UPLOAD TEMPLATE - INSTRUCTIONS';
    instructionsSheet.getCell('A1').font = { bold: true, size: 14 };
    instructionsSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };

    // Headers for instruction table
    instructionsSheet.getRow(3).values = ['Column Name', 'Required?', 'Description', 'Example Values'];
    instructionsSheet.getRow(3).font = { bold: true };
    instructionsSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' }
    };

    // Column instructions
    const columnInstructions = [
      ['name', 'No', 'Full name of the IT Admin. If blank, email prefix will be used.', 'Vikram Singh, Priya Sharma'],
      ['email', 'YES', 'Valid email address. Must be unique across the system.', 'vikram@company.com'],
      ['phone', 'No', 'Contact phone number with country code', '+91 98765 11111'],
      ['branch_name', 'No', 'Branch to assign (use dropdown). Leave blank for no assignment.', 'Mumbai HQ, Bangalore Office']
    ];

    columnInstructions.forEach((row, index) => {
      const rowNum = index + 4;
      instructionsSheet.getRow(rowNum).values = row;
      // Highlight required fields
      if (row[1] === 'YES') {
        instructionsSheet.getCell(`B${rowNum}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' }
        };
        instructionsSheet.getCell(`B${rowNum}`).font = { bold: true, color: { argb: 'FFDC2626' } };
      }
    });

    // Add tips section
    const tipsStartRow = 10;
    instructionsSheet.mergeCells(`A${tipsStartRow}:D${tipsStartRow}`);
    instructionsSheet.getCell(`A${tipsStartRow}`).value = 'IMPORTANT NOTES';
    instructionsSheet.getCell(`A${tipsStartRow}`).font = { bold: true, size: 12 };
    instructionsSheet.getCell(`A${tipsStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }
    };

    const tips = [
      '1. Delete the example rows (rows 2-4) before uploading your data',
      '2. Email addresses must be unique - duplicates will fail',
      '3. Passwords are auto-generated and will be shown after upload',
      '4. IT Admins can reset their password using "Forgot Password"',
      '5. Use the branch_name dropdown to assign to a branch',
      '6. Check "Available Branches" sheet to see which branches need IT Admins',
      '7. Branches marked "Has IT Admin" cannot accept another assignment'
    ];

    tips.forEach((tip, index) => {
      instructionsSheet.mergeCells(`A${tipsStartRow + 1 + index}:D${tipsStartRow + 1 + index}`);
      instructionsSheet.getCell(`A${tipsStartRow + 1 + index}`).value = tip;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotribe-it-admins-template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!enterprise) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <p className="font-display text-slate-500 dark:text-zinc-500 uppercase tracking-wide">Enterprise not found</p>
      </div>
    );
  }

  // Success state
  if (uploadStatus === 'success' && uploadResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10"
        >
          <div className="py-16 px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 border border-emerald-400/30 bg-emerald-400/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>

            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase tracking-tight mb-3">
              IT Admins Created
            </h2>

            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="font-brand font-bold text-3xl text-ecotribe-primary">{uploadResult.results.length}</p>
                <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">Created</p>
              </div>
              {uploadResult.errors.length > 0 && (
                <div className="text-center">
                  <p className="font-brand font-bold text-3xl text-red-400">{uploadResult.errors.length}</p>
                  <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">Failed</p>
                </div>
              )}
            </div>

            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mb-8">
              IT Admins can now log in using their email address
            </p>

            {uploadResult.errors.length > 0 && (
              <div className="mb-6 text-left bg-red-500/5 border border-red-500/20 p-4 max-h-40 overflow-y-auto">
                <p className="font-mono font-bold text-[10px] text-red-400 uppercase tracking-widest mb-2">Failed Uploads:</p>
                {uploadResult.errors.map((err, i) => (
                  <p key={i} className="font-mono text-xs text-red-400">
                    {err.email}: {err.error}
                  </p>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="interactive px-6 py-3 bg-white/5 border border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload More
              </button>
              <button
                onClick={() => navigate('/org-admin/it-admins')}
                className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                View IT Admins
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="interactive flex items-center gap-2 text-slate-500 dark:text-zinc-500 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Bulk</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Import IT Admins
              </h1>
              <p className="font-display text-slate-500 dark:text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                Upload multiple IT Admins via CSV
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-blue-400/20 bg-blue-400/5 p-5"
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-2">Upload Tips</p>
            <ul className="font-mono text-xs text-slate-500 dark:text-zinc-500 space-y-1">
              <li>- <strong>Download the Excel template</strong> - it has a branch dropdown!</li>
              <li>- Required column: email</li>
              <li>- Optional: name, phone, branch_name</li>
              <li>- Select branch from dropdown (leave empty for no assignment)</li>
              <li>- IT Admins will be able to log in with their email</li>
              <li>- Supports both .xlsx and .csv files</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Upload Area */}
      {uploadStatus === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10">
            <div className="p-8">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-12 text-center transition-all ${
                  dragActive
                    ? 'border-ecotribe-primary bg-ecotribe-primary/5'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                  id="csv-it-admin-upload"
                />

                <div className={`w-16 h-16 border flex items-center justify-center mx-auto mb-6 ${
                  dragActive ? 'border-ecotribe-primary/30 bg-ecotribe-primary/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                }`}>
                  <Users className={`w-8 h-8 ${dragActive ? 'text-ecotribe-primary' : 'text-slate-400 dark:text-zinc-600'}`} />
                </div>

                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide mb-2">
                  {dragActive ? 'Drop your file here' : 'Upload IT Admins'}
                </h3>
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 mb-6">
                  Drag and drop your CSV or Excel file, or click to browse
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <label htmlFor="csv-it-admin-upload" className="cursor-pointer">
                    <span className="interactive inline-flex items-center gap-2 px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all">
                      <FileSpreadsheet className="w-4 h-4" />
                      Select File
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="interactive px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Excel Template
                  </button>
                </div>
              </div>

              {/* Column Info */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-red-500/10 bg-red-500/5">
                  <p className="font-mono font-bold text-[10px] text-red-400 uppercase tracking-widest mb-2">Required Columns</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-mono">email</span>
                  </div>
                </div>
                <div className="p-4 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                  <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Optional Columns</p>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONAL_COLUMNS.map(col => (
                      <span key={col} className="px-2 py-1 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-500 dark:text-zinc-500 text-xs font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Available Branches */}
              {branches.length > 0 && (
                <div className="mt-4 p-4 border border-blue-500/10 bg-blue-500/5">
                  <p className="font-mono font-bold text-[10px] text-blue-400 uppercase tracking-widest mb-2">Available Branches (use name or code)</p>
                  <div className="flex flex-wrap gap-2">
                    {branches.map((branch: any) => (
                      <span key={branch.id} className="px-2 py-1 border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-mono">
                        {branch.branch_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Parsing Status */}
      {uploadStatus === 'parsing' && (
        <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 py-16 text-center">
          <div className="w-12 h-12 border-2 border-ecotribe-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Parsing CSV file...</p>
        </div>
      )}

      {/* Preview & Validation */}
      {(uploadStatus === 'ready' || uploadStatus === 'uploading') && file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* File Info */}
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{file.name}</p>
                  <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">
                    {(file.size / 1024).toFixed(1)} KB - {parsedData.length} rows
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="interactive p-2.5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
              >
                <Trash2 className="w-4 h-4 text-slate-500 dark:text-zinc-600 hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10">
            <div className="p-5 border-b border-black/10 dark:border-white/10">
              <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Validation Summary</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 border-l border-t border-slate-200 dark:border-white/10">
              <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-emerald-500/5">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="font-brand font-bold text-2xl text-emerald-400">{validRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">Valid</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${invalidRows.length > 0 ? 'bg-red-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-4 h-4 ${invalidRows.length > 0 ? 'text-red-400' : 'text-slate-500 dark:text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${invalidRows.length > 0 ? 'text-red-400' : 'text-slate-500 dark:text-zinc-600'}`}>{invalidRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">Errors</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${warningRows.length > 0 ? 'bg-amber-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-4 h-4 ${warningRows.length > 0 ? 'text-amber-400' : 'text-slate-500 dark:text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${warningRows.length > 0 ? 'text-amber-400' : 'text-slate-500 dark:text-zinc-600'}`}>{warningRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">Warnings</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${rowsWithBranch.length > 0 ? 'bg-blue-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Building2 className={`w-4 h-4 ${rowsWithBranch.length > 0 ? 'text-blue-400' : 'text-slate-500 dark:text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${rowsWithBranch.length > 0 ? 'text-blue-400' : 'text-slate-500 dark:text-zinc-600'}`}>{rowsWithBranch.length}</p>
                <p className="font-mono font-bold text-[9px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest">With Branch</p>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10">
            <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Data Preview</h2>
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="interactive p-2 hover:bg-white/5 transition-colors"
              >
                {showPreview ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-600" />}
              </button>
            </div>
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Name</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Email</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Branch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 10).map((row, index) => (
                          <tr
                            key={index}
                            className={`border-b border-slate-200 dark:border-white/5 ${row.errors.length > 0 ? 'bg-red-500/5' : ''}`}
                          >
                            <td className="py-3 px-5">
                              {row.errors.length > 0 ? (
                                <span className="px-2 py-0.5 border border-red-500/20 bg-red-500/10 text-red-400 text-[10px] font-mono uppercase">Error</span>
                              ) : row.warnings.length > 0 ? (
                                <span className="px-2 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px] font-mono uppercase">Warning</span>
                              ) : (
                                <span className="px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase">Valid</span>
                              )}
                            </td>
                            <td className="py-3 px-5 font-display text-sm text-slate-900 dark:text-white">
                              {row.name || <span className="text-slate-400 dark:text-zinc-600">-</span>}
                            </td>
                            <td className="py-3 px-5 font-mono text-xs text-slate-400 dark:text-zinc-400">
                              {row.email || '-'}
                            </td>
                            <td className="py-3 px-5">
                              {row.branch_id ? (
                                <span className="px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase">
                                  {row.branch_name}
                                </span>
                              ) : row.branch_name ? (
                                <span className="px-2 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px] font-mono uppercase" title="Branch not found">
                                  {row.branch_name} ⚠️
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-slate-500 dark:text-zinc-700">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 10 && (
                    <p className="p-4 text-center font-mono text-xs text-slate-500 dark:text-zinc-600">
                      Showing 10 of {parsedData.length} rows
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error Details */}
          {invalidRows.length > 0 && (
            <div className="border border-red-500/20 bg-red-500/5">
              <div className="p-5 border-b border-red-500/10 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="font-display font-bold text-sm text-red-400 uppercase tracking-wide">Errors ({invalidRows.length})</h2>
              </div>
              <div className="p-5 space-y-3 max-h-48 overflow-y-auto">
                {invalidRows.slice(0, 5).map((row, index) => (
                  <div key={index} className="p-3 border border-red-500/10 bg-red-500/5">
                    <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      Row: {row.email || '(empty email)'}
                    </p>
                    <ul className="font-mono text-xs text-red-400 space-y-1">
                      {row.errors.map((error, i) => (
                        <li key={i}>- {error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {invalidRows.length > 5 && (
                  <p className="text-center font-mono text-xs text-slate-500 dark:text-zinc-600">
                    And {invalidRows.length - 5} more errors...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => navigate('/org-admin/it-admins')}
              disabled={uploadStatus === 'uploading'}
              className="interactive px-6 py-3 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white font-mono font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={validRows.length === 0 || uploadStatus === 'uploading'}
              className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {uploadStatus === 'uploading' ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              Create {validRows.length} IT Admins
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default BulkITAdminUpload;
