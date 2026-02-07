import type { User, Enterprise, Asset, Batch, SubUser, Submission, RemoteReview, Dispute, Payout, PricingCatalog, Notification } from '@/types';

// Generate IDs
const id = (prefix: string, num: number) => `${prefix}-${String(num).padStart(4, '0')}`;

// ===== ENTERPRISES =====
export const mockEnterprises: Enterprise[] = [
  {
    id: id('ent', 1),
    name: 'TechCorp India Pvt Ltd',
    gstNumber: '27AABCT1234G1ZP',
    status: 'active',
    contactPerson: 'Rajesh Kumar',
    contactEmail: 'rajesh@techcorp.in',
    contactPhone: '+91 98765 43210',
    address: {
      line1: '123 Tech Park',
      line2: 'Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
      country: 'India',
    },
    bankDetails: {
      accountName: 'TechCorp India Pvt Ltd',
      accountNumber: '1234567890123456',
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      branch: 'Whitefield Branch',
    },
    createdAt: new Date('2024-01-15'),
  },
  {
    id: id('ent', 2),
    name: 'DataSoft Solutions',
    gstNumber: '29AABCD5678H2ZQ',
    status: 'active',
    contactPerson: 'Priya Sharma',
    contactEmail: 'priya@datasoft.com',
    contactPhone: '+91 87654 32109',
    address: {
      line1: '456 IT Hub',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
      country: 'India',
    },
    createdAt: new Date('2024-02-20'),
  },
];

// ===== USERS =====
export const mockUsers: User[] = [
  // Super Admin
  {
    id: id('usr', 1),
    role: 'super_admin',
    name: 'Admin User',
    email: 'admin@ecotribe.in',
    phone: '+91 99999 00000',
    createdAt: new Date('2024-01-01'),
  },
  // OPS Admin
  {
    id: id('usr', 2),
    role: 'ops_admin',
    name: 'Ops Manager',
    email: 'ops@ecotribe.in',
    phone: '+91 99999 11111',
    createdAt: new Date('2024-01-05'),
  },
  // OPS Admins (formerly Technicians)
  {
    id: id('usr', 3),
    role: 'ops_admin',
    name: 'Amit Reviewer',
    email: 'amit@ecotribe.in',
    phone: '+91 99999 22222',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: id('usr', 4),
    role: 'ops_admin',
    name: 'Sneha Reviewer',
    email: 'sneha@ecotribe.in',
    createdAt: new Date('2024-01-12'),
  },
  // Org Admin
  {
    id: id('usr', 5),
    role: 'org_admin',
    name: 'Vikram Mehta',
    email: 'orgadmin@ecotribe.in',
    phone: '+91 99999 33333',
    department: 'Finance',
    createdAt: new Date('2024-01-08'),
  },
  // IT Admins
  {
    id: id('usr', 6),
    enterpriseId: id('ent', 1),
    role: 'it_admin',
    name: 'Rajesh Kumar',
    email: 'rajesh@techcorp.in',
    phone: '+91 98765 43210',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: id('usr', 7),
    enterpriseId: id('ent', 2),
    role: 'it_admin',
    name: 'Priya Sharma',
    email: 'priya@datasoft.com',
    phone: '+91 87654 32109',
    createdAt: new Date('2024-02-20'),
  },
  // Logistics Admin
  {
    id: id('usr', 8),
    role: 'logistics_admin',
    name: 'Vikram Logistics',
    email: 'logistics.admin@ecotribe.in',
    phone: '+91 99999 44444',
    createdAt: new Date('2024-02-25'),
  },
  // Logistics User
  {
    id: id('usr', 9),
    role: 'logistics_user',
    name: 'Suresh Courier',
    email: 'logistics.user@ecotribe.in',
    phone: '+91 99999 55555',
    createdAt: new Date('2024-02-26'),
  },
  {
    id: id('usr', 10),
    role: 'logistics_user',
    name: 'Anita Logistics',
    email: 'anita@logi.com',
    phone: '+91 99999 66666',
    createdAt: new Date('2024-02-27'),
  },
];

