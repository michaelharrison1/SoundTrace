
import React from 'react';

const AppIntroduction: React.FC = () => {
  return (
    <div className="p-3 text-black" style={{ fontSize: '13px', lineHeight: '1.5' }}> 
      <div className="flex items-center mb-3">
        <img src="/src/components/windows95icons/apps/sound_recorder_32x32.png" alt="SoundTrace Logo" className="w-8 h-8 mr-2" style={{imageRendering: 'pixelated'}}/>
        <h3 className="text-lg font-bold">Welcome to SoundTrace 95!</h3>
      </div>
      <p className="mb-2">
        SoundTrace is your retro toolkit for tracking where your instrumentals are used and understanding their impact. 
        We leverage powerful APIs like <strong style={{color: '#000080'}}>ACRCloud</strong> for music identification and <strong style={{color: '#008000'}}>StreamClout</strong> for stream analytics.
      </p>
      <div className="sunken-panel p-2 my-2 text-xs">
        <strong className="block mb-1">Core Features:</strong>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>Discover Placements:</strong> Scan audio files or YouTube content to find where your beats are being used.</li>
          <li><strong>Track Performance:</strong> Monitor stream counts and visualize trends.</li>
          <li><strong>Predict Future Streams:</strong> Utilize our predictive modeling.</li>
          <li><strong>Estimate Revenue:</strong> Calculate potential earnings.</li>
          <li><strong>Spotify Integration:</strong> Export matched tracks and get artist insights.</li>
        </ul>
      </div>
      <p className="mb-2">
        From identifying song usage to forecasting performance, SoundTrace provides the insights you need.
      </p>
      <p className="text-xs mt-3">
        <strong>Note:</strong> YouTube scanning requires the <a href="https://soundtrace.uk/download/latest" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SoundTrace Downloader</a> app. 
        Integrations with Spotify & Google require account linking via the Start Menu after login. Data accuracy depends on third-party APIs.
      </p>
    </div>
  );
};

export default React.memo(AppIntroduction);
