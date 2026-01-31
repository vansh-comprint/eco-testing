import type { AssetGrade } from './asset';

export type RemoteReviewDecision = 'conditionally_accepted' | 'rejected';
export type FacilityQCDecision = 'final_accept' | 'final_reject';
export type DisputeType = 'remote' | 'facility';
export type DisputeResolution = 'overturned' | 'upheld';

export interface RemoteReview {
  id: string;
  assetId: string;
  reviewerId: string;
  decision: RemoteReviewDecision;
  reason?: string;
  notes?: string;
  reviewedAt: Date;
}

export interface CreateRemoteReviewInput {
  assetId: string;
  reviewerId: string;
  decision: RemoteReviewDecision;
  reason?: string;
  notes?: string;
}

export interface QCChecklistSection {
  name: string;
  items: {
    question: string;
    passed: boolean;
    notes?: string;
  }[];
}

export interface FacilityQCChecklist {
  verifyPhotos: QCChecklistSection;
  cosmeticInspection: QCChecklistSection;
  functionalTests: QCChecklistSection;
  portTesting: QCChecklistSection;
  batteryHealth: QCChecklistSection;
  storageCheck: QCChecklistSection;
  biosAccess: QCChecklistSection;
}

export interface FacilityQC {
  id: string;
  assetId: string;
  reviewerId: string;
  checklistData: FacilityQCChecklist;
  grade?: AssetGrade;
  decision: FacilityQCDecision;
  reason?: string;
  photos?: string[];
  completedAt: Date;
}

export interface CreateFacilityQCInput {
  assetId: string;
  reviewerId: string;
  checklistData: FacilityQCChecklist;
  grade?: AssetGrade;
  decision: FacilityQCDecision;
  reason?: string;
  photos?: string[];
}

export interface Dispute {
  id: string;
  assetId: string;
  type: DisputeType;
  itAdminNotes: string;
  photos?: string[];
  resolution?: DisputeResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolverNotes?: string;
  createdAt: Date;
}

export interface CreateDisputeInput {
  assetId: string;
  type: DisputeType;
  itAdminNotes: string;
  photos?: string[];
}

export interface ResolveDisputeInput {
  disputeId: string;
  resolution: DisputeResolution;
  resolvedBy: string;
  resolverNotes?: string;
}

// QC checklist template
export const facilityQCTemplate: FacilityQCChecklist = {
  verifyPhotos: {
    name: 'Photo Verification',
    items: [
      { question: 'Photos match physical device', passed: false },
      { question: 'Serial number matches', passed: false },
      { question: 'All angles captured clearly', passed: false },
    ],
  },
  cosmeticInspection: {
    name: 'Cosmetic Inspection',
    items: [
      { question: 'Screen condition matches submission', passed: false },
      { question: 'Body condition matches submission', passed: false },
      { question: 'Keyboard condition matches submission', passed: false },
      { question: 'No undisclosed damage found', passed: false },
    ],
  },
  functionalTests: {
    name: 'Functional Tests',
    items: [
      { question: 'Device powers on', passed: false },
      { question: 'Screen displays correctly', passed: false },
      { question: 'Keyboard functions properly', passed: false },
      { question: 'Trackpad responds correctly', passed: false },
    ],
  },
  portTesting: {
    name: 'Port Testing',
    items: [
      { question: 'USB ports functional', passed: false },
      { question: 'Charging port functional', passed: false },
      { question: 'Audio jack functional', passed: false },
      { question: 'Other ports functional', passed: false },
    ],
  },
  batteryHealth: {
    name: 'Battery Health',
    items: [
      { question: 'Battery charges', passed: false },
      { question: 'Battery health > 70%', passed: false },
      { question: 'No swelling observed', passed: false },
    ],
  },
  storageCheck: {
    name: 'Storage Check',
    items: [
      { question: 'Storage detected', passed: false },
      { question: 'No bad sectors', passed: false },
      { question: 'Data wiped', passed: false },
    ],
  },
  biosAccess: {
    name: 'BIOS Access',
    items: [
      { question: 'BIOS accessible', passed: false },
      { question: 'No BIOS password', passed: false },
      { question: 'Boot settings accessible', passed: false },
    ],
  },
};
