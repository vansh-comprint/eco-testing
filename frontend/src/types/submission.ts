import type { Address } from './common';

// Photo slots matching PRD - 10 mandatory photos
export const PHOTO_SLOTS = [
  { key: 'topLid', label: 'Top Lid', description: 'Closed laptop from above', required: true },
  { key: 'bottomPanel', label: 'Bottom', description: 'Bottom panel showing vents', required: true },
  { key: 'leftSide', label: 'Left Side', description: 'Left side showing ports', required: true },
  { key: 'rightSide', label: 'Right Side', description: 'Right side showing ports', required: true },
  { key: 'screen', label: 'Screen', description: 'Screen powered on, max brightness', required: true },
  { key: 'keyboardDeck', label: 'Keyboard', description: 'Full keyboard from above', required: true },
  { key: 'trackpad', label: 'Trackpad', description: 'Trackpad close-up', required: true },
  { key: 'ports', label: 'Ports', description: 'All ports visible', required: true },
  { key: 'charger', label: 'Charger', description: 'Charger + cable together', required: true },
  { key: 'damage', label: 'Damage', description: 'Any visible damage (optional)', required: false },
] as const;

export interface PhotoSet {
  topLid?: string;
  bottomPanel?: string;
  leftSide?: string;
  rightSide?: string;
  screen?: string;
  keyboardDeck?: string;
  trackpad?: string;
  ports?: string;
  charger?: string;
  damage?: string;
  additionalDamage?: string[];
  // Legacy fields
  topView?: string;
  keyboard?: string;
  leftPorts?: string;
  rightPorts?: string;
  bottom?: string;
  additional?: string[];
}

// Functional check options matching PRD exactly
export type BatteryOption = 'less_30min' | '30_60min' | '1_2hrs' | 'more_2hrs';
export type ScreenCondition = 'dead_pixels' | 'discoloration' | 'scratches' | 'pressure_marks' | 'none';
export type KeyboardCondition = 'all_working' | 'sticky_keys' | 'non_functional';
export type TrackpadCondition = 'functional' | 'partial' | 'broken';
export type PortsCondition = 'all_working' | 'some_not_working' | 'none_working';
export type HingeCondition = 'stable' | 'wobbly' | 'broken';
export type ComponentCondition = 'working' | 'partial' | 'dead';
export type AudioCondition = 'working' | 'muffled' | 'dead';
export type BodyCondition = 'minor_scratches' | 'major_dents' | 'cracks' | 'panel_separation' | 'none';
export type ChargerStatus = 'present' | 'missing' | 'damaged';

export interface FunctionalChecks {
  powersOn?: boolean;
  batteryBackup?: BatteryOption;
  screenCondition?: ScreenCondition[];
  keyboardCondition?: KeyboardCondition;
  trackpadCondition?: TrackpadCondition;
  portsCondition?: PortsCondition;
  hingeCondition?: HingeCondition;
  audioCondition?: AudioCondition;
  cameraCondition?: ComponentCondition;
  micCondition?: ComponentCondition;
  wifiCondition?: ComponentCondition;
  bodyCondition?: BodyCondition[];
  chargerStatus?: ChargerStatus;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  confirmed: boolean;
  address?: string;
}

export interface Declaration {
  accepted: boolean;
  signature?: string;
  timestamp?: Date;
}

export type PickupTimeSlot = '9am-12pm' | '12pm-3pm' | '3pm-6pm' | '6pm-9pm';

export interface SubmissionDraft {
  assetId: string;
  step: number;
  deviceConfirmed?: boolean;
  photos: Partial<PhotoSet>;
  functionalChecks: Partial<FunctionalChecks>;
  location?: Partial<LocationData>;
  declaration?: Partial<Declaration>;
  pickupAddress: Partial<Address>;
  pickupTimeSlot?: PickupTimeSlot;
  pickupDate?: Date;
  // Legacy fields
  cosmeticChecklist?: Partial<CosmeticChecklist>;
  functionalChecklist?: Partial<FunctionalChecklist>;
  accessories?: Partial<Accessories>;
}

// New PRD-aligned submission
export interface Submission {
  id: string;
  assetId: string;
  deviceConfirmed?: boolean;
  photos?: PhotoSet;
  functionalChecks?: FunctionalChecks;
  location?: LocationData;
  declaration?: Declaration;
  pickupAddress?: Address;
  pickupTimeSlot?: PickupTimeSlot;
  pickupDate?: Date;
  submittedBy: string;
  submittedAt: Date;
  // Legacy fields
  cosmeticChecklist?: CosmeticChecklist;
  functionalChecklist?: FunctionalChecklist;
  accessories?: Accessories;
  declarationAccepted?: boolean;
}

// Option arrays for UI
export const batteryOptions: { value: BatteryOption; label: string }[] = [
  { value: 'less_30min', label: '< 30 mins' },
  { value: '30_60min', label: '30-60 mins' },
  { value: '1_2hrs', label: '1-2 hours' },
  { value: 'more_2hrs', label: '2+ hours' },
];