// ===== BATCHES =====
export const mockBatches: Batch[] = [
  {
    id: id('bat', 1),
    enterpriseId: id('ent', 1),
    name: 'Q4 2024 Refresh',
    description: 'End of year laptop refresh program',
    status: 'approved',
    assetCount: 25,
    acceptedCount: 15,
    rejectedCount: 3,
    pendingCount: 7,
    totalPayout: 375000,
    estimatedValue: 425000,
    requiresApproval: false,
    createdBy: id('usr', 6),
    createdAt: new Date('2024-10-01'),
  },
  {
    id: id('bat', 2),
    enterpriseId: id('ent', 1),
    name: 'IT Upgrade Batch',
    status: 'pickup_in_progress',
    assetCount: 10,
    acceptedCount: 4,
    rejectedCount: 1,
    pendingCount: 5,
    totalPayout: 100000,
    estimatedValue: 150000,
    requiresApproval: false,
    createdBy: id('usr', 6),
    createdAt: new Date('2024-11-01'),
  },
  {
    id: id('bat', 3),
    enterpriseId: id('ent', 1),
    name: 'Large Scale Decommission',
    description: 'Datacenter hardware decommissioning - requires Org Admin approval',
    status: 'pending_approval',
    assetCount: 75,
    acceptedCount: 0,
    rejectedCount: 0,
    pendingCount: 75,
    totalPayout: 0,
    estimatedValue: 825000,
    requiresApproval: true,
    approvalStatus: 'pending',
    createdBy: id('usr', 6),
    createdAt: new Date('2024-11-20'),
  },
];

// ===== ASSETS =====
export const mockAssets: Asset[] = [
  // Completed assets
  {
    id: id('ast', 1),
    enterpriseId: id('ent', 1),
    batchId: id('bat', 1),
    serialNumber: 'DELL-XPS-001',
    brand: 'Dell',
    model: 'XPS 15 9520',
    specs: { processor: 'Intel i7-12700H', ram: '16GB', storage: '512GB SSD', screenSize: '15.6"' },
    purchaseDate: new Date('2022-06-15'),
    status: 'completed',
    grade: 'A',
    basePrice: 35000,
    finalPrice: 34850,
    createdAt: new Date('2024-10-02'),
  },
  {
    id: id('ast', 2),
    enterpriseId: id('ent', 1),
    batchId: id('bat', 1),
    serialNumber: 'HP-ELITE-002',
    brand: 'HP',
    model: 'EliteBook 840 G8',
    specs: { processor: 'Intel i5-1135G7', ram: '16GB', storage: '256GB SSD', screenSize: '14"' },
    status: 'final_accepted',
    grade: 'B',
    basePrice: 28000,
    finalPrice: 27350,
    createdAt: new Date('2024-10-03'),
  },
  // In remote review
  {
    id: id('ast', 3),
    enterpriseId: id('ent', 1),
    batchId: id('bat', 2),
    serialNumber: 'LENOVO-T14-003',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 2',
    specs: { processor: 'AMD Ryzen 5 Pro 5650U', ram: '8GB', storage: '256GB SSD', screenSize: '14"' },
    status: 'remote_review',
    basePrice: 25000,
    assignedSubUserId: id('sub', 1),
    assignedAt: new Date('2024-11-10'),
    createdAt: new Date('2024-11-05'),
  },
  // Pending assignment
  {
    id: id('ast', 4),
    enterpriseId: id('ent', 1),
    batchId: id('bat', 2),
    serialNumber: 'ASUS-ZB14-004',
    brand: 'ASUS',
    model: 'ZenBook 14',
    specs: { processor: 'Intel i5-1240P', ram: '16GB', storage: '512GB SSD', screenSize: '14"' },
    status: 'pending_assignment',
    basePrice: 30000,
    createdAt: new Date('2024-11-10'),
  },
  {
    id: id('ast', 5),
    enterpriseId: id('ent', 1),
    batchId: id('bat', 2),
    serialNumber: 'DELL-LAT-005',
    brand: 'Dell',
    model: 'Latitude 5420',
    specs: { processor: 'Intel i5-1145G7', ram: '8GB', storage: '256GB SSD', screenSize: '14"' },
    status: 'assigned',
    basePrice: 22000,
    assignedSubUserId: id('sub', 2),
    assignedAt: new Date('2024-11-12'),
    createdAt: new Date('2024-11-10'),
  },
  // Rejected
  {
    id: id('ast', 6),
    enterpriseId: id('ent', 1),
    batchId: id('bat', 1),
    serialNumber: 'HP-PRO-006',
    brand: 'HP',
    model: 'ProBook 450 G8',
    status: 'remote_rejected',
    basePrice: 20000,
    createdAt: new Date('2024-10-15'),
  },
];

