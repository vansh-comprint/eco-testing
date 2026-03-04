import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subUsersApi, usersApi } from '@/lib/api';
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Users,
  Mail,
  Building,
  ArrowRight
} from 'lucide-react';
import type { CreateSubUserInput } from '@/types';

interface BranchOption {
  id: string;
  branch_code: string;
  branch_name: string;
}

export interface BulkUserResult {
  created_count: number;
  error_count: number;
  errors: string[];
  created?: Array<{ id: string; email: string }>;
}

interface CSVUserUploadProps {
  enterpriseId: string;
  branchId?: string; // Pre-selected branch for all users; overridden per-row by branch column
  branches?: BranchOption[]; // Available branches for branch resolution
  onUpload: (users: CreateSubUserInput[]) => Promise<BulkUserResult | void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isOrgAdmin?: boolean; // Whether to show branch requirement notes
}

interface ParsedRow {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  branch?: string;
  errors: string[];
  warnings: string[];
}

const REQUIRED_COLUMNS = ['email'];
const OPTIONAL_COLUMNS = ['name', 'phone', 'department', 'branch'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const COLUMN_ALIASES: Record<string, string> = {
  'email_address': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'user_email': 'email',
  'user email': 'email',
  'employee_email': 'email',
  'employee email': 'email',
  'work_email': 'email',
  'work email': 'email',
  'full_name': 'name',
  'full name': 'name',
  'user_name': 'name',
  'user name': 'name',
  'employee_name': 'name',
  'employee name': 'name',
  'first_name': 'name',
  'first name': 'name',
  'phone_number': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'mobile_number': 'phone',
  'mobile number': 'phone',
  'contact': 'phone',
  'contact_number': 'phone',
  'dept': 'department',
  'team': 'department',
  'division': 'department',
  'unit': 'department',
  'branch_code': 'branch',
  'branch code': 'branch',
  'branch_name': 'branch',
  'office': 'branch',
};

const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'HR',
  'Finance',
  'Operations',
  'Sales',
  'IT',
  'Other',
];

