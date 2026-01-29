import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Submission,
  CreateSubmissionInput,
  PhotoSet,
  CosmeticChecklist,
  FunctionalChecklist,
  FunctionalChecks,
  Accessories,
  SubmissionDraft,
  PickupTimeSlot,
  LocationData,
  Declaration,
} from '@/types';
import type { Address } from '@/types/common';
import { useAssetStore } from './assetStore';
import { triggerNotification } from './notificationStore';
import { useAuditStore } from './auditStore';
import { db } from '@/lib/database';

interface SubmissionState {
  submissions: Submission[];
  currentDraft: SubmissionDraft | null;
  isLoading: boolean;

  // Actions
  fetchSubmissions: (subUserId: string) => Promise<void>;
  getSubmissionByAssetId: (assetId: string) => Submission | undefined;

  // Draft management
  startSubmission: (assetId: string) => Promise<void>;
  updateDraft: (updates: Partial<SubmissionDraft>) => void;
  setStep: (step: number) => void;
  setDeviceConfirmed: (confirmed: boolean) => void;
  updatePhotos: (photos: Partial<PhotoSet>) => void;
  updateFunctionalChecks: (checks: Partial<FunctionalChecks>) => void;
  updateLocation: (location: Partial<LocationData>) => void;
  updateDeclaration: (declaration: Partial<Declaration>) => void;
  updatePickupDetails: (address: Partial<Address>, timeSlot?: PickupTimeSlot, date?: Date) => void;
  clearDraft: () => void;

  // Legacy
  updateCosmeticChecklist: (checklist: Partial<CosmeticChecklist>) => void;
  updateFunctionalChecklist: (checklist: Partial<FunctionalChecklist>) => void;
  updateAccessories: (accessories: Partial<Accessories>) => void;

  // Submit
  submitDevice: (input: CreateSubmissionInput) => Promise<Submission>;
}