export const screenConditionOptions: { value: ScreenCondition; label: string }[] = [
  { value: 'dead_pixels', label: 'Dead pixels' },
  { value: 'discoloration', label: 'Discoloration' },
  { value: 'scratches', label: 'Scratches' },
  { value: 'pressure_marks', label: 'Pressure marks' },
  { value: 'none', label: 'No issues' },
];

export const keyboardConditionOptions: { value: KeyboardCondition; label: string }[] = [
  { value: 'all_working', label: 'All keys working' },
  { value: 'sticky_keys', label: 'Sticky keys' },
  { value: 'non_functional', label: 'Keys not working' },
];

export const trackpadConditionOptions: { value: TrackpadCondition; label: string }[] = [
  { value: 'functional', label: 'Fully functional' },
  { value: 'partial', label: 'Partial issues' },
  { value: 'broken', label: 'Broken' },
];

export const portsConditionOptions: { value: PortsCondition; label: string }[] = [
  { value: 'all_working', label: 'All working' },
  { value: 'some_not_working', label: 'Some not working' },
  { value: 'none_working', label: 'None working' },
];

export const hingeConditionOptions: { value: HingeCondition; label: string }[] = [
  { value: 'stable', label: 'Stable' },
  { value: 'wobbly', label: 'Wobbly' },
  { value: 'broken', label: 'Broken' },
];

export const componentConditionOptions: { value: ComponentCondition; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'partial', label: 'Partial' },
  { value: 'dead', label: 'Not working' },
];

export const audioConditionOptions: { value: AudioCondition; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'muffled', label: 'Muffled' },
  { value: 'dead', label: 'Not working' },
];

export const bodyConditionOptions: { value: BodyCondition; label: string }[] = [
  { value: 'minor_scratches', label: 'Minor scratches' },
  { value: 'major_dents', label: 'Major dents' },
  { value: 'cracks', label: 'Cracks' },
  { value: 'panel_separation', label: 'Panel separation' },
  { value: 'none', label: 'No issues' },
];

export const chargerStatusOptions: { value: ChargerStatus; label: string }[] = [
  { value: 'present', label: 'Present & working' },
  { value: 'missing', label: 'Missing' },
  { value: 'damaged', label: 'Damaged' },
];

export const pickupTimeSlotLabels: Record<PickupTimeSlot, string> = {
  '9am-12pm': '9:00 AM - 12:00 PM',
  '12pm-3pm': '12:00 PM - 3:00 PM',
  '3pm-6pm': '3:00 PM - 6:00 PM',
  '6pm-9pm': '6:00 PM - 9:00 PM',
};

// Legacy types for backwards compatibility
export interface CosmeticChecklistItem {
  question: string;
  answer: boolean;
  photo?: string;
  notes?: string;
}

export interface CosmeticChecklist {
  screenDamage?: CosmeticChecklistItem;
  bodyDamage?: CosmeticChecklistItem;
  keyboardDamage?: CosmeticChecklistItem;
  hingeDamage?: CosmeticChecklistItem;
}

export interface FunctionalChecklistItem {
  question: string;
  answer: boolean;
  notes?: string;
}

export interface FunctionalChecklist {
  powersOn?: FunctionalChecklistItem;
  screenWorks?: FunctionalChecklistItem;
  keyboardWorks?: FunctionalChecklistItem;
  trackpadWorks?: FunctionalChecklistItem;
  portsWork?: FunctionalChecklistItem;
  speakersWork?: FunctionalChecklistItem;
  cameraWorks?: FunctionalChecklistItem;
  biosAccessible?: FunctionalChecklistItem;
}

export interface Accessories {
  hasCharger?: boolean;
  chargerType?: string;
  additionalItems?: string[];
}

export interface CreateSubmissionInput {
  assetId: string;
  photos?: PhotoSet;
  functionalChecks?: FunctionalChecks;
  pickupAddress?: Address;
  pickupTimeSlot?: PickupTimeSlot;
  pickupDate?: Date;
  submittedBy: string;
  deviceConfirmed?: boolean;
  location?: LocationData;
  declaration?: Declaration;
  // Legacy
  cosmeticChecklist?: CosmeticChecklist;
  functionalChecklist?: FunctionalChecklist;
  accessories?: Accessories;
}

export const cosmeticQuestions = [
  { key: 'screenDamage', question: 'Does the screen have scratches, cracks, or dead pixels?' },
  { key: 'bodyDamage', question: 'Does the body have dents, scratches, or discoloration?' },
  { key: 'keyboardDamage', question: 'Are any keys damaged, missing, or not working?' },
  { key: 'hingeDamage', question: 'Does the hinge have any issues or make unusual sounds?' },
] as const;

export const functionalQuestions = [
  { key: 'powersOn', question: 'Does the laptop power on?' },
  { key: 'screenWorks', question: 'Does the screen display correctly?' },
  { key: 'keyboardWorks', question: 'Does the keyboard work properly?' },
  { key: 'trackpadWorks', question: 'Does the trackpad work properly?' },
  { key: 'portsWork', question: 'Do all ports (USB, HDMI, etc.) work?' },
  { key: 'speakersWork', question: 'Do the speakers produce sound?' },
  { key: 'cameraWorks', question: 'Does the camera work?' },
  { key: 'biosAccessible', question: 'Can you access the BIOS?' },
] as const;
