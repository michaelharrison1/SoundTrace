
import React from 'react';

const AppIntroduction: React.FC = () => {
  return (
    <div className="w-full md:w-2/3 p-0.5 win95-border-outset bg-[#C0C0C0] order-1 md:order-1 flex flex-col">
      <div className="bg-[#C0C0C0] p-6 h-full text-black flex-grow">
        <h3 className="text-xl font-normal mb-4">Producers, find out who's using your beats!</h3>
        <p className="text-base mb-3">
          SoundTrace scans over 100 million tracks to discover where your instrumentals are used, so you never miss a placement.
        </p>
        <ul className="list-none space-y-1 mb-3 text-base">
            <li>✔ Track your music across platforms</li>
            <li>✔ Get names of artists and links to tracks</li>
            <li>✔ Powered by industry-leading audio recognition.</li>
        </ul>
        <p className="text-base mb-3">
          Now with <strong className="text-green-700">Spotify playlist exporting</strong>! Connect your Spotify account to easily create playlists from your matched tracks.
        </p>
        <p className="text-base">
          Get Spotify links, estimate reach from artist followers, and discover where your music is being played.
        </p>
         <p className="text-xs text-gray-700 mt-4">
          Note: Spotify features require account connection.
        </p>
      </div>
    </div>
  );
};

export default React.memo(AppIntroduction);