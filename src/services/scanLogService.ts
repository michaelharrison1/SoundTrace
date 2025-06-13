import { TrackScanLog, ScanJob, JobCreationResponse, AllJobsResponse, SingleJobResponse, JobFileState, FileUploadResponse, JobType } from '../types';

const defaultApiBaseUrl = 'https://api.soundtrace.uk';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const JOBS_BASE_URL = `${API_BASE_URL}/api/scan-jobs`; 
const LOGS_BASE_URL = `${API_BASE_URL}/api/scan-logs`; 

const getAuthToken = (): string | null => {
  try { return localStorage.getItem('authToken'); } catch (error) { console.error("Error accessing authToken:", error); return null; }
};

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorData: { message?: string } = {};
    try { errorData = await response.json(); } catch (e) { /* ignore */ }
    const errorMessage = errorData.message || `Request failed: ${response.status} ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage); (error as any).status = response.status;
    if (response.status === 499) (error as any).isCancellation = true; 
    throw error;
  }
  if (response.status === 204) return undefined as unknown as T; // No Content
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  return response.text() as unknown as T; 
};


export const scanLogService = {
  // --- Job Management ---
  initiateFileUploadJob: async (filesMetadata: {fileName: string, fileSize: number}[]): Promise<JobCreationResponse> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${JOBS_BASE_URL}/initiate/files`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ files: filesMetadata }), credentials: 'include',
    });
    return handleApiResponse<JobCreationResponse>(response);
  },

  uploadFileForJob: async (jobId: string, file: File, onProgress?: (loaded: number, total: number) => void): Promise<FileUploadResponse> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const formData = new FormData();
    formData.append('audioFile', file); 

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${JOBS_BASE_URL}/${jobId}/upload-file/${encodeURIComponent(file.name)}`, true); 
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(event.loaded, event.total);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try { resolve(JSON.parse(xhr.responseText)); }
                catch (e) { reject(new Error("Invalid JSON response from server after file upload.")); }
            } else {
                let errorMsg = `File upload failed: ${xhr.status}`;
                try { const errResp = JSON.parse(xhr.responseText); if (errResp.message) errorMsg = errResp.message; }
                catch (e) { /* use default */ }
                const error = new Error(errorMsg); (error as any).status = xhr.status;
                reject(error);
            }
        };
        xhr.onerror = () => {
            const error = new Error("Network error during file upload."); (error as any).status = 0; 
            reject(error);
        };
        xhr.send(formData);
    });
  },

  initiateSpotifyPlaylistJob: async (playlistUrl: string): Promise<JobCreationResponse> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${JOBS_BASE_URL}/initiate/spotify-playlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ spotifyPlaylistUrl: playlistUrl }), credentials: 'include',
    });
    return handleApiResponse<JobCreationResponse>(response);
  },
  
  getAllJobs: async (): Promise<ScanJob[]> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(JOBS_BASE_URL, { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    const data = await handleApiResponse<AllJobsResponse>(response);
    return data.jobs;
  },

  getJob: async (jobId: string): Promise<ScanJob> => { 
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${JOBS_BASE_URL}/${jobId}`, { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse<SingleJobResponse>(response); 
  },

  resumeJob: async (jobId: string): Promise<ScanJob> => { 
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${JOBS_BASE_URL}/${jobId}/resume`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse<SingleJobResponse>(response);
  },

  deleteJob: async (jobId: string): Promise<void> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${JOBS_BASE_URL}/${jobId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    await handleApiResponse<void>(response);
  },
  
  getScanLogs: async (): Promise<TrackScanLog[]> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(LOGS_BASE_URL, { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse<TrackScanLog[]>(response);
  },

  saveScanLog: async (logData: Omit<TrackScanLog, 'logId' | 'scanDate' >): Promise<TrackScanLog> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(LOGS_BASE_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(logData), credentials: 'include',
    });
    return handleApiResponse<TrackScanLog>(response);
  },

   addSpotifyTrackToLog: async (spotifyTrackLink: string): Promise<TrackScanLog> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${LOGS_BASE_URL}/manual-spotify-add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ spotifyTrackLink }), credentials: 'include',
    });
    return handleApiResponse<TrackScanLog>(response);
  },
  
  deleteScanLog: async (logId: string): Promise<void> => { 
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${LOGS_BASE_URL}/${logId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    await handleApiResponse<void>(response);
  },

  clearAllScanLogs: async (): Promise<void> => { 
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(LOGS_BASE_URL, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    await handleApiResponse<void>(response);
  },
};