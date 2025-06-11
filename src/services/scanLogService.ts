import { TrackScanLog, YouTubeUploadType, ScanJobState, ActiveScanJobResponse, InitiateBatchScanResponse } from '../types';

const defaultApiBaseUrl = 'https://api.soundtrace.uk';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const BASE_URL = `${API_BASE_URL}/api/scanlogs`;

const getAuthToken = (): string | null => {
  try { return localStorage.getItem('authToken'); } catch (error) { console.error("Error accessing authToken:", error); return null; }
};

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData: { message?: string } = {};
    try { errorData = await response.json(); } catch (e) { /* ignore */ }
    const errorMessage = errorData.message || `Request failed: ${response.status} ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage); (error as any).status = response.status;
    if (response.status === 499) (error as any).isCancellation = true;
    throw error;
  }
  if (response.status === 204) return; // No Content
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  return response.text();
};

export const scanLogService = {
  getScanLogs: async (): Promise<TrackScanLog[]> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(BASE_URL, { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse(response);
  },

  saveScanLog: async (logData: Omit<TrackScanLog, 'logId' | 'scanDate' | 'scanJobId'>): Promise<TrackScanLog> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(BASE_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(logData), credentials: 'include',
    });
    return handleApiResponse(response);
  },

  deleteScanLog: async (logId: string): Promise<void> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/${logId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    await handleApiResponse(response);
  },

  clearAllScanLogs: async (): Promise<void> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(BASE_URL, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    await handleApiResponse(response);
  },

  addSpotifyTrackToLog: async (spotifyTrackLink: string): Promise<TrackScanLog> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/manual-spotify-add`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ spotifyTrackLink }), credentials: 'include',
    });
    return handleApiResponse(response);
  },

  // Updated to handle both single and batch initiation
  processYouTubeUrl: async (url: string, processType: YouTubeUploadType): Promise<TrackScanLog | InitiateBatchScanResponse> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const body = { youtubeUrl: url, processType };
    const response = await fetch(`${BASE_URL}/process-youtube-url`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body), credentials: 'include',
    });
    // If it's a batch operation, backend now responds with { scanJobId, message, initialJobStatus }
    // If single, it responds with TrackScanLog
    return handleApiResponse(response);
  },

  processSpotifyPlaylistUrl: async (url: string): Promise<TrackScanLog[]> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/process-spotify-playlist-url`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ spotifyPlaylistUrl: url }), credentials: 'include',
    });
    return handleApiResponse(response);
  },

  // New ScanJob specific methods
  getActiveScanJob: async (): Promise<ActiveScanJobResponse> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/youtube/active-job`, { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse(response);
  },

  getScanJobStatus: async (scanJobId: string): Promise<ScanJobState> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/youtube/job/status/${scanJobId}`, { headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse(response);
  },

  pauseScanJob: async (scanJobId: string): Promise<{ message: string, jobStatus: ScanJobState['status'] }> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/youtube/job/pause/${scanJobId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse(response);
  },

  resumeScanJob: async (scanJobId: string): Promise<{ message: string, jobStatus: ScanJobState['status'] }> => {
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/youtube/job/resume/${scanJobId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse(response);
  },

  abortScanJob: async (scanJobId: string): Promise<{ message: string }> => { // Updated from void
    const token = getAuthToken(); if (!token) { const e = new Error("Not authenticated."); (e as any).status = 401; throw e; }
    const response = await fetch(`${BASE_URL}/youtube/job/abort/${scanJobId}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, credentials: 'include' });
    return handleApiResponse(response);
  },
};