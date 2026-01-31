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
import { triggerNotification } from './notificationStore';
import { useAuditStore } from './auditStore';
import { updateAssetStatus as apiUpdateAssetStatus, fetchAssetById } from '@/lib/db/api-queries';
import { submissionsApi } from '@/lib/api/submissions';

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
        // Update asset status to check_in_started via REST API
        await apiUpdateAssetStatus(assetId, 'check_in_started');

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
          // Create submission via REST API (backend handles asset validation,
          // self-assignment detection, and status transition to 'submitted')
          const apiResponse = await submissionsApi.create({
            asset_id: input.assetId,
            device_confirmed: input.deviceConfirmed ?? true,
            photos: (input.photos || {}) as Record<string, unknown>,
            functional_checks: (input.functionalChecks || {}) as Record<string, unknown>,
            cosmetic_checklist: (input.cosmeticChecklist || null) as Record<string, unknown> | null,
            accessories: (input.accessories || null) as Record<string, unknown> | null,
            location: (input.location || null) as Record<string, unknown> | null,
            declaration: (input.declaration || { accepted: true, timestamp: new Date().toISOString() }) as Record<string, unknown>,
          });

          if (!apiResponse.success) {
            throw new Error(apiResponse.error?.message || 'Failed to create submission');
          }

          const submissionData = apiResponse.data;
          const submissionId = submissionData?.id || `sub-${Date.now()}`;

          console.log('[SubmissionStore] Submission created via API:', submissionId);

          // Backend sets status to 'submitted'; now advance to 'remote_review'
          await apiUpdateAssetStatus(input.assetId, 'remote_review');
          console.log('[SubmissionStore] Asset status updated to remote_review via API');

          const newSubmission: Submission = {
            id: submissionId,
            ...input,
            declarationAccepted: true,
            submittedAt: new Date(),
          };

          set(state => ({
            submissions: [...state.submissions, newSubmission],
            currentDraft: null,
            isLoading: false,
          }));

          // Record audit trail
          const audit = useAuditStore.getState();
          audit.record({
            entityType: 'asset',
            entityId: input.assetId,
            action: 'submission_created',
            fromStatus: 'check_in_started',
            toStatus: 'remote_review',
            actorId: input.submittedBy,
            metadata: {
              submissionId,
            },
          });

          // Fetch asset data for notification info
          let asset: Record<string, unknown> | null = null;
          try {
            asset = await fetchAssetById(input.assetId);
          } catch {
            // Non-critical — notifications will use fallback values
          }

          const enterpriseId = asset?.enterprise_id as string | undefined;
          const brand = (asset?.brand as string) || 'Unknown';
          const model = (asset?.model as string) || 'Unknown';
          const serialNumber = (asset?.serial_number as string) || '';

          if (enterpriseId) {
            triggerNotification(
              'info',
              `it-admin-${enterpriseId}`,
              'New Device Submission',
              `A new device evaluation has been submitted for ${brand} ${model} (${serialNumber}). It is now in remote review queue.`
            );
          }

          triggerNotification(
            'info',
            'ops_admin',
            'Submission Awaiting Review',
            `New device submission (${brand} ${model}) is awaiting remote review.`
          );

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