// ===== SUB USERS =====
export const mockSubUsers: SubUser[] = [
  {
    id: id('sub', 1),
    enterpriseId: id('ent', 1),
    name: 'Vikram Singh',
    email: 'vikram@techcorp.in',
    phone: '+91 98765 11111',
    token: 'tok_abc123xyz',
    tokenExpiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-11-10'),
  },
  {
    id: id('sub', 2),
    enterpriseId: id('ent', 1),
    name: 'Neha Gupta',
    email: 'neha@techcorp.in',
    phone: '+91 98765 22222',
    token: 'tok_def456uvw',
    tokenExpiresAt: new Date('2024-12-31'),
    createdAt: new Date('2024-11-12'),
  },
];

// ===== PRICING CATALOG =====
export const mockPricingCatalog: PricingCatalog[] = [
  {
    id: id('prc', 1),
    brand: 'Dell',
    model: 'XPS 15',
    basePrice: 35000,
    gradeModifiers: { A: 0, B: -500, C: -1500, D: -3000 },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: id('prc', 2),
    brand: 'Dell',
    model: 'Latitude 5420',
    basePrice: 22000,
    gradeModifiers: { A: 0, B: -400, C: -1200, D: -2500 },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: id('prc', 3),
    brand: 'HP',
    model: 'EliteBook 840',
    basePrice: 28000,
    gradeModifiers: { A: 0, B: -500, C: -1500, D: -3000 },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: id('prc', 4),
    brand: 'Lenovo',
    model: 'ThinkPad T14',
    basePrice: 25000,
    gradeModifiers: { A: 0, B: -450, C: -1400, D: -2800 },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: id('prc', 5),
    brand: 'ASUS',
    model: 'ZenBook 14',
    basePrice: 30000,
    gradeModifiers: { A: 0, B: -500, C: -1500, D: -3000 },
    createdAt: new Date('2024-01-01'),
  },
];