const generateId = () => `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useSubmissionStore = create<SubmissionState>()(
  persist(
    (set, get) => ({
      submissions: [],
      currentDraft: null,
      isLoading: false,

      fetchSubmissions: async (_subUserId: string) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 300));
        set({ isLoading: false });
      },

      getSubmissionByAssetId: (assetId: string) => {
        return get().submissions.find(s => s.assetId === assetId);
      },

      startSubmission: async (assetId: string) => {
        // Update asset status to check_in_started - AWAIT to ensure it completes
        await useAssetStore.getState().updateAssetStatus(assetId, 'check_in_started');

        set({
          currentDraft: {
            assetId,
            step: 1,
            deviceConfirmed: undefined,
            photos: {},
            functionalChecks: {},
            location: undefined,
            declaration: undefined,
            pickupAddress: {},
            pickupTimeSlot: undefined,
            pickupDate: undefined,
            // Legacy
            cosmeticChecklist: {},
            functionalChecklist: {},
            accessories: {},
          }
        });
      },

      updateDraft: (updates: Partial<SubmissionDraft>) => {
        const current = get().currentDraft;
        if (current) {
          set({ currentDraft: { ...current, ...updates } });
        }
      },

      setStep: (step: number) => {
        const current = get().currentDraft;
        if (current) {
          set({ currentDraft: { ...current, step } });
        }
      },

      setDeviceConfirmed: (confirmed: boolean) => {
        const current = get().currentDraft;
        if (current) {
          set({ currentDraft: { ...current, deviceConfirmed: confirmed } });
        }
      },

      updatePhotos: (photos: Partial<PhotoSet>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              photos: { ...current.photos, ...photos }
            }
          });
        }
      },

      updateFunctionalChecks: (checks: Partial<FunctionalChecks>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              functionalChecks: { ...current.functionalChecks, ...checks }
            }
          });
        }
      },

      updateLocation: (location: Partial<LocationData>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              location: { ...current.location, ...location } as Partial<LocationData>
            }
          });
        }
      },

      updateDeclaration: (declaration: Partial<Declaration>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              declaration: { ...current.declaration, ...declaration } as Partial<Declaration>
            }
          });
        }
      },

      updatePickupDetails: (address: Partial<Address>, timeSlot?: PickupTimeSlot, date?: Date) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              pickupAddress: { ...current.pickupAddress, ...address },
              ...(timeSlot !== undefined && { pickupTimeSlot: timeSlot }),
              ...(date !== undefined && { pickupDate: date }),
            }
          });
        }
      },

      clearDraft: () => {
        set({ currentDraft: null });
      },

      // Legacy methods
      updateCosmeticChecklist: (checklist: Partial<CosmeticChecklist>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              cosmeticChecklist: { ...current.cosmeticChecklist, ...checklist }
            }
          });
        }
      },

      updateFunctionalChecklist: (checklist: Partial<FunctionalChecklist>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              functionalChecklist: { ...current.functionalChecklist, ...checklist }
            }
          });
        }
      },

      updateAccessories: (accessories: Partial<Accessories>) => {
        const current = get().currentDraft;
        if (current) {
          set({
            currentDraft: {
              ...current,
              accessories: { ...current.accessories, ...accessories }
            }
          });
        }
      },

      submitDevice: async (input: CreateSubmissionInput) => {
        console.log('[SubmissionStore] submitDevice called for assetId:', input.assetId);

        set({ isLoading: true });

        try {
          const submissionId = generateId();

          // Check if asset is self-assigned (IT Admin/Org Admin submitting their own asset)
          const assetResult = await db.queryById('assets', input.assetId);
          const assetData = assetResult.data as { is_self_assigned?: boolean; assigned_user_id?: string } | null;
          const isSelfAssigned = assetData?.is_self_assigned && assetData?.assigned_user_id === input.submittedBy;

          console.log('[SubmissionStore] Asset self-assigned:', isSelfAssigned, 'assigned_user_id:', assetData?.assigned_user_id);

          // Insert into database - use user_id for self-assigned, sub_user_id for sub-users
          const result = await db.insert('submissions', {
            id: submissionId,
            asset_id: input.assetId,
            // V3.2: Support both sub-user and IT Admin submissions
            ...(isSelfAssigned
              ? { user_id: input.submittedBy, sub_user_id: null }
              : { sub_user_id: input.submittedBy, user_id: null }),
            device_confirmed: input.deviceConfirmed,
            photos: input.photos || {},
            functional_checks: input.functionalChecks || {},
            cosmetic_checklist: input.cosmeticChecklist || null,
            accessories: input.accessories || null,
            location: input.location || null,
            declaration: input.declaration,
            submitted_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newSubmission: Submission = {
            id: submissionId,
            ...input,
            declarationAccepted: true,
            submittedAt: new Date(),
          };

          console.log('[SubmissionStore] Created submission object:', newSubmission.id);
          console.log('[SubmissionStore] Updating asset status to submitted -> remote_review...');

        const assetStore = useAssetStore.getState();
        const audit = useAuditStore.getState();
        const asset = assetStore.getAssetById(input.assetId);

        await assetStore.updateAssetStatus(input.assetId, 'submitted', undefined, true);
        await assetStore.updateAssetStatus(input.assetId, 'remote_review', undefined, true);

        console.log('[SubmissionStore] Asset status now:',
          assetStore.assets.find(a => a.id === input.assetId)?.status
        );

        set(state => ({
          submissions: [...state.submissions, newSubmission],
          currentDraft: null,
          isLoading: false,
        }));

        // Record audit trail
        audit.record({
          entityType: 'asset',
          entityId: input.assetId,
          action: 'submission_created',
          fromStatus: 'check_in_started',
          toStatus: 'remote_review',
          actorId: input.subUserId,
          metadata: {
            submissionId: newSubmission.id,
          },
        });

        // Notify IT Admin that a new submission is ready for review
        if (asset?.enterpriseId) {
          triggerNotification(
            'info',
            `it-admin-${asset.enterpriseId}`,
            'New Device Submission',
            `A new device evaluation has been submitted for ${asset.brand} ${asset.model} (${asset.serialNumber}). It is now in remote review queue.`
          );
        }

        // Notify Technician/Main Admin that there's work in the queue
        triggerNotification(
          'info',
          'main_admin',
          'Submission Awaiting Review',
          `New device submission (${asset?.brand} ${asset?.model}) is awaiting remote review.`
        );

        console.log('[SubmissionStore] Updated submissions array, cleared draft');

        await new Promise(resolve => setTimeout(resolve, 100));

          return newSubmission;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to submit device:', error);
          throw error;
        }
      },
    }),
    {
      name: 'ecotribe-submission-store',
      partialize: (state) => ({
        // Only persist submission metadata (without photos to avoid quota issues)
        submissions: state.submissions.map(s => ({
          ...s,
          photos: {}, // Don't persist photos - they'll be uploaded to server
        })),
        // Persist draft without photos
        currentDraft: state.currentDraft ? {
          ...state.currentDraft,
          photos: {}, // Don't persist photos in draft either
        } : null,
      }),
    }
  )
);
