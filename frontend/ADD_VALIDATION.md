# Enterprise Registration Validation - Restore Instructions

This file contains the full validation code that was simplified for testing.
To restore full validation, replace the `validateStep` function in `src/pages/auth/EnterpriseRegister.tsx`.

## Current Location
File: `src/pages/auth/EnterpriseRegister.tsx`
Function: `validateStep` (around line 184-223)

## Full Validation Code to Restore

Replace the simplified `validateStep` function with this full version:

```typescript
  // Validate step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.gstNumber.trim()) {
        newErrors.gstNumber = 'GST number is required';
      } else if (!validateGST(formData.gstNumber)) {
        newErrors.gstNumber = 'Invalid GST number format';
      }
      if (!formData.panNumber.trim()) {
        newErrors.panNumber = 'PAN number is required';
      } else if (!validatePAN(formData.panNumber)) {
        newErrors.panNumber = 'Invalid PAN number format';
      }
      if (!formData.industryType) newErrors.industryType = 'Industry type is required';
      if (!formData.companySize) newErrors.companySize = 'Company size is required';
      if (!formData.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.pinCode.trim()) newErrors.pinCode = 'PIN code is required';
      else if (!/^[1-9][0-9]{5}$/.test(formData.pinCode)) {
        newErrors.pinCode = 'Invalid PIN code';
      }
    }

    if (step === 2) {
      if (!formData.orgAdminName.trim()) newErrors.orgAdminName = 'Name is required';
      if (!formData.orgAdminEmail.trim()) {
        newErrors.orgAdminEmail = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.orgAdminEmail)) {
        newErrors.orgAdminEmail = 'Invalid email format';
      }
      if (!formData.orgAdminPhone.trim()) {
        newErrors.orgAdminPhone = 'Phone number is required';
      } else if (!/^[6-9]\d{9}$/.test(formData.orgAdminPhone)) {
        newErrors.orgAdminPhone = 'Invalid phone number';
      }
    }

    if (step === 3) {
      if (!formData.docGstCertificate) newErrors.docGstCertificate = 'GST certificate is required';
      if (!formData.docPanCard) newErrors.docPanCard = 'PAN card is required';
    }

    if (step === 4) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      if (!formData.termsAccepted) {
        newErrors.termsAccepted = 'You must accept the terms and conditions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
```

## Validation Rules Summary

### Step 1: Company Details
| Field | Validation | Required |
|-------|------------|----------|
| companyName | Non-empty string | Yes |
| gstNumber | 15-char GST format (e.g., 22AAAAA0000A1Z5) | Yes |
| panNumber | 10-char PAN format (e.g., AAAPL1234C) | Yes |
| industryType | Must be selected | Yes |
| companySize | Must be selected | Yes |
| addressLine1 | Non-empty string | Yes |
| city | Non-empty string | Yes |
| state | Must be selected | Yes |
| pinCode | 6-digit Indian PIN code | Yes |

### Step 2: Organization Admin Details
| Field | Validation | Required |
|-------|------------|----------|
| orgAdminName | Non-empty string | Yes |
| orgAdminEmail | Valid email format | Yes |
| orgAdminPhone | 10-digit Indian mobile (starts with 6-9) | Yes |
| orgAdminDesignation | - | No |

### Step 3: Document Upload
| Field | Validation | Required |
|-------|------------|----------|
| docGstCertificate | File uploaded | Yes |
| docPanCard | File uploaded | Yes |
| docIncorporationCert | - | No |
| docSignatoryId | - | No |
| docAddressProof | - | No |
| docCompanyLogo | - | No |

### Step 4: Password
| Field | Validation | Required |
|-------|------------|----------|
| password | Min 8 characters | Yes |
| confirmPassword | Must match password | Yes |
| termsAccepted | Must be checked | Yes |

## Quick Restore Command

You can use this sed command (or manually copy-paste):
```bash
# Manual steps:
# 1. Open src/pages/auth/EnterpriseRegister.tsx
# 2. Find the validateStep function (search for "// Validate step - SIMPLIFIED FOR TESTING")
# 3. Replace the entire function with the code above
# 4. Delete this ADD_VALIDATION.md file after restoration
```

## Testing Mode Fields (Current)
Only these fields are required during testing:
- **Step 1**: Company Name
- **Step 2**: Email (with format validation)
- **Step 3**: None (all documents optional)
- **Step 4**: Password (min 6 chars) + Confirm Password

This allows faster testing of the registration flow without needing real GST/PAN numbers or documents.
