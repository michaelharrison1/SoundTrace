
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ScanResult, AcrCloudMatch } from '../src/types'; // Corrected path

// Vercel specific config to disable body parsing for formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to map ACRCloud music data to AcrCloudMatch type
const mapToAcrCloudMatch = (track: any): AcrCloudMatch => {
  return {
    id: track.acrid,
    title: track.title || 'Unknown Title',
    artist: track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
    album: track.album?.name || 'Unknown Album',
    releaseDate: track.release_date || 'N/A',
    matchConfidence: track.score || 0,
    platformLinks: {
      spotify: track.external_metadata?.spotify?.track?.id
        ? `https://open.spotify.com/track/${track.external_metadata.spotify.track.id}`
        : undefined,
      youtube: track.external_metadata?.youtube?.vid
        ? `https://www.youtube.com/watch?v=${track.external_metadata.youtube.vid}`
        : undefined,
      // appleMusic: undefined, // ACRCloud response structure for Apple Music not shown in example
    },
    streamCounts: { // Not directly available from ACRCloud's basic identification
      spotify: undefined,
      youtube: undefined,
    },
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { ACR_CLOUD_HOST, ACR_CLOUD_ACCESS_KEY, ACR_CLOUD_ACCESS_SECRET } = process.env;

  if (!ACR_CLOUD_HOST || !ACR_CLOUD_ACCESS_KEY || !ACR_CLOUD_ACCESS_SECRET) {
    console.error('ACRCloud environment variables not set.');
    return res.status(500).json({ message: 'Server configuration error for audio scanning.' });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const audioFile = files.audioFile?.[0];

    if (!audioFile) {
      return res.status(400).json({ message: 'No audio file uploaded.' });
    }

    const http_method = 'POST';
    const http_uri = '/v1/identify';
    const data_type = 'audio';
    const signature_version = '1';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const string_to_sign = `${http_method}\n${http_uri}\n${ACR_CLOUD_ACCESS_KEY}\n${data_type}\n${signature_version}\n${timestamp}`;

    const signature = crypto
      .createHmac('sha1', ACR_CLOUD_ACCESS_SECRET)
      .update(string_to_sign)
      .digest('base64');

    const audioBuffer = fs.readFileSync(audioFile.filepath);

    const acrFormData = new FormData();
    acrFormData.append('sample', new Blob([audioBuffer], { type: audioFile.mimetype || 'audio/mpeg' }), audioFile.originalFilename || 'upload.mp3');
    acrFormData.append('access_key', ACR_CLOUD_ACCESS_KEY);
    acrFormData.append('sample_bytes', audioFile.size.toString());
    acrFormData.append('timestamp', timestamp);
    acrFormData.append('signature', signature);
    acrFormData.append('data_type', data_type);
    acrFormData.append('signature_version', signature_version);

    const reqUrl = `https://${ACR_CLOUD_HOST}${http_uri}`;

    const acrApiResponse = await fetch(reqUrl, {
      method: 'POST',
      body: acrFormData,
    });

    const responseText = await acrApiResponse.text(); // Read as text first for better error diagnosis

    if (!acrApiResponse.ok) {
        console.error(`ACRCloud API Error (${acrApiResponse.status}): ${responseText}`);
        let friendlyMessage = `ACRCloud API Error: ${acrApiResponse.status}.`;
        try {
            const errorJson = JSON.parse(responseText);
            if (errorJson.status && errorJson.status.msg) {
                friendlyMessage = `ACRCloud: ${errorJson.status.msg}`;
            }
        } catch(e) { /* ignore parse error if not json */ }
        return res.status(acrApiResponse.status || 500).json({ message: friendlyMessage });
    }

    const acrResult = JSON.parse(responseText);

    if (acrResult.status?.code === 0) { // Success
      const matches: AcrCloudMatch[] = acrResult.metadata?.music?.map(mapToAcrCloudMatch) || [];
      const scanResult: ScanResult = {
        scanId: `acrscan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        instrumentalName: audioFile.originalFilename || 'Uploaded File',
        instrumentalSize: audioFile.size,
        scanDate: new Date().toISOString(),
        matches: matches,
      };
      return res.status(200).json(scanResult);
    } else if (acrResult.status?.code === 1001) { // No result
        const scanResult: ScanResult = {
            scanId: `acrscan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            instrumentalName: audioFile.originalFilename || 'Uploaded File',
            instrumentalSize: audioFile.size,
            scanDate: new Date().toISOString(),
            matches: [],
        };
        return res.status(200).json(scanResult);
    }
     else { // Other ACRCloud error codes
      console.error('ACRCloud recognition error:', acrResult.status?.msg);
      return res.status(500).json({ message: `ACRCloud error: ${acrResult.status?.msg || 'Failed to identify track'}` });
    }

  } catch (error: any) {
    console.error('Error in /api/scan-track:', error);
    // If formidable parsing error or other unexpected
    if (error.message.includes("maxFileSize exceeded")) {
        return res.status(413).json({message: "File size limit exceeded."});
    }
    return res.status(500).json({ message: error.message || 'Server error during scan.' });
  } finally {
    // formidable creates temp files, attempt to clean up if file path exists
    // Note: Vercel's /tmp directory is ephemeral and read-only for subsequent invocations,
    // but good practice to try cleaning if applicable and possible.
    // Formidable might handle this itself based on options.
  }
}