export function CSVUserUpload({ enterpriseId, branchId, branches = [], onUpload, onCancel, isLoading, isOrgAdmin }: CSVUserUploadProps) {
  // Resolve the pre-selected branch code for template pre-fill
  const selectedBranch = branchId ? branches.find(b => b.id === branchId) : null;
  const selectedBranchCode = selectedBranch?.branch_code || '';
  // Branch is always required — either pre-selected or per-row
  const branchRequiredPerRow = !branchId && branches.length > 0;
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'success' | 'partial' | 'error'>('idle');
  const [serverResult, setServerResult] = useState<BulkUserResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validatingEmails, setValidatingEmails] = useState(false);
  const [missingColumnsError, setMissingColumnsError] = useState<string | null>(null);

  const validRows = parsedData.filter(row => row.errors.length === 0);
  const invalidRows = parsedData.filter(row => row.errors.length > 0);
  const warningRows = parsedData.filter(row => row.warnings.length > 0);
  const uniqueDepartments = new Set(parsedData.filter(row => row.department).map(row => row.department));

  // Re-parse file when branches load after initial parse (fixes stale validation state)
  const prevBranchCountRef = useRef(branches.length);
  useEffect(() => {
    if (file && uploadStatus === 'ready' && branches.length > 0 && prevBranchCountRef.current === 0) {
      handleFile(file);
    }
    prevBranchCountRef.current = branches.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length]);

  const normalizeColumnName = (name: string): string => {
    const normalized = name.toLowerCase().trim();
    return COLUMN_ALIASES[normalized] || normalized;
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const digitsOnly = phone.replace(/\D/g, '');
    // Accept 10 digits (local) or 12 digits (with 91 country code)
    // The sanitizer in handleUpload will normalize to last 10 digits
    return digitsOnly.length === 10 || (digitsOnly.length === 12 && digitsOnly.startsWith('91'));
  };

  // Check which emails already exist in the system via API
  // Uses usersApi (no role filter) to catch ALL users — IT admins, org admins, employees, etc.
  const validateEmailsOnServer = async (emails: string[]): Promise<Set<string>> => {
    const existing = new Set<string>();
    try {
      // Fetch ALL existing users for this enterprise (no role filter, no branch filter)
      // This catches IT admins, org admins, employees — not just employees
      const response = await usersApi.list({
        enterprise_id: enterpriseId,
        limit: 100,
      });
      if (response.data) {
        const serverEmails = new Set(
          response.data.map((u: { email?: string }) => u.email?.toLowerCase()).filter(Boolean)
        );
        for (const email of emails) {
          if (serverEmails.has(email.toLowerCase())) {
            existing.add(email.toLowerCase());
          }
        }
      }

      // Individual lookups for remaining emails not found in the bulk check
      const unchecked = emails.filter(e => !existing.has(e.toLowerCase()));
      for (const email of unchecked.slice(0, 20)) {
        try {
          const resp = await usersApi.list({ search: email, enterprise_id: enterpriseId, limit: 1 });
          if (resp.data) {
            for (const user of resp.data) {
              if (user.email?.toLowerCase() === email.toLowerCase()) {
                existing.add(email.toLowerCase());
                break;
              }
            }
          }
        } catch {
          // Individual lookup failed — skip this email, server will catch it during creation
        }
      }
    } catch (err) {
      console.warn('Email validation failed — duplicates may not be detected until upload:', err);
    }
    return existing;
  };

  const parseCSV = useCallback(async (content: string): Promise<void> => {
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

    // Check for required columns — show user-visible error if missing
    const missingRequired = REQUIRED_COLUMNS.filter(col => !(col in mapping));
    if (missingRequired.length > 0) {
      setMissingColumnsError(
        `Required column "${missingRequired.join('", "')}" not found in file. Please use the template or ensure your file has an "email" column.`
      );
    } else {
      setMissingColumnsError(null);
    }

    // Parse data rows
    const rows: ParsedRow[] = [];
    const seenEmails = new Set<string>();
    const emailsToCheck: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      // Skip completely blank rows (empty or just commas)
      const hasAnyValue = values.some(v => v.trim() !== '');
      if (!hasAnyValue) continue;

      const row: ParsedRow = {
        name: '',
        email: '',
        errors: [],
        warnings: [],
      };

      // Map values to fields
      Object.entries(mapping).forEach(([field, index]) => {
        const value = values[index]?.trim() || '';
        if (field in row || OPTIONAL_COLUMNS.includes(field)) {
          (row as unknown as Record<string, unknown>)[field] = value;
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
        emailsToCheck.push(row.email);
      }

      // Validate phone if provided
      if (row.phone && !isValidPhone(row.phone)) {
        row.errors.push('Invalid phone number (must be 10 digits)');
      }

      // Validate branch is always provided and matches a known branch
      if (branchRequiredPerRow && !row.branch) {
        row.errors.push('Branch is required — use the template dropdown or enter a valid branch code');
      } else if (row.branch && branches.length > 0) {
        const matchedBranch = branches.find(
          b => b.branch_code.toLowerCase() === row.branch!.toLowerCase()
            || b.branch_name.toLowerCase() === row.branch!.toLowerCase()
        );
        if (!matchedBranch) {
          row.errors.push(`Unknown branch "${row.branch}" — must match a valid branch code`);
        }
      }

      // Warnings for optional fields
      if (!row.name) {
        row.warnings.push('Name not provided - email will be used as display name');
      }

      if (!row.department) {
        row.warnings.push('Department not specified');
      } else if (!DEPARTMENTS.includes(row.department)) {
        row.warnings.push(`Unknown department: ${row.department}`);
      }

      rows.push(row);
    }

    // Server-side email validation — check which emails already exist
    if (emailsToCheck.length > 0) {
      setValidatingEmails(true);
      const existingEmails = await validateEmailsOnServer(emailsToCheck);
      for (const row of rows) {
        if (row.email && existingEmails.has(row.email.toLowerCase())) {
          row.errors.push('Email already exists in the system');
        }
      }
      setValidatingEmails(false);
    }

    setParsedData(rows);
    setUploadStatus('ready');
  }, [branchRequiredPerRow, branches, enterpriseId]);

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

      // Helper to extract text from ExcelJS cell
      const getCellText = (cell: any): string => {
        if (cell.text && typeof cell.text === 'string') return cell.text;
        const cellValue = cell.value;
        if (cellValue === null || cellValue === undefined) return '';
        if (typeof cellValue === 'string') return cellValue;
        if (typeof cellValue === 'number') return cellValue.toString();
        if (typeof cellValue === 'boolean') return cellValue.toString();
        if (cellValue.richText && Array.isArray(cellValue.richText)) {
          return cellValue.richText.map((r: any) => r.text || '').join('');
        }
        if (typeof cellValue === 'object') {
          if (cellValue.text) return cellValue.text;
          if (cellValue.hyperlink) return cellValue.hyperlink;
          if (cellValue.result !== undefined) {
            if (typeof cellValue.result === 'string') return cellValue.result;
            if (typeof cellValue.result === 'number') return cellValue.result.toString();
          }
        }
        return '';
      };

      // Convert to CSV-like format for existing parseCSV function
      const lines: string[] = [];
      const columnCount = 5; // name, email, phone, department, branch

      worksheet.eachRow((row, rowNumber) => {
        const rowData: string[] = [];
        for (let col = 1; col <= columnCount; col++) {
          const cell = row.getCell(col);
          rowData.push(getCellText(cell));
        }

        // Skip completely empty rows (except header)
        if (rowNumber === 1 || rowData.some(cell => cell.trim() !== '')) {
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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (validRows.length === 0) return;

    // Guard: branches must be loaded before upload
    if (!branchId && branches.length === 0) {
      setErrorMessage('Branch data is still loading. Please wait a moment and try again.');
      return;
    }

    setUploadStatus('uploading');
    setErrorMessage(null);
    try {
      const unmatchedBranches: string[] = [];
      const noBranchRows: number[] = [];
      const users: CreateSubUserInput[] = validRows.map((row, idx) => {
        // Resolve branch_id: row's branch takes priority over prop fallback
        let resolvedBranchId = branchId;
        if (row.branch && branches.length > 0) {
          const matched = branches.find(
            b => b.branch_code.toLowerCase() === row.branch!.toLowerCase()
              || b.branch_name.toLowerCase() === row.branch!.toLowerCase()
          );
          if (matched) {
            resolvedBranchId = matched.id;
          } else {
            if (!unmatchedBranches.includes(row.branch)) {
              unmatchedBranches.push(row.branch);
            }
          }
        }
        if (!resolvedBranchId) {
          noBranchRows.push(idx + 1);
        }
        return {
          enterprise_id: enterpriseId,
          branch_id: resolvedBranchId || undefined,
          email: row.email.toLowerCase(),
          name: row.name || row.email.split('@')[0], // Fallback to email prefix
          phone: row.phone ? row.phone.replace(/\D/g, '').slice(-10) : undefined,
          department: row.department || undefined,
        };
      });

      // Block upload if any rows have unmatched or missing branches
      if (unmatchedBranches.length > 0) {
        setUploadStatus('ready');
        setErrorMessage(`Invalid branch codes: ${unmatchedBranches.join(', ')}. Please use valid branch codes from the template dropdown.`);
        return;
      }
      if (noBranchRows.length > 0) {
        setUploadStatus('ready');
        setErrorMessage(`Rows ${noBranchRows.slice(0, 5).join(', ')}${noBranchRows.length > 5 ? '...' : ''} have no branch assigned. Every employee must have a branch.`);
        return;
      }

      const result = await onUpload(users);

      if (result && result.error_count > 0) {
        // Partial success or full failure from API
        setServerResult(result);
        if (result.created_count > 0) {
          setUploadStatus('partial');
        } else {
          setUploadStatus('error');
          setErrorMessage(result.errors.join('; '));
        }
      } else {
        setServerResult(result || null);
        setUploadStatus('success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadStatus('ready');
      setErrorMessage(msg);
      console.error('Bulk upload error:', err);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setColumnMapping({});
    setUploadStatus('idle');
    setErrorMessage(null);
    setMissingColumnsError(null);
    setServerResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    // For Org Admin, require branch selection before template download
    if (isOrgAdmin && !branchId) {
      alert('Please select a branch before downloading the template');
      return;
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    // Add headers - always include branch column
    const headers = [
      { header: 'name', key: 'name', width: 25 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'phone', key: 'phone', width: 18 },
      { header: 'department', key: 'department', width: 18 },
      { header: 'branch', key: 'branch', width: 22 },
    ];

    worksheet.columns = headers;

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };

    // Add example rows (10-digit phone numbers, no country code)
    const exampleBranch = selectedBranchCode || '';
    worksheet.addRow({ name: 'Vikram Singh', email: 'vikram@company.com', phone: '9876511111', department: 'Engineering', branch: exampleBranch });
    worksheet.addRow({ name: 'Priya Sharma', email: 'priya@company.com', phone: '9876522222', department: 'Marketing', branch: exampleBranch });
    worksheet.addRow({ name: 'Amit Patel', email: 'amit@company.com', phone: '', department: 'Finance', branch: exampleBranch });
    worksheet.addRow({ name: 'Neha Gupta', email: 'neha@company.com', phone: '9876544444', department: 'HR', branch: exampleBranch });

    // Apply phone validation for rows 2-100 (exactly 10 digits, numbers only)
    for (let row = 2; row <= 100; row++) {
      worksheet.getCell(`C${row}`).dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: [`AND(LEN(C${row})=10,ISNUMBER(VALUE(C${row})))`],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid Phone Number',
        error: 'Phone number must be exactly 10 digits (numbers only, e.g. 9876543210).',
        showInputMessage: true,
        promptTitle: 'Phone Number',
        prompt: 'Enter exactly 10 digits (numbers only, e.g. 9876543210)',
      };
      // Format as text to prevent Excel from converting to scientific notation
      worksheet.getCell(`C${row}`).numFmt = '@';
    }

    // Apply department dropdown for rows 2-100 (column D is always department)
    const departmentList = DEPARTMENTS.join(',');
    for (let row = 2; row <= 100; row++) {
      worksheet.getCell(`D${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${departmentList}"`],
        showInputMessage: true,
        errorTitle: 'Invalid Department',
        error: 'Please select a department from the dropdown list',
      };
    }

    // Branch column E: validation-only lock when branch selected, dropdown when not
    if (selectedBranchCode) {
      // Branch is pre-selected — only set validation (restricts to that one value).
      // Example rows (2-5) are already pre-filled above; remaining rows stay empty
      // but Excel will only allow the pre-selected branch if user types anything.
      for (let row = 2; row <= 100; row++) {
        worksheet.getCell(`E${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${selectedBranchCode}"`],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Branch Locked',
          error: `Only "${selectedBranchCode}" is allowed — branch was pre-selected.`,
          showInputMessage: true,
          promptTitle: 'Branch',
          prompt: `Locked to: ${selectedBranchCode}`,
        };
      }
    } else if (branches.length > 0) {
      // No branch pre-selected — show dropdown with available branches (required)
      const branchOptions = branches.map(b => b.branch_code).join(',');
      for (let row = 2; row <= 100; row++) {
        worksheet.getCell(`E${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${branchOptions}"`],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Branch Required',
          error: 'Please select a branch from the dropdown list',
          showInputMessage: true,
          promptTitle: 'Branch (Required)',
          prompt: 'Select the branch for this employee',
        };
      }
    }

    // Create Instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 50 },
      { width: 40 },
      { width: 20 }
    ];

    // Title
    instructionsSheet.mergeCells('A1:E1');
    instructionsSheet.getCell('A1').value = 'SUB-USER (EMPLOYEE) UPLOAD TEMPLATE - INSTRUCTIONS';
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
      ['name', 'No', 'Full name of the employee. If blank, email will be used as display name.', 'Vikram Singh, Priya Sharma'],
      ['email', 'YES', 'Valid work email address. Must be unique. Used for device check-in.', 'vikram@company.com'],
      ['phone', 'No', 'Exactly 10 digits, no spaces or country code. Sheet will show error if not 10 digits.', '9876543210'],
      ['department', 'No', 'Department (use dropdown). Helps with device organization.', 'Engineering, Marketing, HR'],
      selectedBranchCode
        ? ['branch', 'LOCKED', `Pre-filled with "${selectedBranchCode}". Do not change.`, selectedBranchCode]
        : ['branch', branches.length > 0 ? 'YES' : 'No', 'Branch for this employee (use dropdown).', 'HQ, DELHI-01'],
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

    // Add supported departments
    const deptStartRow = 11;
    instructionsSheet.mergeCells(`A${deptStartRow}:E${deptStartRow}`);
    instructionsSheet.getCell(`A${deptStartRow}`).value = 'SUPPORTED DEPARTMENTS';
    instructionsSheet.getCell(`A${deptStartRow}`).font = { bold: true, size: 12 };
    instructionsSheet.getCell(`A${deptStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }
    };

    DEPARTMENTS.forEach((dept, index) => {
      instructionsSheet.getCell(`A${deptStartRow + 1 + index}`).value = dept;
    });

    // Add tips section
    const tipsStartRow = deptStartRow + DEPARTMENTS.length + 2;
    instructionsSheet.mergeCells(`A${tipsStartRow}:E${tipsStartRow}`);
    instructionsSheet.getCell(`A${tipsStartRow}`).value = 'IMPORTANT NOTES';
    instructionsSheet.getCell(`A${tipsStartRow}`).font = { bold: true, size: 12 };
    instructionsSheet.getCell(`A${tipsStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }
    };

    const tips = [
      '1. Delete the example rows (rows 2-5) before uploading your data',
      '2. Email addresses must be unique - duplicates will be rejected',
      '3. Employees will receive an email invitation to check in their devices',
      '4. Use the department dropdown in the Employees sheet',
      '5. Unknown departments will show a warning but still upload',
      '6. You can also use CSV format (.csv) for upload'
    ];

    tips.forEach((tip, index) => {
      instructionsSheet.mergeCells(`A${tipsStartRow + 1 + index}:E${tipsStartRow + 1 + index}`);
      instructionsSheet.getCell(`A${tipsStartRow + 1 + index}`).value = tip;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotribe-users-template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Success state
  if (uploadStatus === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
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
            Users Added Successfully
          </h2>

          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="font-brand font-bold text-3xl text-ecotribe-primary">{serverResult?.created_count ?? validRows.length}</p>
              <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Users Invited</p>
            </div>
            {uniqueDepartments.size > 0 && (
              <div className="text-center">
                <p className="font-brand font-bold text-3xl text-blue-400">{uniqueDepartments.size}</p>
                <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Departments</p>
              </div>
            )}
          </div>

          <p className="font-mono text-xs text-zinc-500 mb-6">
            Sub-users will receive email invitations to check-in their devices
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="interactive px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload More
            </button>
            <button
              onClick={onCancel}
              className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              View Employees
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Partial success — some users created, some failed
  if (uploadStatus === 'partial' && serverResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
      >
        <div className="py-12 px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 border border-amber-400/30 bg-amber-400/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase tracking-tight mb-2">
              Partial Upload
            </h2>
            <p className="font-mono text-xs text-zinc-500">
              Some users were created, but others had errors
            </p>
          </div>

          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="font-brand font-bold text-3xl text-emerald-400">{serverResult.created_count}</p>
              <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Created</p>
            </div>
            <div className="text-center">
              <p className="font-brand font-bold text-3xl text-red-400">{serverResult.error_count}</p>
              <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Failed</p>
            </div>
          </div>

          {/* Error details */}
          {serverResult.errors.length > 0 && (
            <div className="border border-red-400/20 bg-red-400/5 p-4 mb-6 max-h-48 overflow-y-auto">
              <p className="font-mono font-bold text-[10px] text-red-400 uppercase tracking-widest mb-2">Errors</p>
              <ul className="space-y-1">
                {serverResult.errors.map((err, i) => (
                  <li key={i} className="font-mono text-xs text-zinc-400">{err}</li>
                ))}
              </ul>
            </div>
          )}

          {errorMessage && (
            <div className="border border-amber-400/20 bg-amber-400/5 p-3 mb-6">
              <p className="font-mono text-xs text-amber-400">{errorMessage}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="interactive px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload More
            </button>
            <button
              onClick={onCancel}
              className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              View Employees
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {uploadStatus === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Branch Selection Note for Org Admin */}
          {isOrgAdmin && !branchId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 border border-amber-400/20 bg-amber-400/5 p-4"
            >
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-bold text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
                    No Branch Selected
                  </p>
                  <p className="font-mono text-xs text-amber-600/80 dark:text-amber-400/80">
                    Select a branch above to apply it to all employees, or include a &quot;branch&quot; column in your CSV with valid branch codes. Rows without a branch will be flagged as errors.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer">
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
                  id="csv-user-upload"
                />

                <div className={`w-16 h-16 border flex items-center justify-center mx-auto mb-6 ${
                  dragActive ? 'border-ecotribe-primary/30 bg-ecotribe-primary/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                }`}>
                  <Users className={`w-8 h-8 ${dragActive ? 'text-ecotribe-primary' : 'text-zinc-600'}`} />
                </div>

                <h3 className="font-display font-bold text-lg text-black dark:text-white uppercase tracking-wide mb-2">
                  {dragActive ? 'Drop your file here' : 'Upload Users'}
                </h3>
                <p className="font-mono text-xs text-zinc-600 mb-6">
                  Drag and drop your CSV or Excel file, or click to browse
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <label htmlFor="csv-user-upload" className="cursor-pointer">
                    <span className="interactive inline-flex items-center gap-2 px-5 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-all bg-ecotribe-primary text-black hover:bg-white">
                      <FileSpreadsheet className="w-4 h-4" />
                      Select File
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    disabled={isOrgAdmin && !branchId}
                    className={`interactive px-5 py-2.5 border font-mono font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
                      isOrgAdmin && !branchId
                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Download Excel Template
                  </button>
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      )}

      {/* Parsing Status */}
      {uploadStatus === 'parsing' && (
        <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer py-16 text-center">
          <div className="w-12 h-12 border-2 border-ecotribe-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Validating data...</p>
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
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-black dark:text-white uppercase">{file.name}</p>
                  <p className="font-mono text-xs text-zinc-600">
                    {(file.size / 1024).toFixed(1)} KB • {parsedData.length} rows
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="interactive p-2.5 border border-slate-200 dark:border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
              >
                <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer">
            <div className="p-5 border-b border-black/10 dark:border-white/10">
              <h2 className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide">Validation Summary</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 border-l border-t border-slate-200 dark:border-white/10">
              <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-emerald-500/5">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="font-brand font-bold text-2xl text-emerald-400">{validRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Valid Users</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${invalidRows.length > 0 ? 'bg-red-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-4 h-4 ${invalidRows.length > 0 ? 'text-red-400' : 'text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${invalidRows.length > 0 ? 'text-red-400' : 'text-zinc-600'}`}>{invalidRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Errors</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${warningRows.length > 0 ? 'bg-amber-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-4 h-4 ${warningRows.length > 0 ? 'text-amber-400' : 'text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${warningRows.length > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>{warningRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Warnings</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${uniqueDepartments.size > 0 ? 'bg-blue-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Building className={`w-4 h-4 ${uniqueDepartments.size > 0 ? 'text-blue-400' : 'text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${uniqueDepartments.size > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>{uniqueDepartments.size}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Departments</p>
              </div>
            </div>

            {/* Branch validation banner — shown when no branch selected and rows lack branch data */}
            {branchRequiredPerRow && invalidRows.length > 0 && invalidRows.some(r => r.errors.some(e => e.includes('Branch is required'))) && (
              <div className="mx-5 mt-5 border border-red-400/20 bg-red-400/5 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display font-bold text-sm text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                      Branch Required for All Rows
                    </p>
                    <p className="font-mono text-xs text-red-600/80 dark:text-red-400/80">
                      No branch is selected and your file doesn&apos;t include branch data. Either select a branch from the dropdown above, or re-upload with a &quot;branch&quot; column containing valid branch codes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Column Mapping */}
            <div className="p-5 border-t border-slate-200 dark:border-white/10">
              <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Detected Columns</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(columnMapping).map(([field, original]) => (
                  <span key={field} className="px-2 py-1 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs font-mono">
                    <span className="text-zinc-600">{original}</span>
                    <span className="text-zinc-700 mx-1">→</span>
                    <span className={field === 'email' ? 'text-red-400' : 'text-ecotribe-primary'}>{field}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Department Distribution */}
          {uniqueDepartments.size > 0 && (
            <div className="border border-blue-400/20 bg-blue-400/5 p-5">
              <div className="flex gap-4">
                <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <Building className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide mb-2">
                    Departments Found
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(uniqueDepartments).map(dept => (
                      <span key={dept} className="px-2 py-1 border border-blue-400/20 bg-blue-400/10 text-blue-400 text-xs font-mono">
                        {dept}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Preview */}
          <div className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer">
            <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide">Data Preview</h2>
              </div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="interactive p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                {showPreview ? <ChevronUp className="w-4 h-4 text-zinc-600" /> : <ChevronDown className="w-4 h-4 text-zinc-600" />}
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
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Status</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Name</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Email</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Phone</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Department</th>
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
                            <td className="py-3 px-5 font-display text-sm text-black dark:text-white">
                              {row.name || <span className="text-zinc-600">-</span>}
                            </td>
                            <td className="py-3 px-5 font-mono text-xs text-zinc-400">
                              {row.email || '-'}
                            </td>
                            <td className="py-3 px-5 font-mono text-xs text-zinc-600">
                              {row.phone || '-'}
                            </td>
                            <td className="py-3 px-5">
                              {row.department ? (
                                <span className="px-2 py-0.5 border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[10px] font-mono uppercase">
                                  {row.department}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-zinc-700">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 10 && (
                    <p className="p-4 text-center font-mono text-xs text-zinc-600">
                      Showing 10 of {parsedData.length} rows
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Missing Column Warning */}
          {missingColumnsError && (
            <div className="border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="font-display font-bold text-sm text-red-400 uppercase tracking-wide mb-1">Wrong File Format</p>
                  <p className="font-mono text-xs text-red-400/80">{missingColumnsError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {invalidRows.length > 0 && (
            <div className="border border-red-500/20 bg-red-500/5">
              <div className="p-5 border-b border-red-500/10 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="font-display font-bold text-sm text-red-400 uppercase tracking-wide">Errors ({invalidRows.length})</h2>
              </div>
              <div className="p-5 space-y-3 max-h-48 overflow-y-auto">
                {invalidRows.slice(0, 5).map((row, index) => (
                  <div
                    key={index}
                    className="p-3 border border-red-500/10 bg-red-500/5"
                  >
                    <p className="font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                      Row: {row.email || '(empty email)'}
                    </p>
                    <ul className="font-mono text-xs text-red-400 space-y-1">
                      {row.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {invalidRows.length > 5 && (
                  <p className="text-center font-mono text-xs text-zinc-600">
                    And {invalidRows.length - 5} more errors...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload Error Display */}
          {errorMessage && (
            <div className="border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="font-display font-bold text-sm text-red-400 uppercase tracking-wide mb-1">Upload Failed</p>
                  <p className="font-mono text-xs text-red-400/80">{errorMessage}</p>
                  <p className="font-mono text-xs text-zinc-600 mt-2">Please try again. If the problem persists, refresh the page and re-upload.</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={uploadStatus === 'uploading'}
                className="interactive px-6 py-3 text-zinc-500 hover:text-slate-900 dark:hover:text-white font-mono font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
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
              Invite {validRows.length} Users
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default CSVUserUpload;
