/**
 * Files API Module
 * File upload and management endpoints
 */

import { getAccessToken, API_BASE_URL } from './client';
import type { ApiResponse } from './client';

// ============================================================================
// Types
// ============================================================================

export interface FileUploadResponse {
  file_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

// ============================================================================
// API
// ============================================================================

export const filesApi = {
  upload: async (file: File, folder?: string): Promise<ApiResponse<FileUploadResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: data.message || data.detail || 'Upload failed',
            code: response.status.toString(),
          },
        };
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Upload failed',
          code: 'UPLOAD_ERROR',
        },
      };
    }
  },

  getUrl: (fileId: string) => `${API_BASE_URL}/files/${fileId}`,
};
