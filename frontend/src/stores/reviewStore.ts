import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RemoteReview, FacilityQC, Dispute, CreateRemoteReviewInput, CreateFacilityQCInput, CreateDisputeInput, ResolveDisputeInput } from '@/types/review';
import { handleFacilityQC, handleRemoteReview } from '@/lib/workflow';
import { db } from '@/lib/database';

interface ReviewState {
  remoteReviews: RemoteReview[];
  facilityQCs: FacilityQC[];
  disputes: Dispute[];
  isLoading: boolean;

  hydrate: (data: {
    remoteReviews?: RemoteReview[];
    facilityQCs?: FacilityQC[];
    disputes?: Dispute[];
  }) => void;

  // Remote Review Actions
  createRemoteReview: (input: CreateRemoteReviewInput) => Promise<RemoteReview>;
  getRemoteReviewByAssetId: (assetId: string) => RemoteReview | undefined;

  // Facility QC Actions
  createFacilityQC: (input: CreateFacilityQCInput) => Promise<FacilityQC>;
  getFacilityQCByAssetId: (assetId: string) => FacilityQC | undefined;

  // Dispute Actions
  createDispute: (input: CreateDisputeInput) => Promise<Dispute>;
  resolveDispute: (input: ResolveDisputeInput) => Promise<void>;
  getDisputeByAssetId: (assetId: string) => Dispute | undefined;
  getPendingDisputes: () => Dispute[];

  // Stats
  getReviewStats: (technicianId: string) => {
    reviewedToday: number;
    qcCompletedToday: number;
    disputesResolved: number;
    avgReviewTime: string;
  };
}

const generateId = () => `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      remoteReviews: [],
      facilityQCs: [],
      disputes: [],
      isLoading: false,

      hydrate: (data) => {
        const hasData = get().remoteReviews.length + get().facilityQCs.length + get().disputes.length > 0;
        if (hasData) return;

        set(state => ({
          remoteReviews: data.remoteReviews?.length ? data.remoteReviews : state.remoteReviews,
          facilityQCs: data.facilityQCs?.length ? data.facilityQCs : state.facilityQCs,
          disputes: data.disputes?.length ? data.disputes : state.disputes,
        }));
      },

      createRemoteReview: async (input: CreateRemoteReviewInput) => {
        set({ isLoading: true });

        try {
          const reviewId = generateId();

          // Insert into database
          const result = await db.insert('remote_reviews', {
            id: reviewId,
            asset_id: input.assetId,
            technician_id: input.technicianId,
            decision: input.decision,
            notes: input.notes || null,
            reason: input.reason || null,
            reviewed_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newReview: RemoteReview = {
            id: reviewId,
            ...input,
            reviewedAt: new Date(),
          };

          set(state => ({
            remoteReviews: [...state.remoteReviews, newReview],
            isLoading: false,
          }));

          await handleRemoteReview({
            assetId: input.assetId,
            technicianId: input.technicianId,
            decision: input.decision === 'conditionally_accepted' ? 'conditionally_accepted' : 'rejected',
            notes: input.notes,
            reason: input.reason,
          });

          console.log(`✅ Remote review created: ${reviewId}`);
          return newReview;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to create remote review:', error);
          throw error;
        }
      },

      getRemoteReviewByAssetId: (assetId: string) => {
        return get().remoteReviews.find(r => r.assetId === assetId);
      },

      createFacilityQC: async (input: CreateFacilityQCInput) => {
        set({ isLoading: true });

        try {
          const qcId = generateId();

          // Insert into database
          const result = await db.insert('facility_qc', {
            id: qcId,
            asset_id: input.assetId,
            technician_id: input.technicianId,
            checklist_data: input.checklistData || {},
            decision: input.decision,
            grade: input.grade || null,
            discrepancies: input.discrepancies || null,
            notes: input.notes || null,
            completed_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newQC: FacilityQC = {
            id: qcId,
            ...input,
            completedAt: new Date(),
          };

          set(state => ({
            facilityQCs: [...state.facilityQCs, newQC],
            isLoading: false,
          }));

          await handleFacilityQC({
            assetId: input.assetId,
            technicianId: input.technicianId,
            decision: input.decision,
            grade: input.grade,
          });

          console.log(`✅ Facility QC created: ${qcId}`);
          return newQC;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to create facility QC:', error);
          throw error;
        }
      },

      getFacilityQCByAssetId: (assetId: string) => {
        return get().facilityQCs.find(qc => qc.assetId === assetId);
      },

      createDispute: async (input: CreateDisputeInput) => {
        set({ isLoading: true });

        try {
          const disputeId = generateId();

          // Insert into database
          const result = await db.insert('disputes', {
            id: disputeId,
            asset_id: input.assetId,
            raised_by: input.raisedBy,
            reason: input.reason,
            description: input.description || null,
            evidence: input.evidence || null,
            created_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          const newDispute: Dispute = {
            id: disputeId,
            ...input,
            createdAt: new Date(),
          };

          set(state => ({
            disputes: [...state.disputes, newDispute],
            isLoading: false,
          }));

          console.log(`✅ Dispute created: ${disputeId}`);
          return newDispute;
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to create dispute:', error);
          throw error;
        }
      },

      resolveDispute: async (input: ResolveDisputeInput) => {
        set({ isLoading: true });

        try {
          // Update database
          const result = await db.update('disputes', input.disputeId, {
            resolution: input.resolution,
            resolved_by: input.resolvedBy,
            resolver_notes: input.resolverNotes || null,
            resolved_at: new Date().toISOString(),
          });

          if (result.error) {
            throw new Error(`Database error: ${result.error.message}`);
          }

          set(state => ({
            disputes: state.disputes.map(d =>
              d.id === input.disputeId
                ? {
                    ...d,
                    resolution: input.resolution,
                    resolvedBy: input.resolvedBy,
                    resolverNotes: input.resolverNotes,
                    resolvedAt: new Date(),
                  }
                : d
            ),
            isLoading: false,
          }));

          console.log(`✅ Dispute resolved: ${input.disputeId}`);
        } catch (error) {
          set({ isLoading: false });
          console.error('Failed to resolve dispute:', error);
          throw error;
        }
      },

      getDisputeByAssetId: (assetId: string) => {
        return get().disputes.find(d => d.assetId === assetId);
      },

      getPendingDisputes: () => {
        return get().disputes.filter(d => !d.resolution);
      },

      getReviewStats: (technicianId: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reviewsToday = get().remoteReviews.filter(
          r => r.technicianId === technicianId && new Date(r.reviewedAt) >= today
        );

        const qcToday = get().facilityQCs.filter(
          qc => qc.technicianId === technicianId && new Date(qc.completedAt) >= today
        );

        const disputesResolved = get().disputes.filter(
          d => d.resolvedBy === technicianId
        ).length;

        return {
          reviewedToday: reviewsToday.length,
          qcCompletedToday: qcToday.length,
          disputesResolved,
          avgReviewTime: '4m 32s', // Mock average
        };
      },
    }),
    {
      name: 'ecotribe-review-store',
      partialize: (state) => ({
        remoteReviews: state.remoteReviews,
        facilityQCs: state.facilityQCs,
        disputes: state.disputes,
      }),
    }
  )
);
