import { ScanResult } from '../types';

const ACR_CLOUD_BACKEND_ENDPOINT = '/api/scan-track'; // Example backend endpoint

export const acrCloudService = {
  scanWithAcrCloud: async (file: File): Promise<ScanResult> => {
    // DIAGNOSTIC LOG
    console.log(`[acrCloudService] Attempting to scan: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const formData = new FormData();
    formData.append('audioFile', file, file.name); // 'audioFile' is the key your backend expects

    try {
      const response = await fetch(ACR_CLOUD_BACKEND_ENDPOINT, {
        method: 'POST',
        body: formData,
        // Add any necessary headers here, e.g., for authentication if your backend requires it
        // headers: {
        //   'Authorization': `Bearer ${your_auth_token_if_needed}`,
        // },
      });

      if (!response.ok) {
        // Try to parse error message from backend if available
        let errorMessage = `Error scanning file: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // Ignore if error response is not JSON
        }
        throw new Error(errorMessage);
      }

      const result: ScanResult = await response.json();
      return result;
    } catch (error: any) {
      console.error('Error in scanWithAcrCloud:', error);
      // Re-throw the error so it can be caught by the UI
      throw new Error(error.message || 'An unexpected error occurred while communicating with the server.');
    }
  },
};