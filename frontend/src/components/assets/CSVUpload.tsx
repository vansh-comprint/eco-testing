import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Laptop,
  Mail,
  ArrowRight,
  FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import type { CreateAssetInput } from '@/hooks/useAssets';

export interface BulkUploadMetadata {
  fileName: string;
  totalAssets: number;
  assignedAssets: number;
  unassignedAssets: number;
  uniqueEmails: string[];
}

export interface BulkUploadResult {
  created_count: number;
  error_count: number;
  errors: { index: number; serial_number: string; error: string }[];
}

interface CSVUploadProps {
  enterpriseId: string;
  batchId?: string;
  branches?: Array<{ id: string; branch_name: string }>;
  branchRequired?: boolean; // when true, template download is blocked until a branch is selected
  selectedBranchId?: string; // when set, branch is already determined — skip branch column in template/validation
  onUpload: (assets: CreateAssetInput[], metadata: BulkUploadMetadata) => Promise<BulkUploadResult | void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface ParsedRow {
  serialNumber: string;
  brand: string;
  model: string;
  branch: string;
  processor?: string;
  ram?: string;
  storage?: string;
  screenSize?: string;
  os?: string;
  gpu?: string;
  purchaseDate?: string;
  // User assignment fields
  assignedEmail?: string;
  assignedName?: string;
  assignedDepartment?: string;
  errors: string[];
  warnings: string[];
}

const REQUIRED_COLUMNS = ['serialNumber', 'brand', 'model', 'branch'];
const OPTIONAL_COLUMNS = ['processor', 'ram', 'storage', 'screenSize', 'os', 'gpu', 'purchaseDate'];
const USER_COLUMNS = ['assignedEmail', 'assignedName', 'assignedDepartment'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS, ...USER_COLUMNS];

const COLUMN_ALIASES: Record<string, string> = {
  // Serial number variations (most common issue)
  'serial': 'serialNumber',
  'serial_number': 'serialNumber',
  'serial number': 'serialNumber',
  'serialnumber': 'serialNumber',
  'sn': 'serialNumber',
  's/n': 'serialNumber',
  's.n.': 'serialNumber',
  'serial no': 'serialNumber',
  'serial no.': 'serialNumber',
  'serialno': 'serialNumber',
  'asset serial': 'serialNumber',
  'device serial': 'serialNumber',
  // Brand
  'manufacturer': 'brand',
  'make': 'brand',
  'brand': 'brand',
  // Model
  'model_name': 'model',
  'model name': 'model',
  'model': 'model',
  'device model': 'model',
  // Processor
  'cpu': 'processor',
  'processor': 'processor',
  // RAM
  'memory': 'ram',
  'ram': 'ram',
  // Storage
  'disk': 'storage',
  'hdd': 'storage',
  'ssd': 'storage',
  'storage': 'storage',
  'hard drive': 'storage',
  // Screen
  'screen': 'screenSize',
  'display': 'screenSize',
  'screen_size': 'screenSize',
  'screen size': 'screenSize',
  'screensize': 'screenSize',
  // OS
  'operating_system': 'os',
  'operating system': 'os',
  'os': 'os',
  // Purchase Date
  'purchase_date': 'purchaseDate',
  'purchase date': 'purchaseDate',
  'purchasedate': 'purchaseDate',
  'date': 'purchaseDate',
  // User assignment aliases
  'email': 'assignedEmail',
  'assigned_email': 'assignedEmail',
  'assigned email': 'assignedEmail',
  'assignedemail': 'assignedEmail',
  'user_email': 'assignedEmail',
  'user email': 'assignedEmail',
  'useremail': 'assignedEmail',
  'employee_email': 'assignedEmail',
  'employee email': 'assignedEmail',
  'employeeemail': 'assignedEmail',
  // Name
  'name': 'assignedName',
  'assigned_name': 'assignedName',
  'assigned name': 'assignedName',
  'assignedname': 'assignedName',
  'user_name': 'assignedName',
  'user name': 'assignedName',
  'username': 'assignedName',
  'employee_name': 'assignedName',
  'employee name': 'assignedName',
  'employeename': 'assignedName',
  'full_name': 'assignedName',
  'full name': 'assignedName',
  'fullname': 'assignedName',
  // Department
  'department': 'assignedDepartment',
  'dept': 'assignedDepartment',
  'assigned_department': 'assignedDepartment',
  'assigned department': 'assignedDepartment',
  'assigneddepartment': 'assignedDepartment',
  // GPU (new)
  'gpu': 'gpu',
  'graphics': 'gpu',
  'graphics card': 'gpu',
  'video card': 'gpu',
  // Branch
  'branch': 'branch',
  'branch_name': 'branch',
  'branch name': 'branch',
  'branchname': 'branch',
  'office': 'branch',
  'site': 'branch',
  'location': 'branch',
};

export function CSVUpload({ enterpriseId, batchId, branches = [], branchRequired = false, selectedBranchId, onUpload, onCancel, isLoading }: CSVUploadProps) {
  // When branch is pre-selected at page level, exclude it from CSV requirements
  const branchPreSelected = !!selectedBranchId;
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'success' | 'partial' | 'error'>('idle');
  const [serverErrors, setServerErrors] = useState<BulkUploadResult['errors']>([]);
  const [serverCreatedCount, setServerCreatedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validRows = parsedData.filter(row => row.errors.length === 0);
  const invalidRows = parsedData.filter(row => row.errors.length > 0);
  const warningRows = parsedData.filter(row => row.warnings.length > 0);
  const rowsWithUsers = parsedData.filter(row => row.assignedEmail);
  const uniqueUsers = new Set(parsedData.filter(row => row.assignedEmail).map(row => row.assignedEmail));

  const normalizeColumnName = (name: string): string => {
    // Remove BOM, quotes, and extra whitespace
    const cleaned = name
      .replace(/^\uFEFF/, '') // Remove BOM
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' '); // Normalize multiple spaces

    // Check direct match first
    if (ALL_COLUMNS.map(c => c.toLowerCase()).includes(cleaned)) {
      return ALL_COLUMNS.find(c => c.toLowerCase() === cleaned) || cleaned;
    }

    // Check aliases
    return COLUMN_ALIASES[cleaned] || cleaned;
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

    // Check for required columns (skip branch when pre-selected at page level)
    const effectiveRequired = branchPreSelected ? REQUIRED_COLUMNS.filter(c => c !== 'branch') : REQUIRED_COLUMNS;
    const missingRequired = effectiveRequired.filter(col => !(col in mapping));
    if (missingRequired.length > 0) {
      console.error('Missing required columns:', missingRequired);
    }

    // Parse data rows
    const rows: ParsedRow[] = [];
    const seenSerials = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      // Skip completely blank rows (all values empty or just commas)
      const hasAnyValue = values.some(v => v.trim() !== '');
      if (!hasAnyValue) continue;

      const row: ParsedRow = {
        serialNumber: '',
        brand: '',
        model: '',
        branch: '',
        errors: [],
        warnings: [],
      };

      // Map values to fields
      Object.entries(mapping).forEach(([field, index]) => {
        const value = values[index]?.trim() || '';
        if (field in row || USER_COLUMNS.includes(field) || OPTIONAL_COLUMNS.includes(field)) {
          (row as unknown as Record<string, unknown>)[field] = value;
        }
      });

      // Skip rows where all required fields are empty (likely blank rows with some formatting)
      if (!row.serialNumber && !row.brand && !row.model) continue;

      // Validate branch (required only when no branch is pre-selected at page level)
      if (!branchPreSelected && branches.length > 0) {
        if (!row.branch) {
          row.errors.push('Branch is required');
        } else {
          const matchedBranch = branches.find(
            b => b.branch_name.toLowerCase() === row.branch.toLowerCase()
          );
          if (!matchedBranch) {
            row.errors.push(`Branch "${row.branch}" is not valid. Use the dropdown to select an available branch`);
          }
        }
      }

      // Validate remaining required fields
      if (!row.serialNumber) {
        row.errors.push('Serial number is required');
      } else if (row.serialNumber.length < 5) {
        row.errors.push('Serial number must be at least 5 characters');
      } else if (seenSerials.has(row.serialNumber.toUpperCase())) {
        row.errors.push('Duplicate serial number in file');
      } else {
        seenSerials.add(row.serialNumber.toUpperCase());
      }

      if (!row.brand) {
        row.errors.push('Brand is required');
      }

      if (!row.model) {
        row.errors.push('Model is required');
      }

      // Validate email if provided
      if (row.assignedEmail && !isValidEmail(row.assignedEmail)) {
        row.errors.push('Invalid email format');
      }

      // Warnings for optional fields
      if (!row.processor && !row.ram && !row.storage) {
        row.warnings.push('No specifications provided - may affect valuation');
      }

      // Info about user assignment
      if (row.assignedEmail && !row.assignedName) {
        row.warnings.push('User name not provided - email will be used as name');
      }

      rows.push(row);
    }

    setParsedData(rows);
    setUploadStatus('ready');
  }, [branches, branchPreSelected]);

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

  const parseExcel = useCallback((data: ArrayBuffer): void => {
    setUploadStatus('parsing');

    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        setUploadStatus('error');
        return;
      }

      // Convert to CSV format and use existing parseCSV logic
      const csvContent = jsonData.map(row =>
        (row as unknown as string[]).map(cell => {
          const value = cell?.toString() || '';
          // Escape quotes and wrap in quotes if contains comma
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      ).join('\n');

      parseCSV(csvContent);
    } catch {
      console.error('Error parsing Excel file');
      setUploadStatus('error');
    }
  }, [parseCSV]);

  const handleFile = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        parseExcel(data);
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.onload = (e) => {
        const content = e.target?.result as string;
        parseCSV(content);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (validRows.length === 0 || !file) return;

    setUploadStatus('uploading');
    try {
      // Build branch name -> id lookup
      const branchNameToId = new Map<string, string>(
        branches.map(b => [b.branch_name.toLowerCase(), b.id])
      );

      // V3: Use snake_case for database fields
      const assets: CreateAssetInput[] = validRows.map(row => ({
        enterprise_id: enterpriseId,
        batch_id: batchId,
        branch_id: row.branch ? branchNameToId.get(row.branch.toLowerCase()) : undefined,
        serial_number: row.serialNumber.toUpperCase(),
        brand: row.brand,
        model: row.model,
        assigned_email: row.assignedEmail || undefined,
        assigned_name: row.assignedName || undefined,
        assigned_department: row.assignedDepartment || undefined,
        specs: (row.processor || row.ram || row.storage || row.screenSize || row.os || row.gpu) ? {
          processor: row.processor || undefined,
          ram: row.ram || undefined,
          storage: row.storage || undefined,
          screenSize: row.screenSize || undefined,
          os: row.os || undefined,
          gpu: row.gpu || undefined,
        } : undefined,
        purchase_date: row.purchaseDate || undefined,
      }));

      const metadata: BulkUploadMetadata = {
        fileName: file.name,
        totalAssets: validRows.length,
        assignedAssets: rowsWithUsers.length,
        unassignedAssets: validRows.length - rowsWithUsers.length,
        uniqueEmails: Array.from(uniqueUsers).filter((email): email is string => !!email),
      };

      const result = await onUpload(assets, metadata);
      if (result && result.error_count > 0) {
        setServerErrors(result.errors);
        setServerCreatedCount(result.created_count);
        setUploadStatus(result.created_count > 0 ? 'partial' : 'error');
      } else {
        setUploadStatus('success');
      }
    } catch {
      setUploadStatus('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setColumnMapping({});
    setUploadStatus('idle');
    setServerErrors([]);
    setServerCreatedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Exclude branch from CSV template when it's pre-selected at page level
    const csvRequired = branchPreSelected ? REQUIRED_COLUMNS.filter(c => c !== 'branch') : REQUIRED_COLUMNS;
    const headers = [...csvRequired, ...OPTIONAL_COLUMNS, ...USER_COLUMNS].join(',');
    const exampleBranch = branches.length > 0 ? branches[0].branch_name : 'Main Branch';
    // Comprehensive examples showing valid options for each field
    const makeLine = (sn: string, brand: string, model: string, proc: string, ram: string, storage: string, screen: string, os: string, gpu: string, date: string, email: string, name: string, dept: string) => {
      const base = [sn, brand, model];
      if (!branchPreSelected) base.push(exampleBranch);
      base.push(proc, ram, storage, screen, os, gpu, date, email, name, dept);
      return base.join(',');
    };
    const examples = [
      makeLine('DELL-XPS15-001','Dell','XPS 15 9520','Intel Core i7-12700H','16GB DDR5','512GB NVMe SSD','15.6 inch FHD+','Windows 11 Pro','NVIDIA RTX 3050 Ti','2024-01-15','vikram@company.com','Vikram Singh','Engineering'),
      makeLine('HP-ELITE-002','HP','EliteBook 840 G9','Intel Core i5-1245U','8GB DDR4','256GB SSD','14 inch FHD','Windows 11 Pro','','2023-06-20','priya@company.com','Priya Sharma','Marketing'),
      makeLine('LENOVO-T14-003','Lenovo','ThinkPad T14 Gen 3','AMD Ryzen 7 PRO 6850U','16GB DDR5','512GB PCIe SSD','14 inch 2.2K','Windows 11 Pro','AMD Radeon Graphics','2024-03-10','','',''),
      makeLine('APPLE-MBP-004','Apple','MacBook Pro 14','Apple M3 Pro','18GB Unified','512GB SSD','14.2 inch Liquid Retina','macOS Sonoma','Apple M3 Pro GPU','2024-02-28','amit@company.com','Amit Kumar','Design'),
      makeLine('ASUS-ZEN-005','Asus','ZenBook 14','Intel Core i5-1340P','16GB LPDDR5','512GB SSD','14 inch OLED','Windows 11 Home','Intel Iris Xe','2023-11-15','','',''),
    ];
    const content = `${headers}\n${examples.join('\n')}`;

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotribe-asset-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadExcelTemplate = async () => {
    // Define simple, user-friendly dropdown options
    const brandOptions = ['Dell', 'HP', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Microsoft', 'Samsung', 'Toshiba', 'Sony'];
    const ramOptions = ['4GB', '8GB', '16GB', '32GB', '64GB'];
    const storageOptions = ['128GB', '256GB', '512GB', '1TB', '2TB'];
    const screenOptions = ['13 inch', '14 inch', '15 inch', '15.6 inch', '16 inch', '17 inch'];
    const osOptions = ['Windows 10', 'Windows 11', 'macOS', 'Linux', 'Chrome OS'];
    const gpuOptions = ['Integrated', 'NVIDIA', 'AMD', 'Intel', 'Apple'];
    const departmentOptions = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR', 'Design', 'Operations', 'IT', 'Admin', 'Support'];

    // Create workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EcoTribe';
    workbook.created = new Date();

    // Create main Assets sheet
    const worksheet = workbook.addWorksheet('Assets');

    // Branch names for dropdown (only used when branch is NOT pre-selected)
    const branchOptions = branches.map(b => b.branch_name);
    const exampleBranch = branchOptions[0] || 'Main Branch';
    const includeBranch = !branchPreSelected;

    // Build columns dynamically — exclude branch when pre-selected at page level
    const templateColumns: Array<{ header: string; key: string; width: number }> = [
      { header: 'serialNumber', key: 'serialNumber', width: 20 },
      { header: 'brand', key: 'brand', width: 14 },
      { header: 'model', key: 'model', width: 22 },
      ...(includeBranch ? [{ header: 'branch', key: 'branch', width: 22 }] : []),
      { header: 'processor', key: 'processor', width: 26 },
      { header: 'ram', key: 'ram', width: 16 },
      { header: 'storage', key: 'storage', width: 18 },
      { header: 'screenSize', key: 'screenSize', width: 18 },
      { header: 'os', key: 'os', width: 18 },
      { header: 'gpu', key: 'gpu', width: 22 },
      { header: 'purchaseDate', key: 'purchaseDate', width: 14 },
      { header: 'assignedEmail', key: 'assignedEmail', width: 26 },
      { header: 'assignedName', key: 'assignedName', width: 20 },
      { header: 'assignedDepartment', key: 'assignedDepartment', width: 18 },
    ];
    worksheet.columns = templateColumns;

    // Helper: get column letter by key
    const col = (key: string) => {
      const idx = templateColumns.findIndex(c => c.key === key);
      return idx >= 0 ? String.fromCharCode(65 + idx) : null;
    };

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' }
    };
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
    });

    // Add example data rows with simple values
    const exRow1: Record<string, string> = {
      serialNumber: 'DELL-001',
      brand: 'Dell',
      model: 'XPS 15',
      processor: 'Intel i7',
      ram: '16GB',
      storage: '512GB',
      screenSize: '15.6 inch',
      os: 'Windows 11',
      gpu: 'NVIDIA',
      purchaseDate: '15/01/2024',
      assignedEmail: 'vikram@company.com',
      assignedName: 'Vikram Singh',
      assignedDepartment: 'Engineering',
    };
    const exRow2: Record<string, string> = {
      serialNumber: 'HP-002',
      brand: 'HP',
      model: 'EliteBook 840',
      processor: 'Intel i5',
      ram: '8GB',
      storage: '256GB',
      screenSize: '14 inch',
      os: 'Windows 11',
      gpu: 'Integrated',
      purchaseDate: '20/06/2023',
      assignedEmail: 'priya@company.com',
      assignedName: 'Priya Sharma',
      assignedDepartment: 'Marketing',
    };
    if (includeBranch) {
      exRow1.branch = exampleBranch;
      exRow2.branch = exampleBranch;
    }
    worksheet.addRow(exRow1);
    worksheet.addRow(exRow2);

    // Add empty rows for user input (rows 4-101)
    for (let i = 0; i < 98; i++) {
      worksheet.addRow({});
    }

    // Apply dropdowns for rows 2-101
    // Warning style allows users to type custom values - click Yes to confirm

    // Branch dropdown - REQUIRED, strict validation (only when branch column is present)
    const branchLetter = col('branch');
    if (includeBranch && branchLetter && branchOptions.length > 0) {
      for (let row = 2; row <= 101; row++) {
        worksheet.getCell(`${branchLetter}${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`"${branchOptions.join(',')}"`],
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: 'Invalid Branch',
          error: 'Please select a valid branch from the dropdown. Only active branches are shown.'
        };
      }
    }

    // Brand dropdown
    const brandLetter = col('brand')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${brandLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${brandOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // RAM dropdown
    const ramLetter = col('ram')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${ramLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${ramOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // Storage dropdown
    const storageLetter = col('storage')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${storageLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${storageOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // Screen Size dropdown
    const screenLetter = col('screenSize')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${screenLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${screenOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // OS dropdown
    const osLetter = col('os')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${osLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${osOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // GPU dropdown
    const gpuLetter = col('gpu')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${gpuLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${gpuOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // Department dropdown
    const deptLetter = col('assignedDepartment')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${deptLetter}${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${departmentOptions.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Custom Value',
        error: 'Click Yes to use your custom value'
      };
    }

    // Date validation for purchaseDate column - DD/MM/YYYY format
    const dateLetter = col('purchaseDate')!;
    for (let row = 2; row <= 101; row++) {
      worksheet.getCell(`${dateLetter}${row}`).dataValidation = {
        type: 'date',
        allowBlank: true,
        operator: 'between',
        formulae: [new Date('2000-01-01'), new Date('2099-12-31')],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Date',
        error: 'Please enter a valid date (e.g., 15/01/2024)'
      };
      // Set date format to DD/MM/YYYY
      worksheet.getCell(`${dateLetter}${row}`).numFmt = 'dd/mm/yyyy';
    }

    // Create reference sheet with all valid options
    const refSheet = workbook.addWorksheet('Valid Options');
    if (includeBranch) {
      refSheet.getRow(1).values = ['VALID OPTIONS REFERENCE - Dropdowns are available in the Assets sheet'];
      refSheet.mergeCells('A1:H1');
      refSheet.getCell('A1').font = { bold: true, size: 12 };

      refSheet.getRow(3).values = ['Branch (Required)', 'Brand', 'RAM', 'Storage', 'Screen Size', 'OS', 'GPU', 'Department'];
      refSheet.getRow(3).font = { bold: true };

      const maxLength = Math.max(
        branchOptions.length, brandOptions.length, ramOptions.length, storageOptions.length,
        screenOptions.length, osOptions.length, gpuOptions.length, departmentOptions.length
      );

      for (let i = 0; i < maxLength; i++) {
        refSheet.addRow([
          branchOptions[i] || '',
          brandOptions[i] || '',
          ramOptions[i] || '',
          storageOptions[i] || '',
          screenOptions[i] || '',
          osOptions[i] || '',
          gpuOptions[i] || '',
          departmentOptions[i] || ''
        ]);
      }

      refSheet.columns = [
        { width: 22 }, { width: 16 }, { width: 16 }, { width: 18 },
        { width: 18 }, { width: 20 }, { width: 25 }, { width: 18 }
      ];
    } else {
      refSheet.getRow(1).values = ['VALID OPTIONS REFERENCE - Dropdowns are available in the Assets sheet'];
      refSheet.mergeCells('A1:G1');
      refSheet.getCell('A1').font = { bold: true, size: 12 };

      refSheet.getRow(3).values = ['Brand', 'RAM', 'Storage', 'Screen Size', 'OS', 'GPU', 'Department'];
      refSheet.getRow(3).font = { bold: true };

      const maxLength = Math.max(
        brandOptions.length, ramOptions.length, storageOptions.length,
        screenOptions.length, osOptions.length, gpuOptions.length, departmentOptions.length
      );

      for (let i = 0; i < maxLength; i++) {
        refSheet.addRow([
          brandOptions[i] || '',
          ramOptions[i] || '',
          storageOptions[i] || '',
          screenOptions[i] || '',
          osOptions[i] || '',
          gpuOptions[i] || '',
          departmentOptions[i] || ''
        ]);
      }

      refSheet.columns = [
        { width: 16 }, { width: 16 }, { width: 18 },
        { width: 18 }, { width: 20 }, { width: 25 }, { width: 18 }
      ];
    }

    // Create Instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { width: 25 },
      { width: 15 },
      { width: 50 },
      { width: 40 }
    ];

    // Title
    instructionsSheet.mergeCells('A1:D1');
    instructionsSheet.getCell('A1').value = 'ECOTRIBE ASSET UPLOAD TEMPLATE - INSTRUCTIONS';
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

    // Column instructions — exclude branch row when pre-selected
    const columnInstructions: string[][] = [
      ['serialNumber', 'YES', 'Unique identifier for the asset (min 5 characters)', 'DELL-001, HP-XYZ-123, SN2024001'],
      ['brand', 'YES', 'Manufacturer/brand of the device', 'Dell, HP, Lenovo, Apple, Asus'],
      ['model', 'YES', 'Model name/number of the device', 'XPS 15, EliteBook 840, ThinkPad T14'],
      ...(includeBranch ? [['branch', 'YES', 'Branch/office location (use dropdown - only active branches shown)', branchOptions.join(', ') || 'Select from dropdown']] : []),
      ['processor', 'No', 'CPU type and model', 'Intel i7, Intel i5, AMD Ryzen 7, Apple M3'],
      ['ram', 'No', 'Memory size (use dropdown or enter custom)', '4GB, 8GB, 16GB, 32GB'],
      ['storage', 'No', 'Storage capacity (use dropdown or enter custom)', '128GB, 256GB, 512GB, 1TB'],
      ['screenSize', 'No', 'Display size (use dropdown or enter custom)', '13 inch, 14 inch, 15.6 inch'],
      ['os', 'No', 'Operating system (use dropdown or enter custom)', 'Windows 10, Windows 11, macOS'],
      ['gpu', 'No', 'Graphics card type (use dropdown or enter custom)', 'Integrated, NVIDIA, AMD, Intel'],
      ['purchaseDate', 'No', 'Date of purchase in DD/MM/YYYY format', '15/01/2024, 20/06/2023'],
      ['assignedEmail', 'No', 'Email of employee to assign device to', 'john@company.com'],
      ['assignedName', 'No', 'Full name of assigned employee', 'John Doe, Priya Sharma'],
      ['assignedDepartment', 'No', 'Department (use dropdown or enter custom)', 'Engineering, Marketing, Sales']
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
    const tipsStartRow = columnInstructions.length + 6;
    instructionsSheet.mergeCells(`A${tipsStartRow}:D${tipsStartRow}`);
    instructionsSheet.getCell(`A${tipsStartRow}`).value = 'TIPS FOR SUCCESSFUL UPLOAD';
    instructionsSheet.getCell(`A${tipsStartRow}`).font = { bold: true, size: 12 };
    instructionsSheet.getCell(`A${tipsStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }
    };

    const tips = [
      '1. Serial numbers must be unique - duplicates will cause errors',
      '2. Delete the example rows before uploading your data',
      '3. Dropdowns have common values - you can type custom values (click Yes to confirm)',
      '4. If assigning to employees, they will receive an email invitation',
      '5. Leave optional fields blank if unknown - don\'t guess values',
      '6. Maximum 100 rows per upload recommended'
    ];

    tips.forEach((tip, index) => {
      instructionsSheet.mergeCells(`A${tipsStartRow + 1 + index}:D${tipsStartRow + 1 + index}`);
      instructionsSheet.getCell(`A${tipsStartRow + 1 + index}`).value = tip;
    });

    // Generate and download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotribe-asset-template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadValidValuesGuide = () => {
    const guide = `ECOTRIBE ASSET CSV - VALID VALUES GUIDE
========================================

This guide lists recommended values for each field. Using consistent values helps with reporting and asset management.

REQUIRED FIELDS
---------------
serialNumber: Unique identifier (e.g., DELL-XPS15-001, ABC123456, S/N-2024-001)
brand: Dell, HP, Lenovo, Apple, Asus, Acer, Microsoft, Samsung, LG, MSI, Razer, Huawei
model: Full model name (e.g., XPS 15 9520, EliteBook 840 G9, ThinkPad T14 Gen 3)

DEVICE SPECIFICATIONS (Optional)
--------------------------------
processor:
  - Intel: Intel Core i3/i5/i7/i9-[generation][model] (e.g., Intel Core i7-12700H, Intel Core i5-1245U)
  - AMD: AMD Ryzen 3/5/7/9 [model] (e.g., AMD Ryzen 7 PRO 6850U, AMD Ryzen 5 7530U)
  - Apple: Apple M1/M2/M3/M3 Pro/M3 Max (e.g., Apple M3 Pro)

ram:
  - 4GB DDR4
  - 8GB DDR4
  - 8GB DDR5
  - 16GB DDR4
  - 16GB DDR5
  - 16GB LPDDR5
  - 16GB LPDDR5x
  - 18GB Unified (Apple)
  - 32GB DDR4
  - 32GB DDR5
  - 64GB DDR5

storage:
  - 128GB SSD
  - 256GB SSD
  - 512GB SSD
  - 512GB NVMe SSD
  - 512GB PCIe SSD
  - 1TB SSD
  - 1TB NVMe SSD
  - 2TB SSD

screenSize:
  - 13.3 inch FHD
  - 13.5 inch PixelSense
  - 14 inch FHD
  - 14 inch 2K
  - 14 inch 2.2K
  - 14 inch OLED
  - 14.2 inch Liquid Retina
  - 15.6 inch FHD
  - 15.6 inch FHD+
  - 16 inch QHD+
  - 17.3 inch FHD

os:
  - Windows 10 Home
  - Windows 10 Pro
  - Windows 11 Home
  - Windows 11 Pro
  - macOS Ventura
  - macOS Sonoma
  - Ubuntu 22.04 LTS
  - Chrome OS

gpu:
  - Intel UHD Graphics
  - Intel Iris Xe
  - AMD Radeon Graphics
  - NVIDIA GeForce RTX 3050
  - NVIDIA GeForce RTX 3050 Ti
  - NVIDIA GeForce RTX 3060
  - NVIDIA GeForce RTX 4050
  - NVIDIA GeForce RTX 4060
  - NVIDIA GeForce RTX 4070
  - NVIDIA GeForce RTX 4080
  - Apple M1 GPU
  - Apple M2 GPU
  - Apple M3 GPU
  - Apple M3 Pro GPU
  - Apple M3 Max GPU

purchaseDate: Date in YYYY-MM-DD format (e.g., 2024-01-15, 2023-06-20)

USER ASSIGNMENT (Optional)
--------------------------
assignedEmail: Valid email address (e.g., john.doe@company.com)
assignedName: Full name of the user (e.g., John Doe, Priya Sharma)
assignedDepartment: Common departments - Engineering, Marketing, Sales, Finance, HR, Design, Operations, IT, Legal, Customer Support

TIPS
----
1. Keep serial numbers unique across all assets
2. Use consistent capitalization for brands (Dell not DELL or dell)
3. If you don't have exact specs, leave fields blank rather than guessing
4. Pre-assigning users will automatically create employee accounts and send invitations
5. Date format must be YYYY-MM-DD (year-month-day)

========================================
Generated by EcoTribe Asset Management
`;

    const blob = new Blob([guide], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecotribe-valid-values-guide.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download errors as Excel sheet for easy fixing
  const downloadErrorsSheet = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EcoTribe';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Errors to Fix');

    // Define columns - same as template plus Errors column (exclude branch when pre-selected)
    worksheet.columns = [
      { header: 'ERRORS (Fix these issues)', key: 'errors', width: 45 },
      { header: 'serialNumber', key: 'serialNumber', width: 20 },
      { header: 'brand', key: 'brand', width: 14 },
      { header: 'model', key: 'model', width: 22 },
      ...(!branchPreSelected ? [{ header: 'branch', key: 'branch', width: 22 }] : []),
      { header: 'processor', key: 'processor', width: 26 },
      { header: 'ram', key: 'ram', width: 16 },
      { header: 'storage', key: 'storage', width: 18 },
      { header: 'screenSize', key: 'screenSize', width: 18 },
      { header: 'os', key: 'os', width: 18 },
      { header: 'gpu', key: 'gpu', width: 22 },
      { header: 'purchaseDate', key: 'purchaseDate', width: 14 },
      { header: 'assignedEmail', key: 'assignedEmail', width: 26 },
      { header: 'assignedName', key: 'assignedName', width: 20 },
      { header: 'assignedDepartment', key: 'assignedDepartment', width: 18 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' } // Red header
    };
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });

    // Add only rows with errors
    invalidRows.forEach((row, index) => {
      const rowData: Record<string, string> = {
        errors: row.errors.join('; '),
        serialNumber: row.serialNumber || '',
        brand: row.brand || '',
        model: row.model || '',
        processor: row.processor || '',
        ram: row.ram || '',
        storage: row.storage || '',
        screenSize: row.screenSize || '',
        os: row.os || '',
        gpu: row.gpu || '',
        purchaseDate: row.purchaseDate || '',
        assignedEmail: row.assignedEmail || '',
        assignedName: row.assignedName || '',
        assignedDepartment: row.assignedDepartment || '',
      };
      if (!branchPreSelected) {
        rowData.branch = row.branch || '';
      }
      const dataRow = worksheet.addRow(rowData);

      // Highlight the entire row in light red
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' } // Light red
        };
      });

      // Make errors column red text
      const errorCell = dataRow.getCell(1);
      errorCell.font = { color: { argb: 'FFDC2626' }, bold: true };
    });

    // Add instructions sheet
    const instructionsSheet = workbook.addWorksheet('How to Fix');
    instructionsSheet.columns = [{ width: 80 }];
    
    instructionsSheet.mergeCells('A1:A1');
    instructionsSheet.getCell('A1').value = 'HOW TO FIX UPLOAD ERRORS';
    instructionsSheet.getCell('A1').font = { bold: true, size: 14 };
    instructionsSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }
    };
    instructionsSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };

    const instructions = [
      '',
      '1. Review the "Errors to Fix" sheet - each row shows what\'s wrong',
      '2. The ERRORS column tells you exactly what needs to be fixed',
      '3. Fix the issues in your original spreadsheet',
      '4. Delete the ERRORS column from your file (or use your original)',
      '5. Re-upload the corrected file',
      '',
      'COMMON ERRORS:',
      '• "Serial number is required" - Add a unique serial number (min 5 characters)',
      '• "Brand is required" - Add the device manufacturer (Dell, HP, Lenovo, etc.)',
      '• "Model is required" - Add the model name/number',
      '• "Duplicate serial number in file" - Each serial number must be unique',
      '• "Invalid email format" - Check the email address is valid',
      '',
      'TIPS:',
      '• Download a fresh template if you\'re unsure about the format',
      '• Required columns: serialNumber, brand, model',
      '• Other columns are optional',
    ];

    instructions.forEach((text, index) => {
      instructionsSheet.getCell(`A${index + 2}`).value = text;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecotribe-upload-errors-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Partial success state — some assets created, some failed
  if (uploadStatus === 'partial') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
      >
        <div className="py-12 px-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 border border-amber-400/30 bg-amber-400/10 flex items-center justify-center mx-auto mb-6"
            >
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </motion.div>

            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase tracking-tight mb-3">
              Partial Upload
            </h2>

            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <p className="font-brand font-bold text-3xl text-emerald-400">{serverCreatedCount}</p>
                <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Created</p>
              </div>
              <div className="text-center">
                <p className="font-brand font-bold text-3xl text-red-400">{serverErrors.length}</p>
                <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Failed</p>
              </div>
            </div>
          </div>

          {/* Server errors list */}
          <div className="border border-red-500/20 bg-red-500/5 mb-8">
            <div className="p-4 border-b border-red-500/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="font-display font-bold text-sm text-red-400 uppercase tracking-wide">
                  Failed Assets ({serverErrors.length})
                </p>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
              {serverErrors.map((err, idx) => (
                <div key={idx} className="p-2 border border-red-500/10 bg-red-500/5">
                  <p className="font-mono text-xs">
                    <span className="text-zinc-400">{err.serial_number}:</span>{' '}
                    <span className="text-red-400">{err.error}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="interactive px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Another
            </button>
            <button
              onClick={onCancel}
              className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              View Assets
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

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
            Upload Successful
          </h2>

          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="font-brand font-bold text-3xl text-ecotribe-primary">{validRows.length}</p>
              <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Assets Added</p>
            </div>
            {uniqueUsers.size > 0 && (
              <div className="text-center">
                <p className="font-brand font-bold text-3xl text-blue-400">{uniqueUsers.size}</p>
                <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest">Users Assigned</p>
              </div>
            )}
          </div>

          {uniqueUsers.size > 0 && (
            <p className="font-mono text-xs text-zinc-500 mb-6">
              Sub-users will receive email invitations to check-in their assigned devices
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="interactive px-6 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Another
            </button>
            <button
              onClick={onCancel}
              className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              View Assets
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
                  id="csv-upload"
                />

                <div className={`w-16 h-16 border flex items-center justify-center mx-auto mb-6 ${
                  dragActive ? 'border-ecotribe-primary/30 bg-ecotribe-primary/10' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                }`}>
                  <Upload className={`w-8 h-8 ${dragActive ? 'text-ecotribe-primary' : 'text-zinc-600'}`} />
                </div>

                <h3 className="font-display font-bold text-lg text-black dark:text-white uppercase tracking-wide mb-2">
                  {dragActive ? 'Drop your file here' : 'Upload Asset Data'}
                </h3>
                <p className="font-mono text-xs text-zinc-600 mb-6">
                  Drag and drop your CSV or Excel file, or click to browse
                </p>

                <div className="flex flex-col items-center gap-4">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="interactive inline-flex items-center gap-2 px-8 py-3 bg-ecotribe-primary text-black font-mono font-bold text-sm uppercase tracking-widest hover:bg-white transition-all">
                      <FileSpreadsheet className="w-5 h-5" />
                      Select CSV or Excel File
                    </span>
                  </label>

                  {branchRequired ? (
                    <p className="font-mono text-xs text-amber-500">
                      Select a branch above to enable template download and upload
                    </p>
                  ) : (
                    <p className="font-mono text-xs text-zinc-500">
                      Need a template? Download{' '}
                      <button
                        onClick={(e) => { e.preventDefault(); downloadExcelTemplate(); }}
                        className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                      >
                        Excel (with dropdowns)
                      </button>
                      {' '}or{' '}
                      <button
                        onClick={(e) => { e.preventDefault(); downloadTemplate(); }}
                        className="text-zinc-400 hover:text-slate-900 dark:hover:text-white underline underline-offset-2 transition-colors"
                      >
                        CSV
                      </button>
                    </p>
                  )}
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
          <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Parsing CSV file...</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 border-l border-t border-slate-200 dark:border-white/10">
              <div className="p-5 border-r border-b border-slate-200 dark:border-white/10 bg-emerald-500/5">
                <div className="flex items-center justify-between mb-2">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="font-brand font-bold text-2xl text-emerald-400">{validRows.length}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Valid Assets</p>
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
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${uniqueUsers.size > 0 ? 'bg-blue-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Users className={`w-4 h-4 ${uniqueUsers.size > 0 ? 'text-blue-400' : 'text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${uniqueUsers.size > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>{uniqueUsers.size}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Users</p>
              </div>
              <div className={`p-5 border-r border-b border-slate-200 dark:border-white/10 ${rowsWithUsers.length > 0 ? 'bg-blue-500/5' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <Mail className={`w-4 h-4 ${rowsWithUsers.length > 0 ? 'text-blue-400' : 'text-zinc-600'}`} />
                </div>
                <p className={`font-brand font-bold text-2xl ${rowsWithUsers.length > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>{rowsWithUsers.length}</p>
                <p className="font-mono font-bold text-[9px] text-zinc-600 uppercase tracking-widest">Pre-Assigned</p>
              </div>
            </div>

            {/* Column Mapping */}
            <div className="p-5 border-t border-slate-200 dark:border-white/10">
              <p className="font-mono font-bold text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Detected Columns</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(columnMapping).map(([field, original]) => (
                  <span key={field} className="px-2 py-1 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs font-mono">
                    <span className="text-zinc-600">{original}</span>
                    <span className="text-zinc-700 mx-1">→</span>
                    <span className={USER_COLUMNS.includes(field) ? 'text-blue-400' : 'text-ecotribe-primary'}>{field}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* User Assignment Info */}
          {uniqueUsers.size > 0 && (
            <div className="border border-blue-400/20 bg-blue-400/5 p-5">
              <div className="flex gap-4">
                <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide mb-2">
                    {uniqueUsers.size} Employee{uniqueUsers.size > 1 ? 's' : ''} Will Be Invited
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(uniqueUsers).slice(0, 5).map(email => (
                      <span key={email} className="px-2 py-1 border border-blue-400/20 bg-blue-400/10 text-blue-400 text-xs font-mono">
                        {email}
                      </span>
                    ))}
                    {uniqueUsers.size > 5 && (
                      <span className="px-2 py-1 border border-blue-400/20 bg-blue-400/10 text-blue-400 text-xs font-mono">
                        +{uniqueUsers.size - 5} more
                      </span>
                    )}
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
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Serial</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Device</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Branch</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Specs</th>
                          <th className="text-left py-3 px-5 font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest">Assigned To</th>
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
                            <td className="py-3 px-5 font-mono text-xs text-zinc-400">
                              {row.serialNumber || '-'}
                            </td>
                            <td className="py-3 px-5">
                              <p className="font-display text-sm text-black dark:text-white">{row.brand || '-'}</p>
                              <p className="font-mono text-xs text-zinc-600">{row.model || '-'}</p>
                            </td>
                            <td className="py-3 px-5">
                              {row.branch ? (
                                <span className="px-2 py-0.5 border border-lime-500/20 bg-lime-500/10 text-lime-400 text-[10px] font-mono">
                                  {row.branch}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-red-400">Missing</span>
                              )}
                            </td>
                            <td className="py-3 px-5 font-mono text-xs text-zinc-600">
                              {[row.processor, row.ram, row.storage].filter(Boolean).join(' • ') || '-'}
                            </td>
                            <td className="py-3 px-5">
                              {row.assignedEmail ? (
                                <div>
                                  <p className="font-mono text-xs text-blue-400">{row.assignedEmail}</p>
                                  {row.assignedName && <p className="font-mono text-xs text-zinc-600">{row.assignedName}</p>}
                                </div>
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

          {/* Error Details */}
          {invalidRows.length > 0 && (
            <div className="border border-red-500/20 bg-red-500/5">
              <div className="p-5 border-b border-red-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h2 className="font-display font-bold text-sm text-red-400 uppercase tracking-wide">Errors ({invalidRows.length})</h2>
                </div>
                <button
                  onClick={downloadErrorsSheet}
                  className="interactive flex items-center gap-2 px-4 py-2 border border-red-500/20 bg-red-500/10 text-red-400 font-mono font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  Download Errors
                </button>
              </div>
              <div className="p-5 space-y-3 max-h-48 overflow-y-auto">
                {invalidRows.slice(0, 5).map((row, index) => (
                  <div
                    key={index}
                    className="p-3 border border-red-500/10 bg-red-500/5"
                  >
                    <p className="font-mono font-bold text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                      Row: {row.serialNumber || '(empty serial)'}
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
              <div className="p-4 border-t border-red-500/10 bg-red-500/5">
                <p className="font-mono text-xs text-zinc-500">
                  💡 <span className="text-red-400">Download the errors sheet</span>, fix the issues in your spreadsheet, then re-upload.
                </p>
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
                <Upload className="w-4 h-4" />
              )}
              Upload {validRows.length} Assets
              {uniqueUsers.size > 0 && ` + ${uniqueUsers.size} Users`}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default CSVUpload;
