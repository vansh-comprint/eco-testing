/**
 * Bulk Branch Upload Page - Org Admin Portal
 * V3.4: Upload CSV/Excel to create multiple branches. New IT Admins auto-created with temp password.
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
  Info,
} from 'lucide-react';
import Papa from 'papaparse';
import { useAuth, useBulkCreateBranches } from '@/hooks';
import { PageHeader, Badge } from '@/components/ui';
import { text, iconSize } from '@/lib/design-tokens';
import { validateBranchCode, indianStates } from '@/lib/validation';

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
  opening_day?: string;
  closing_day?: string;
  opening_time?: string;
  closing_time?: string;
  pickup_point_description?: string;
  special_instructions?: string;
  it_admin_email?: string;
}

interface ValidationResult {
  row: number;
  data: ParsedRow;
  errors: string[];
  warnings: string[];
  infos: string[];
}

interface UploadResult {
  branch_name: string;
  branch_code: string;
  success: boolean;
  error?: string;
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
  const [newITAdminEmails, setNewITAdminEmails] = useState<Set<string>>(new Set());

  const bulkCreate = useBulkCreateBranches();

  // indianStates used for runtime validation (see validateRows below)

  // Download template (Excel with Instructions sheet and state dropdown)
  const downloadTemplate = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Branch Data');

    // Add headers — 4 structured day/time columns replace the old operating_hours free-text column
    // it_admin_name removed (IT Admin must already exist)
    // Columns: A=branch_name B=branch_code C=address_line1 D=address_line2 E=city F=state G=pin_code
    //          H=site_contact_person I=site_contact_phone
    //          J=opening_day K=closing_day L=opening_time M=closing_time
    //          N=pickup_point_description O=special_instructions P=it_admin_email
    worksheet.columns = [
      { header: 'branch_name', key: 'branch_name', width: 20 },
      { header: 'branch_code', key: 'branch_code', width: 15 },
      { header: 'address_line1', key: 'address_line1', width: 25 },
      { header: 'address_line2', key: 'address_line2', width: 20 },
      { header: 'city', key: 'city', width: 15 },
      { header: 'state', key: 'state', width: 18 },
      { header: 'pin_code', key: 'pin_code', width: 12 },
      { header: 'site_contact_person', key: 'site_contact_person', width: 20 },
      { header: 'site_contact_phone', key: 'site_contact_phone', width: 18 },
      { header: 'opening_day', key: 'opening_day', width: 15 },
      { header: 'closing_day', key: 'closing_day', width: 15 },
      { header: 'opening_time', key: 'opening_time', width: 15 },
      { header: 'closing_time', key: 'closing_time', width: 15 },
      { header: 'pickup_point_description', key: 'pickup_point_description', width: 28 },
      { header: 'special_instructions', key: 'special_instructions', width: 28 },
      { header: 'it_admin_email', key: 'it_admin_email', width: 28 },
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
      opening_day: 'Monday',
      closing_day: 'Friday',
      opening_time: '09:00',
      closing_time: '18:00',
      pickup_point_description: 'Main lobby, ground floor',
      special_instructions: 'Call before arriving',
      it_admin_email: 'it.mumbai@company.com',
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
      opening_day: 'Monday',
      closing_day: 'Saturday',
      opening_time: '09:00',
      closing_time: '19:00',
      pickup_point_description: '',
      special_instructions: '',
      it_admin_email: '',
    });

    // Add dropdown reference data via hidden sheet (inline formulas exceed Excel's 255-char limit)
    // Column A: States, Column B: Days, Column C: Times
    const statesSheet = workbook.addWorksheet('_States');
    statesSheet.state = 'veryHidden'; // Hidden from users, can't be unhidden via UI

    // Column A: Indian states
    indianStates.forEach((state, i) => {
      statesSheet.getCell(`A${i + 1}`).value = state;
    });

    // Column B: Days of the week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach((day, i) => {
      statesSheet.getCell(`B${i + 1}`).value = day;
    });

    // Column C: Times at 30-min intervals from 06:00 to 23:00
    const times: string[] = [];
    for (let h = 6; h <= 23; h++) {
      times.push(`${String(h).padStart(2, '0')}:00`);
      if (h < 23) times.push(`${String(h).padStart(2, '0')}:30`);
    }
    times.push('23:00');
    // Deduplicate (23:00 added in loop already if h===23 is excluded from :30)
    const uniqueTimes = [...new Set(times)];
    uniqueTimes.forEach((time, i) => {
      statesSheet.getCell(`C${i + 1}`).value = time;
    });

    const stateRange = `_States!$A$1:$A$${indianStates.length}`;
    const dayRange = `_States!$B$1:$B$${days.length}`;
    const timeRange = `_States!$C$1:$C$${uniqueTimes.length}`;

    // Apply validation to rows 2-1000 (header is row 1)
    // Columns: F=state, I=phone, J=opening_day, K=closing_day, L=opening_time, M=closing_time
    for (let row = 2; row <= 1000; row++) {
      // Force text format on time columns (L, M) to prevent Excel converting "09:00" to a time serial
      worksheet.getCell(`L${row}`).numFmt = '@';
      worksheet.getCell(`M${row}`).numFmt = '@';

      // Phone validation (column I) - numbers only, 7-15 digits (landline or mobile)
      worksheet.getCell(`I${row}`).numFmt = '@'; // Text format to prevent scientific notation
      worksheet.getCell(`I${row}`).dataValidation = {
        type: 'custom',
        allowBlank: true,
        formulae: [`AND(LEN(I${row})>=7,LEN(I${row})<=15,ISNUMBER(VALUE(I${row})))`],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Phone Number',
        error: 'Phone number should be 7-15 digits (numbers only).',
      };

      worksheet.getCell(`F${row}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [stateRange],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid State',
        error: 'Please select a valid Indian state from the dropdown.',
      };
      worksheet.getCell(`J${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [dayRange],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Day',
        error: 'Please select a valid day from the dropdown.',
      };
      worksheet.getCell(`K${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [dayRange],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Day',
        error: 'Please select a valid day from the dropdown.',
      };
      worksheet.getCell(`L${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [timeRange],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Time',
        error: 'Please select a valid time from the dropdown.',
      };
      worksheet.getCell(`M${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [timeRange],
        showErrorMessage: true,
        errorStyle: 'warning',
        errorTitle: 'Invalid Time',
        error: 'Please select a valid time from the dropdown.',
      };
    }

    // Create Instructions sheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { width: 28 },
      { width: 12 },
      { width: 55 },
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

    // Column instructions — 4 structured day/time columns replace the old operating_hours free-text column
    const columnInstructions = [
      ['branch_name', 'YES', 'Unique name for the branch location', 'Mumbai HQ, Bangalore Office'],
      ['branch_code', 'YES', 'Short unique code (1-10 chars, uppercase letters/numbers)', 'MUMHQ, BLRTC, DEL01'],
      ['address_line1', 'YES', 'Primary street address', '123 Tech Park, 456 Main Street'],
      ['address_line2', 'No', 'Additional address info (building, floor, etc)', 'Building A, Floor 2'],
      ['city', 'YES', 'City name', 'Mumbai, Bangalore, Delhi'],
      ['state', 'YES', 'State name — select from dropdown', 'Maharashtra, Karnataka, Delhi'],
      ['pin_code', 'YES', 'Indian postal code (6 digits)', '400001, 560001, 110001'],
      ['site_contact_person', 'No', 'Name of local contact at branch', 'John Doe, Priya Sharma'],
      ['site_contact_phone', 'No', 'Contact phone number (7-15 digits, numbers only)', '9876543210, 02212345678'],
      ['opening_day', 'No', 'Day the branch opens — select from dropdown', 'Monday'],
      ['closing_day', 'No', 'Last working day — select from dropdown', 'Saturday'],
      ['opening_time', 'No', 'Opening time in HH:MM format — select from dropdown', '09:00'],
      ['closing_time', 'No', 'Closing time in HH:MM format — select from dropdown', '18:00'],
      ['pickup_point_description', 'No', 'Where to go for pickup at this branch', 'Main lobby, ground floor'],
      ['special_instructions', 'No', 'Any special notes for pickup teams', 'Call before arriving'],
      ['it_admin_email', 'No', 'IT Admin email. If the email is not in the system, a new IT Admin account will be auto-created with a temporary password. Leave blank if not yet assigned.', 'it.admin@company.com'],
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

    // Add tips section — starts after 16 instruction rows (rows 4-19) + blank gap = row 22
    // (3 header rows + 16 instruction rows + 2 blank rows = row 22 for tips header)
    const tipsStartRow = 22;
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
      '4. If IT Admin email is new, the system will auto-create the IT Admin account with a temporary password (Password@123)',
      '5. Branches without an IT Admin assigned will have "needs_admin" status',
      '6. You can assign IT Admins later via the IT Admin management page',
      '7. Use the state column dropdown to select a valid Indian state',
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
          if (typeof cellValue === 'number') {
            // Excel stores times as fractional days (e.g., 0.375 = 09:00)
            // Detect time-range numbers and convert to HH:MM
            if (cellValue >= 0 && cellValue < 1) {
              const totalMinutes = Math.round(cellValue * 24 * 60);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
            return cellValue.toString();
          }
          if (typeof cellValue === 'boolean') return cellValue.toString();
          // Handle Date objects (Excel auto-converts "09:00" dropdown selections to Date)
          if (cellValue instanceof Date) {
            const hours = cellValue.getHours();
            const minutes = cellValue.getMinutes();
            // If date part is epoch (1899-12-30 or 1970-01-01), it's a time-only value
            if (cellValue.getFullYear() <= 1970) {
              return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
            // Otherwise return as ISO string
            return cellValue.toISOString();
          }
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
        // Support up to 17 columns (16 template columns + buffer)
        const columnCount = 17;

        for (let col = 1; col <= columnCount; col++) {
          const val = getCellText(headerRow.getCell(col));
          if (val) headers.push(val);
        }

        // Parse data rows
        const data: ParsedRow[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const rowData: Record<string, string> = {};
          for (let col = 1; col <= headers.length; col++) {
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
      } catch {
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
    const validStates = new Set(indianStates as unknown as string[]);
    const newAdminEmails = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors: string[] = [];
      const warnings: string[] = [];
      const infos: string[] = [];

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

        // Check against database via REST API — show error if check fails
        if (entId) {
          try {
            const response = await branchesApi.checkCodeExists(entId, code);
            if (response.data?.exists) {
              errors.push('Branch code already exists in your organization');
            }
          } catch (err) {
            warnings.push('Could not verify branch code — will be checked on upload');
          }
        }
      }

      // PIN code validation
      if (row.pin_code && !/^\d{6}$/.test(row.pin_code.trim())) {
        errors.push('PIN code must be 6 digits');
      }

      // Phone validation (basic - just digits, 7-15 length for landline/mobile)
      if (row.site_contact_phone?.trim()) {
        const digitsOnly = row.site_contact_phone.trim().replace(/\D/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          errors.push('Phone number must be 7-15 digits');
        }
      }

      // State validation against known Indian states
      if (row.state?.trim() && !validStates.has(row.state.trim())) {
        warnings.push(`"${row.state.trim()}" may not be a recognized Indian state`);
      }

      // IT Admin email validation
      if (row.it_admin_email) {
        const email = row.it_admin_email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push('Invalid IT Admin email format');
        } else {
          // Check if IT Admin email exists via REST API
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
              newAdminEmails.add(email);
              infos.push('New IT Admin — will be auto-created with temporary password');
            }
          } catch {
            warnings.push('Could not verify IT Admin email');
          }
        }
      } else {
        warnings.push('No IT Admin assigned — branch will have "needs_admin" status');
      }

      results.push({
        row: i + 2, // Excel row (1-indexed + header)
        data: row,
        errors,
        warnings,
        infos,
      });
    }

    setNewITAdminEmails(newAdminEmails);
    return results;
  };

  // Handle upload
  const handleUpload = async () => {
    const validRows = validationResults.filter(v => v.errors.length === 0);

    if (validRows.length === 0) {
      alert('No valid rows to upload');
      return;
    }

    // Step 1: Auto-create new IT admins before branch creation
    if (newITAdminEmails.size > 0) {
      const { usersApi } = await import('@/lib/api/users');
      const failedAdmins: string[] = [];

      for (const email of newITAdminEmails) {
        try {
          // Derive a display name from the email (part before @, cleaned up)
          const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
          const displayName = namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

          await usersApi.create({
            email,
            name: displayName,
            role: 'it_admin',
            password: 'Password@123',
            enterprise_id: enterpriseId,
          });
        } catch (err) {
          failedAdmins.push(email);
        }
      }

      if (failedAdmins.length > 0) {
        alert(`Failed to create IT Admin accounts for: ${failedAdmins.join(', ')}. Branches for these admins may fail.`);
      }
    }

    // Step 2: Build branch input data
    const dayShort: Record<string, string> = {
      Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
      Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
    };

    const inputs = validRows.map(v => {
      // Combine structured day/time fields into operating_hours string for backend
      // Format: "Mon-Sat 09:00 - 18:00"
      const od = v.data.opening_day?.trim() || '';
      const cd = v.data.closing_day?.trim() || '';
      const ot = v.data.opening_time?.trim() || '';
      const ct = v.data.closing_time?.trim() || '';
      const operating_hours = (od && cd && ot && ct)
        ? `${dayShort[od] || od}-${dayShort[cd] || cd} ${ot} - ${ct}`
        : '';

      return {
        enterprise_id: enterpriseId,
        branch_name: v.data.branch_name.trim(),
        branch_code: v.data.branch_code.toUpperCase().trim(),
        address_line1: v.data.address_line1.trim(),
        address_line2: v.data.address_line2?.trim() || '',
        city: v.data.city.trim(),
        state: v.data.state.trim(),
        pin_code: v.data.pin_code.trim(),
        site_contact_person: v.data.site_contact_person?.trim() || '',
        site_contact_phone: v.data.site_contact_phone?.trim() ? v.data.site_contact_phone.trim().replace(/\D/g, '').slice(-10) : '',
        operating_hours,
        pickup_point_description: v.data.pickup_point_description?.trim() || '',
        special_instructions: v.data.special_instructions?.trim() || '',
        it_admin_email: v.data.it_admin_email?.trim() || '',
      };
    });

    // Step 3: Create branches
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

    // Define columns — same as template plus Errors column at the beginning
    worksheet.columns = [
      { header: 'ERRORS (Fix these issues)', key: 'errors', width: 45 },
      { header: 'branch_name', key: 'branch_name', width: 20 },
      { header: 'branch_code', key: 'branch_code', width: 15 },
      { header: 'address_line1', key: 'address_line1', width: 25 },
      { header: 'address_line2', key: 'address_line2', width: 20 },
      { header: 'city', key: 'city', width: 15 },
      { header: 'state', key: 'state', width: 18 },
      { header: 'pin_code', key: 'pin_code', width: 12 },
      { header: 'site_contact_person', key: 'site_contact_person', width: 20 },
      { header: 'site_contact_phone', key: 'site_contact_phone', width: 18 },
      { header: 'opening_day', key: 'opening_day', width: 15 },
      { header: 'closing_day', key: 'closing_day', width: 15 },
      { header: 'opening_time', key: 'opening_time', width: 15 },
      { header: 'closing_time', key: 'closing_time', width: 15 },
      { header: 'pickup_point_description', key: 'pickup_point_description', width: 28 },
      { header: 'special_instructions', key: 'special_instructions', width: 28 },
      { header: 'it_admin_email', key: 'it_admin_email', width: 28 },
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
        opening_day: result.data.opening_day || '',
        closing_day: result.data.closing_day || '',
        opening_time: result.data.opening_time || '',
        closing_time: result.data.closing_time || '',
        pickup_point_description: result.data.pickup_point_description || '',
        special_instructions: result.data.special_instructions || '',
        it_admin_email: result.data.it_admin_email || '',
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
      '• "Branch name is required" - Add a unique branch name',
      '• "Branch code is required" - Add a code (1-10 characters, uppercase)',
      '• "Branch code already exists" - Use a different unique code',
      '• "Duplicate branch code in file" - Each code must be unique',
      '• "PIN code must be 6 digits" - Use a valid 6-digit PIN code',
      '• "Invalid IT Admin email format" - Check the email address',
      '',
      'REQUIRED FIELDS:',
      '• branch_name, branch_code, address_line1, city, state, pin_code',
      '',
      'OPTIONAL FIELDS:',
      '• address_line2, site_contact_person, site_contact_phone',
      '• opening_day, closing_day, opening_time, closing_time (use dropdowns in template)',
      '• pickup_point_description, special_instructions',
      '• it_admin_email (new emails will be auto-created as IT Admin)',
    ];

    instructions.forEach((textLine, index) => {
      instructionsSheet.getCell(`A${index + 2}`).value = textLine;
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

  // Stats
  const errorCount = validationResults.filter(v => v.errors.length > 0).length;
  const warningCount = validationResults.filter(v => v.warnings.length > 0 && v.errors.length === 0).length;
  const validCount = validationResults.filter(v => v.errors.length === 0).length;
  const successCount = uploadResults.filter(r => r.success).length;
  const failedCount = uploadResults.filter(r => !r.success).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Organization"
        title="Bulk Branch Upload"
        subtitle="Upload CSV or Excel file to create multiple branches at once"
        backLink
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
              Download the Excel template and fill in your branch data. Required fields are marked. The state column has a dropdown for valid Indian states.
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
                    Drag and drop your CSV or Excel file here
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
                      : result.infos.length > 0
                      ? 'bg-blue-50 dark:bg-blue-500/5'
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
                    ) : result.infos.length > 0 ? (
                      <Badge variant="info" size="sm">New Admin</Badge>
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
                  {result.infos.length > 0 && result.errors.length === 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.infos.map((info, i) => (
                        <span key={i} className="text-xs text-blue-600 dark:text-blue-400">
                          {info}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* New IT Admin Info Banner */}
          {newITAdminEmails.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className={`font-medium text-blue-700 dark:text-blue-400 text-sm`}>
                    {newITAdminEmails.size} new IT Admin{newITAdminEmails.size > 1 ? 's' : ''} will be auto-created
                  </p>
                  <p className={`text-xs text-blue-600/70 dark:text-blue-400/70 mt-1`}>
                    The following email{newITAdminEmails.size > 1 ? 's are' : ' is'} not in the system and will be registered as IT Admin with temporary password <strong>Password@123</strong>:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[...newITAdminEmails].map(email => (
                      <span key={email} className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-mono">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    Click <strong>"Download Errors"</strong> above to get an Excel file with all errors. Fix the issues in your original file, then re-upload.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Results Table */}
          <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
              <h3 className={`font-display font-bold ${text.primary}`}>Upload Results</h3>
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
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors"
            >
              <ArrowLeft className={iconSize.md} />
              <span className="text-xs font-mono font-bold uppercase tracking-widest">Back</span>
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
