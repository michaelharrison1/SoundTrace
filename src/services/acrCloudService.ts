
import { SnippetScanResult } from '../types'; // Updated to SnippetScanResult

const ACR_CLOUD_BACKEND_ENDPOINT = '/api/scan-track';

export const acrCloudService = {
  scanWithAcrCloud: async (file: File): Promise<SnippetScanResult> => { // file is a snippet
    console.log(`[acrCloudService] Attempting to scan snippet: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const formData = new FormData();
    formData.append('audioFile', file, file.name); // Send snippet with its generated name

    try {
      const response = await fetch(ACR_CLOUD_BACKEND_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
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

      const result: SnippetScanResult = await response.json(); // Backend returns SnippetScanResult
      return result;
    } catch (error: any) {
      console.error('Error in scanWithAcrCloud:', error);
      throw new Error(error.message || 'An unexpected error occurred while communicating with the server.');
    }
  },
};
