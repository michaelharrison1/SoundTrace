
import React from 'react';

const AppIntroduction: React.FC = () => {
  return (
    <div className="w-full md:w-2/3 p-0.5 win95-border-outset bg-[#C0C0C0] order-1 md:order-1 flex flex-col">
      <div className="bg-[#C0C0C0] p-6 h-full text-black flex-grow">
        <h3 className="text-xl font-normal mb-4">Unlock Your Music's Full Potential.</h3>
        <p className="text-base mb-3">
          SoundTrace is your comprehensive toolkit for tracking where your instrumentals are used and understanding their impact. We leverage powerful APIs like <strong className="text-blue-700">ACRCloud</strong> for robust music identification and <strong className="text-green-700">StreamClout</strong> for up-to-date stream analytics.
        </p>
        <ul className="list-none space-y-1.5 mb-3 text-base">
          <li>✔ <strong className="text-black">Discover Placements:</strong> Scan audio files or YouTube content (via our <a href="https://soundtrace.uk/download/latest" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">SoundTrace Downloader app</a>) to find where your beats are being used.</li>
          <li>✔ <strong className="text-black">Track Performance:</strong> Monitor historical stream counts for matched songs and visualize trends with dynamic charts.</li>
          <li>✔ <strong className="text-black">Predict Future Streams:</strong> Utilize our predictive modeling to forecast potential stream growth for your tracks.</li>
          <li>✔ <strong className="text-black">Estimate Revenue:</strong> Calculate potential earnings based on stream data and customizable payout rates.</li>
          <li>✔ <strong className="text-black">Spotify Integration:</strong> Connect your Spotify to export matched tracks into playlists and gain insights into artist follower counts.</li>
          <li>✔ <strong className="text-black">Dynamic Dashboard:</strong> Explore your data through interactive visualizations like the "Bubble Galaxy" and detailed statistical breakdowns.</li>
        </ul>
        <p className="text-base mb-3">
          From identifying song usage to forecasting performance and estimating revenue, SoundTrace provides the insights you need to make informed decisions about your music catalog.
        </p>
        <p className="text-xs text-gray-700 mt-4">
          Note: Some features, like YouTube scanning, require the SoundTrace Downloader desktop app. Spotify and Google integrations require account linking. Stream data accuracy depends on third-party API availability.
        </p>
      </div>
    </div>
  );
};

export default React.memo(AppIntroduction);
