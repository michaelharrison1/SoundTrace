
import { SnippetScanResult } from '../types'; // Updated to SnippetScanResult

const ACR_CLOUD_BACKEND_ENDPOINT = '/api/scan-track';

export const acrCloudService = {
  scanWithAcrCloud: async (file: File): Promise<SnippetScanResult> => { // file is a snippet

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
        } catch {
          // Ignore if error response is not JSON
        }
        throw new Error(errorMessage);
      }

      const result: SnippetScanResult = await response.json(); // Backend returns SnippetScanResult
      return result;
    } catch (error: unknown) {
      let msg = 'An unexpected error occurred while communicating with the server.';
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: string }).message === 'string') {
        msg = (error as { message?: string }).message!;
      }
      throw new Error(msg);
    }
  },
};
