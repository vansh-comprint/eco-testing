export interface BulkUpload {
  id: string;
  enterpriseId: string;
  fileName: string;
  uploadedAt: Date;
  uploadedBy: string; // user id
  totalAssets: number;
  assignedAssets: number;
  unassignedAssets: number;
  assetIds: string[];
  // Summary of users involved
  usersCreated: number;
  usersExisting: number;
}

export interface CreateBulkUploadInput {
  enterpriseId: string;
  fileName: string;
  uploadedBy: string;
  assetIds: string[];
  assignedAssets: number;
  unassignedAssets: number;
  usersCreated: number;
  usersExisting: number;
}
