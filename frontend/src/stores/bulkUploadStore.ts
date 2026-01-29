import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BulkUpload, CreateBulkUploadInput } from '@/types';

const generateId = () => `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface BulkUploadState {
  bulkUploads: BulkUpload[];
  isLoading: boolean;

  // Actions
  createBulkUpload: (input: CreateBulkUploadInput) => Promise<BulkUpload>;
  getBulkUploadById: (id: string) => BulkUpload | undefined;
  getBulkUploadsByEnterprise: (enterpriseId: string) => BulkUpload[];
  getBulkUploadForAsset: (assetId: string) => BulkUpload | undefined;
}

export const useBulkUploadStore = create<BulkUploadState>()(
  persist(
    (set, get) => ({
      bulkUploads: [],
      isLoading: false,

      createBulkUpload: async (input: CreateBulkUploadInput) => {
        const newBulkUpload: BulkUpload = {
          id: generateId(),
          enterpriseId: input.enterpriseId,
          fileName: input.fileName,
          uploadedAt: new Date(),
          uploadedBy: input.uploadedBy,
          totalAssets: input.assetIds.length,
          assignedAssets: input.assignedAssets,
          unassignedAssets: input.unassignedAssets,
          assetIds: input.assetIds,
          usersCreated: input.usersCreated,
          usersExisting: input.usersExisting,
        };

        set(state => ({
          bulkUploads: [...state.bulkUploads, newBulkUpload],
        }));

        return newBulkUpload;
      },

      getBulkUploadById: (id: string) => {
        return get().bulkUploads.find(b => b.id === id);
      },

      getBulkUploadsByEnterprise: (enterpriseId: string) => {
        return get().bulkUploads
          .filter(b => b.enterpriseId === enterpriseId)
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      },

      getBulkUploadForAsset: (assetId: string) => {
        return get().bulkUploads.find(b => b.assetIds.includes(assetId));
      },
    }),
    {
      name: 'ecotribe-bulk-upload-store',
      partialize: (state) => ({ bulkUploads: state.bulkUploads }),
    }
  )
);
