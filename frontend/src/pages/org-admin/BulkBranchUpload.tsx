/**
 * Bulk Branch Upload Page - Org Admin Portal
 * V3.2: Upload CSV/Excel to create multiple branches with optional IT Admin creation
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  X,
  Eye,
  EyeOff,
  Copy,
  Check
} from 'lucide-react';
import Papa from 'papaparse';
import { useAuth, useBulkCreateBranches } from '@/hooks';
import { PageHeader, Badge } from '@/components/ui';
import { text, iconSize } from '@/lib/design-tokens';
import { validateBranchCode } from '@/lib/validation';

interface ParsedRow {
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  it_admin_email?: string;
  it_admin_name?: string;
}

interface ValidationResult {
  row: number;
  data: ParsedRow;
  errors: string[];
  warnings: string[];
}

interface UploadResult {
  branch_name: string;
  branch_code: string;
  success: boolean;
  error?: string;
  it_admin_created?: boolean;
  generated_password?: string;
}

export function BulkBranchUpload() {
  const navigate = useNavigate();
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const [step, setStep] = useState<'upload' | 'validate' | 'result'>('upload');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const bulkCreate = useBulkCreateBranches();

  // Download template (Excel with Instructions sheet)
  const downloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Branch Data');

    // Add headers
    worksheet.columns = [
      { header: 'branch_name', key: 'branch_name', width: 20 },
      { header: 'branch_code', key: 'branch_code', width: 15 },
      { header: 'address_line1', key: 'address_line1', width: 25 },
      { header: 'address_line2', key: 'address_line2', width: 20 },
      { header: 'city', key: 'city', width: 15 },
      { header: 'state', key: 'state', width: 15 },
      { header: 'pin_code', key: 'pin_code', width: 12 },
      { header: 'site_contact_person', key: 'site_contact_person', width: 20 },
      { header: 'site_contact_phone', key: 'site_contact_phone', width: 18 },
      { header: 'operating_hours', key: 'operating_hours', width: 20 },
      { header: 'it_admin_email', key: 'it_admin_email', width: 25 },
      { header: 'it_admin_name', key: 'it_admin_name', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };

    // Add example rows
    worksheet.addRow({
      branch_name: 'Mumbai HQ',
      branch_code: 'MUMHQ',
      address_line1: '123 Tech Park',
      address_line2: 'Building A',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      site_contact_person: 'John Doe',
      site_contact_phone: '9876543210',
      operating_hours: 'Mon-Fri 9AM-6PM',
      it_admin_email: 'it.mumbai@company.com',
      it_admin_name: 'IT Admin Mumbai',
    });

    worksheet.addRow({
      branch_name: 'Bangalore Tech Center',
      branch_code: 'BLRTC',
      address_line1: '456 Innovation Hub',
      address_line2: '',
      city: 'Bangalore',
      state: 'Karnataka',
      pin_code: '560001',
      site_contact_person: 'Priya Sharma',
      site_contact_phone: '9876543211',
      operating_hours: 'Mon-Sat 9AM-7PM',
      it_admin_email: '',
      it_admin_name: '',
    });

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
    instructionsSheet.getCell('A1').value = 'BRANCH BULK UPLOAD TEMPLATE - INSTRUCTIONS';
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
      ['branch_name', 'YES', 'Unique name for the branch location', 'Mumbai HQ, Bangalore Office'],
      ['branch_code', 'YES', 'Short unique code (3-10 chars, uppercase letters/numbers)', 'MUMHQ, BLRTC, DEL01'],
      ['address_line1', 'YES', 'Primary street address', '123 Tech Park, 456 Main Street'],
      ['address_line2', 'No', 'Additional address info (building, floor, etc)', 'Building A, Floor 2'],
      ['city', 'YES', 'City name', 'Mumbai, Bangalore, Delhi'],
      ['state', 'YES', 'State name', 'Maharashtra, Karnataka, Delhi'],
      ['pin_code', 'YES', 'Indian postal code (6 digits)', '400001, 560001, 110001'],
      ['site_contact_person', 'No', 'Name of local contact at branch', 'John Doe, Priya Sharma'],
      ['site_contact_phone', 'No', 'Phone number (10 digits)', '9876543210'],
      ['operating_hours', 'No', 'Business hours for pickups', 'Mon-Fri 9AM-6PM'],
      ['it_admin_email', 'No', 'Email for IT Admin (creates new account if needed)', 'it.admin@company.com'],
      ['it_admin_name', 'No', 'Name of IT Admin (required if email provided)', 'IT Admin Name']
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
    const tipsStartRow = 18;
    instructionsSheet.mergeCells(`A${tipsStartRow}:D${tipsStartRow}`);
    instructionsSheet.getCell(`A${tipsStartRow}`).value = 'IMPORTANT NOTES';
    instructionsSheet.getCell(`A${tipsStartRow}`).font = { bold: true, size: 12 };
    instructionsSheet.getCell(`A${tipsStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' }
    };

    const tips = [
      '1. Delete the example rows (rows 2-3) before uploading your data',
      '2. Branch codes must be unique within your organization',
      '3. PIN codes must be exactly 6 digits',
      '4. If IT Admin email is provided, a new account will be created',
      '5. IT Admin passwords are auto-generated and shown after upload',
      '6. Branches without IT Admin will have "needs_admin" status',
      '7. You can assign IT Admins later via the IT Admin management page'
    ];

    tips.forEach((tip, index) => {
      instructionsSheet.mergeCells(`A${tipsStartRow + 1 + index}:D${tipsStartRow + 1 + index}`);
      instructionsSheet.getCell(`A${tipsStartRow + 1 + index}`).value = tip;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ecotribe-branches-template.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Handle file upload (supports both CSV and Excel)
  const handleFile = useCallback(async (file: File) => {
    setIsValidating(true);
    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      alert('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      setIsValidating(false);
      return;
    }

    if (isCSV) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const data = results.data as ParsedRow[];
          setParsedData(data);

          // Validate each row
          const validations = await validateRows(data, enterpriseId);
          setValidationResults(validations);

          setStep('validate');
          setIsValidating(false);
        },
        error: () => {
          setIsValidating(false);
          alert('Failed to parse file. Please ensure it is a valid CSV file.');
        },
      });
    } else {
      // Parse Excel file
      try {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          alert('No worksheet found in Excel file');
          setIsValidating(false);
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

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        const columnCount = 12; // Number of columns in our template

        for (let col = 1; col <= columnCount; col++) {
          headers.push(getCellText(headerRow.getCell(col)));
        }

        // Parse data rows
        const data: ParsedRow[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const rowData: Record<string, string> = {};
          for (let col = 1; col <= columnCount; col++) {
            const header = headers[col - 1];
            if (header) {
              rowData[header] = getCellText(row.getCell(col));
            }
          }

          // Skip empty rows
          if (Object.values(rowData).some(v => v.trim() !== '')) {
            data.push(rowData as unknown as ParsedRow);
          }
        });

        setParsedData(data);

        // Validate each row
        const validations = await validateRows(data, enterpriseId);
        setValidationResults(validations);

        setStep('validate');
        setIsValidating(false);
      } catch (error) {
        setIsValidating(false);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx file.');
      }
    }
  }, [enterpriseId]);

  // Validate rows via REST API
  const validateRows = async (data: ParsedRow[], entId: string): Promise<ValidationResult[]> => {
    const { branchesApi } = await import('@/lib/api/branches');
    const { usersApi } = await import('@/lib/api/users');
    const results: ValidationResult[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields
      if (!row.branch_name?.trim()) errors.push('Branch name is required');
      if (!row.branch_code?.trim()) errors.push('Branch code is required');
      if (!row.address_line1?.trim()) errors.push('Address line 1 is required');
      if (!row.city?.trim()) errors.push('City is required');
      if (!row.state?.trim()) errors.push('State is required');
      if (!row.pin_code?.trim()) errors.push('PIN code is required');

      // Branch code format validation
      if (row.branch_code) {
        const code = row.branch_code.toUpperCase().trim();
        const codeValidation = validateBranchCode(code);
        if (!codeValidation.valid) {
          errors.push(codeValidation.error || 'Invalid branch code');
        }

        // Check for duplicates within file
        if (seenCodes.has(code)) {
          errors.push('Duplicate branch code in file');
        }
        seenCodes.add(code);

        // Check against database via REST API
        try {
          const response = await branchesApi.checkCodeExists(entId, code);
          if (response.data?.exists) {
            errors.push('Branch code already exists');
          }
        } catch {
          // Ignore check errors - will be caught during actual upload
        }
      }

      // PIN code validation
      if (row.pin_code && !/^\d{6}$/.test(row.pin_code.trim())) {
        errors.push('PIN code must be 6 digits');
      }

      // Email validation
      if (row.it_admin_email) {
        const email = row.it_admin_email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push('Invalid IT admin email format');
        } else {
          // Check if IT admin email exists via REST API
          try {
            const response = await usersApi.list({
              enterprise_id: entId,
              role: 'it_admin',
              search: email,
              limit: 1,
            });
            const users = response.data || [];
            const exactMatch = Array.isArray(users) && users.some(u => u.email.toLowerCase() === email);
            if (!exactMatch) {
              warnings.push('IT Admin will be created (new account)');
            }
          } catch {
            warnings.push('Could not verify IT Admin email');
          }
        }
      } else {
        warnings.push('No IT Admin - branch will have "needs_admin" status');
      }

      results.push({
        row: i + 2, // Excel row (1-indexed + header)
        data: row,
        errors,
        warnings,
      });
    }

    return results;
  };

  // Handle upload
  const handleUpload = async () => {
    const validRows = validationResults.filter(v => v.errors.length === 0);

    if (validRows.length === 0) {
      alert('No valid rows to upload');
      return;
    }

    const inputs = validRows.map(v => ({
      enterprise_id: enterpriseId,
      branch_name: v.data.branch_name.trim(),
      branch_code: v.data.branch_code.toUpperCase().trim(),
      address_line1: v.data.address_line1.trim(),
      address_line2: v.data.address_line2?.trim() || '',
      city: v.data.city.trim(),
      state: v.data.state.trim(),
      pin_code: v.data.pin_code.trim(),
      site_contact_person: v.data.site_contact_person?.trim() || '',
      site_contact_phone: v.data.site_contact_phone?.trim() || '',
      operating_hours: v.data.operating_hours?.trim() || '',
      it_admin_email: v.data.it_admin_email?.trim() || '',
      it_admin_name: v.data.it_admin_name?.trim() || '',
    }));

    try {
      const result = await bulkCreate.mutateAsync(inputs);

      // Map results back to inputs by index
      const createdCodes = new Set(
        (result.created || []).map((r: any) => r.branch_code)
      );
      const errorsByIndex = new Map(
        (result.errors || []).map((e: any) => [e.index, e.error])
      );

      const uploadResults = inputs.map((input, index) => {
        const isSuccess = createdCodes.has(input.branch_code);
        const errorMsg = errorsByIndex.get(index);

        return {
          branch_name: input.branch_name,
          branch_code: input.branch_code,
          success: isSuccess,
          error: errorMsg,
          it_admin_created: false,
          generated_password: undefined,
        } as UploadResult;
      });

      setUploadResults(uploadResults);
      setStep('result');
    } catch (error) {
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Download results
  const downloadResults = () => {
    const data = uploadResults.map(r => ({
      branch_name: r.branch_name,
      branch_code: r.branch_code,
      status: r.success ? 'Success' : 'Failed',
      error: r.error || '',
      it_admin_created: r.it_admin_created ? 'Yes' : 'No',
      generated_password: r.generated_password || '',
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `branch_upload_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Download errors as Excel sheet for easy fixing
  const downloadErrorsSheet = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EcoTribe';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Errors to Fix');

    // Define columns - same as template plus Errors column at the beginning
    worksheet.columns = [
      { header: 'ERRORS (Fix these issues)', key: 'errors', width: 45 },
      { header: 'branch_name', key: 'branch_name', width: 20 },
      { header: 'branch_code', key: 'branch_code', width: 15 },
      { header: 'address_line1', key: 'address_line1', width: 25 },
      { header: 'address_line2', key: 'address_line2', width: 20 },
      { header: 'city', key: 'city', width: 15 },
      { header: 'state', key: 'state', width: 15 },
      { header: 'pin_code', key: 'pin_code', width: 12 },
      { header: 'site_contact_person', key: 'site_contact_person', width: 20 },
      { header: 'site_contact_phone', key: 'site_contact_phone', width: 18 },
      { header: 'operating_hours', key: 'operating_hours', width: 20 },
      { header: 'it_admin_email', key: 'it_admin_email', width: 25 },
      { header: 'it_admin_name', key: 'it_admin_name', width: 20 },
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
    const rowsWithErrors = validationResults.filter(v => v.errors.length > 0);
    rowsWithErrors.forEach((result) => {
      const dataRow = worksheet.addRow({
        errors: result.errors.join('; '),
        branch_name: result.data.branch_name || '',
        branch_code: result.data.branch_code || '',
        address_line1: result.data.address_line1 || '',
        address_line2: result.data.address_line2 || '',
        city: result.data.city || '',
        state: result.data.state || '',
        pin_code: result.data.pin_code || '',
        site_contact_person: result.data.site_contact_person || '',
        site_contact_phone: result.data.site_contact_phone || '',
        operating_hours: result.data.operating_hours || '',
        it_admin_email: result.data.it_admin_email || '',
        it_admin_name: result.data.it_admin_name || '',
      });

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
    
    instructionsSheet.getCell('A1').value = 'HOW TO FIX UPLOAD ERRORS';
    instructionsSheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    instructionsSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }
    };

    const instructions = [
      '',
      '1. Review the "Errors to Fix" sheet - each row shows what\'s wrong',
      '2. The ERRORS column tells you exactly what needs to be fixed',
      '3. Fix the issues in your original spreadsheet',
      '4. Delete the ERRORS column from your file (or use your original)',
      '5. Re-upload the corrected file',
      '',
      'COMMON ERRORS:',
      'â€¢ "Branch name is required" - Add a unique branch name',
      'â€¢ "Branch code is required" - Add a code (3-10 characters, uppercase)',
      'â€¢ "Branch code already exists" - Use a different unique code',
      'â€¢ "Duplicate branch code in file" - Each code must be unique',
      'â€¢ "PIN code must be 6 digits" - Use a valid 6-digit PIN code',
      'â€¢ "Invalid IT admin email format" - Check the email address',
      '',
      'REQUIRED FIELDS:',
      'â€¢ branch_name, branch_code, address_line1, city, state, pin_code',
      '',
      'OPTIONAL FIELDS:',
      'â€¢ address_line2, site_contact_person, site_contact_phone, operating_hours',
      'â€¢ it_admin_email, it_admin_name (if provided, IT Admin account will be created)',
    ];

    instructions.forEach((text, index) => {
      instructionsSheet.getCell(`A${index + 2}`).value = text;
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `branch-upload-errors-${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Copy password to clipboard
  const copyPassword = (password: string, index: number) => {
    navigator.clipboard.writeText(password);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Stats
  const errorCount = validationResults.filter(v => v.errors.length > 0).length;
  const warningCount = validationResults.filter(v => v.warnings.length > 0 && v.errors.length === 0).length;
  const validCount = validationResults.filter(v => v.errors.length === 0).length;
  const successCount = uploadResults.filter(r => r.success).length;
  const failedCount = uploadResults.filter(r => !r.success).length;
  const newAdminsCount = uploadResults.filter(r => r.it_admin_created).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Organization"
        title="Bulk Branch Upload"
        subtitle="Upload CSV file to create multiple branches at once"
        action={
          <button
            type="button"
            onClick={() => navigate('/org-admin/branches')}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className={iconSize.md} />
            Back to Branches
          </button>
        }
      />

      {/* Step: Upload */}
      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Template Download */}
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-6">
            <h3 className={`font-display font-bold text-lg mb-4 ${text.primary}`}>Step 1: Download Template</h3>
            <p className={`text-sm mb-4 ${text.muted}`}>
              Download the CSV template and fill in your branch data. Required fields are marked in the template.
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm uppercase tracking-wider transition-all"
            >
              <Download className={iconSize.md} />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-6">
            <h3 className={`font-display font-bold text-lg mb-4 ${text.primary}`}>Step 2: Upload File</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-lime-500 bg-lime-500/5'
                  : 'border-slate-300 dark:border-zinc-700 hover:border-lime-500/50'
              }`}
            >
              {isValidating ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 animate-spin text-lime-500 mb-4" />
                  <p className={`font-medium ${text.primary}`}>Validating file...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
                  <p className={`font-medium mb-2 ${text.primary}`}>
                    Drag and drop your CSV file here
                  </p>
                  <p className={`text-sm mb-4 ${text.muted}`}>or</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm uppercase tracking-wider cursor-pointer transition-all">
                    <Upload className={iconSize.md} />
                    Browse Files
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Validate */}
      {step === 'validate' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className={`font-brand text-2xl font-bold ${text.primary}`}>{validCount}</p>
                  <p className={`text-xs ${text.muted}`}>Valid Rows</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className={`font-brand text-2xl font-bold ${text.primary}`}>{warningCount}</p>
                  <p className={`text-xs ${text.muted}`}>With Warnings</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className={`font-brand text-2xl font-bold ${text.primary}`}>{errorCount}</p>
                  <p className={`text-xs ${text.muted}`}>With Errors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Results */}
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className={`font-display font-bold ${text.primary}`}>Validation Results</h3>
              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={downloadErrorsSheet}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 font-semibold text-xs uppercase tracking-wider transition-all"
                >
                  <Download className={iconSize.sm} />
                  Download Errors
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-96 overflow-auto">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`px-5 py-3 ${
                    result.errors.length > 0
                      ? 'bg-red-50 dark:bg-red-500/5'
                      : result.warnings.length > 0
                      ? 'bg-amber-50 dark:bg-amber-500/5'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-sm ${text.primary}`}>
                      Row {result.row}: {result.data.branch_name} ({result.data.branch_code})
                    </span>
                    {result.errors.length > 0 ? (
                      <Badge variant="error" size="sm">Errors</Badge>
                    ) : result.warnings.length > 0 ? (
                      <Badge variant="warning" size="sm">Warnings</Badge>
                    ) : (
                      <Badge variant="success" size="sm">Valid</Badge>
                    )}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.errors.map((error, i) => (
                        <span key={i} className="text-xs text-red-600 dark:text-red-400">
                          {error}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.warnings.length > 0 && result.errors.length === 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.warnings.map((warning, i) => (
                        <span key={i} className="text-xs text-amber-600 dark:text-amber-400">
                          {warning}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Helper */}
          {errorCount > 0 && (
            <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className={`font-medium text-red-700 dark:text-red-400 text-sm`}>
                    {errorCount} row{errorCount > 1 ? 's have' : ' has'} errors that need to be fixed
                  </p>
                  <p className={`text-xs text-red-600/70 dark:text-red-400/70 mt-1`}>
                    ðŸ’¡ Click <strong>"Download Errors"</strong> above to get an Excel file with all errors. Fix the issues in your original file, then re-upload.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className={iconSize.md} />
              Back
            </button>
            <div className="flex items-center gap-3">
              {errorCount > 0 && validCount > 0 && (
                <p className={`text-xs ${text.muted}`}>
                  {validCount} valid rows will be uploaded
                </p>
              )}
              <button
                type="button"
                onClick={handleUpload}
                disabled={validCount === 0 || bulkCreate.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold text-sm uppercase tracking-wider transition-all"
              >
                {bulkCreate.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Upload {validCount} Branches
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Result */}
      {step === 'result' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className={`font-brand text-2xl font-bold ${text.primary}`}>{successCount}</p>
                  <p className={`text-xs ${text.muted}`}>Branches Created</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className={`font-brand text-2xl font-bold ${text.primary}`}>{newAdminsCount}</p>
                  <p className={`text-xs ${text.muted}`}>IT Admins Created</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className={`font-brand text-2xl font-bold ${text.primary}`}>{failedCount}</p>
                  <p className={`text-xs ${text.muted}`}>Failed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Passwords Alert */}
          {newAdminsCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className={`font-medium text-amber-800 dark:text-amber-200`}>
                    Important: Save IT Admin Passwords
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {newAdminsCount} IT Admin account(s) were created with generated passwords.
                    Please download the results CSV or copy the passwords below. They cannot be retrieved later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className={`font-display font-bold ${text.primary}`}>Upload Results</h3>
              {newAdminsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className={`flex items-center gap-2 text-sm ${text.muted} hover:${text.primary}`}
                >
                  {showPasswords ? <EyeOff className={iconSize.sm} /> : <Eye className={iconSize.sm} />}
                  {showPasswords ? 'Hide' : 'Show'} Passwords
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-96 overflow-auto">
              {uploadResults.map((result, index) => (
                <div
                  key={index}
                  className={`px-5 py-3 ${
                    !result.success ? 'bg-red-50 dark:bg-red-500/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-medium text-sm ${text.primary}`}>
                        {result.branch_name} ({result.branch_code})
                      </span>
                      {result.it_admin_created && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="info" size="sm">New IT Admin</Badge>
                          {result.generated_password && (
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-mono ${text.muted}`}>
                                {showPasswords ? result.generated_password : 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyPassword(result.generated_password!, index)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-400" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {result.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{result.error}</p>
                      )}
                    </div>
                    {result.success ? (
                      <Badge variant="success" size="sm">Success</Badge>
                    ) : (
                      <Badge variant="error" size="sm">Failed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/org-admin/branches')}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className={iconSize.md} />
              Back to Branches
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={downloadResults}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/50 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider transition-all"
              >
                <Download className={iconSize.md} />
                Download Results
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setParsedData([]);
                  setValidationResults([]);
                  setUploadResults([]);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm uppercase tracking-wider transition-all"
              >
                <Upload className={iconSize.md} />
                Upload More
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default BulkBranchUpload;