// ===== NOTIFICATIONS =====
export const mockNotifications: Notification[] = [
  // Org Admin Notifications
  {
    id: id('not', 1),
    recipientType: 'user',
    recipientId: id('usr', 5),
    channel: 'in_app',
    type: 'submission_received',
    title: 'New Submission Received',
    message: 'Asset LENOVO-T14-003 has been submitted for review.',
    status: 'read',
    createdAt: new Date('2024-11-15'),
    readAt: new Date('2024-11-15'),
  },
  {
    id: id('not', 2),
    recipientType: 'user',
    recipientId: id('usr', 5),
    channel: 'in_app',
    type: 'remote_review_complete',
    title: 'Remote Review Complete',
    message: 'Asset HP-ELITE-002 has been conditionally accepted.',
    status: 'sent',
    createdAt: new Date('2024-11-14'),
  },
  // IT Admin Notifications (TechCorp - usr-0006)
  {
    id: id('not', 3),
    recipientType: 'user',
    recipientId: id('usr', 6),
    channel: 'in_app',
    type: 'asset_assigned',
    title: 'Asset Assigned to Batch',
    message: '5 assets have been added to "Q4 2024 Refresh" batch.',
    status: 'sent',
    createdAt: new Date('2024-11-28'),
  },
  {
    id: id('not', 4),
    recipientType: 'user',
    recipientId: id('usr', 6),
    channel: 'in_app',
    type: 'remote_review_complete',
    title: 'Remote Review Complete',
    message: 'DELL-LAT-001 has been reviewed and conditionally accepted at ₹12,500.',
    status: 'sent',
    createdAt: new Date('2024-11-27'),
  },
  {
    id: id('not', 5),
    recipientType: 'user',
    recipientId: id('usr', 6),
    channel: 'in_app',
    type: 'payout_initiated',
    title: 'Payout Initiated',
    message: 'Payout of ₹1,25,000 has been initiated for batch "IT Upgrade Batch".',
    status: 'read',
    createdAt: new Date('2024-11-25'),
    readAt: new Date('2024-11-26'),
  },
  {
    id: id('not', 6),
    recipientType: 'user',
    recipientId: id('usr', 6),
    channel: 'in_app',
    type: 'reminder_stalled',
    title: 'Asset Check-in Reminder',
    message: '3 assets in "Q4 2024 Refresh" batch are pending check-in for more than 7 days.',
    status: 'sent',
    createdAt: new Date('2024-11-26'),
  },
  {
    id: id('not', 7),
    recipientType: 'user',
    recipientId: id('usr', 6),
    channel: 'in_app',
    type: 'dispute_resolved',
    title: 'Dispute Resolved',
    message: 'Your dispute for HP-ELITE-002 has been reviewed. New valuation: ₹14,000.',
    status: 'read',
    createdAt: new Date('2024-11-20'),
    readAt: new Date('2024-11-21'),
  },
  // IT Admin Notifications (DataSoft - usr-0007)
  {
    id: id('not', 8),
    recipientType: 'user',
    recipientId: id('usr', 7),
    channel: 'in_app',
    type: 'submission_received',
    title: 'Submission Received',
    message: 'Your submission for 8 assets has been received and is under review.',
    status: 'sent',
    createdAt: new Date('2024-11-28'),
  },
  {
    id: id('not', 9),
    recipientType: 'user',
    recipientId: id('usr', 7),
    channel: 'in_app',
    type: 'payout_completed',
    title: 'Payout Completed',
    message: 'Payout of ₹87,500 has been credited to your bank account.',
    status: 'read',
    createdAt: new Date('2024-11-22'),
    readAt: new Date('2024-11-22'),
  },
];

// ===== REVIEWS & DISPUTES =====
export const mockRemoteReviews: RemoteReview[] = [
  {
    id: id('rev', 1),
    assetId: id('ast', 2),
    reviewerId: id('usr', 3),
    decision: 'conditionally_accepted',
    notes: 'Minor scuffs on lid; overall good condition.',
    reviewedAt: new Date('2024-11-14'),
  },
  {
    id: id('rev', 2),
    assetId: id('ast', 6),
    reviewerId: id('usr', 4),
    decision: 'rejected',
    reason: 'Keyboard malfunction detected during diagnostics.',
    reviewedAt: new Date('2024-10-18'),
  },
];

export const mockDisputes: Dispute[] = [
  {
    id: id('dsp', 1),
    assetId: id('ast', 6),
    type: 'remote',
    itAdminNotes: 'Keyboard issue is intermittent; requesting re-evaluation with external keyboard logs.',
    photos: [],
    createdAt: new Date('2024-10-20'),
  },
];

// Helper to get current mock user by role for testing
export const getMockUserByRole = (role: string): User | undefined => {
  return mockUsers.find(u => u.role === role);
};
