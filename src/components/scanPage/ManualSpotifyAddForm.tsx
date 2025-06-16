
import React, { useState } from 'react';
import Button from '../common/Button';

interface ManualSpotifyAddFormProps {
  onAddTrack: (link: string) => Promise<boolean>; // Returns true on success for form clearing
}

const ManualSpotifyAddForm: React.FC<ManualSpotifyAddFormProps> = ({ onAddTrack }) => {
  const [manualSpotifyLink, setManualSpotifyLink] = useState<string>('');
  const [isAddingManualLink, setIsAddingManualLink] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<string | null>(null); 

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualSpotifyLink.trim()) {
      setFormMessage("Please enter a Spotify track link.");
      return;
    }
    setIsAddingManualLink(true);
    setFormMessage(null);

    const success = await onAddTrack(manualSpotifyLink);
    
    setIsAddingManualLink(false);
    if (success) {
      setManualSpotifyLink(''); 
    }
  };

  return (
    <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
      <div className="p-3 bg-[#C0C0C0]">
        <h3 className="text-lg font-normal text-black mb-2">Manually Add Spotify Track</h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label htmlFor="spotifyLink" className="block text-sm text-black mb-0.5">Spotify Track Link:</label>
            <input
              id="spotifyLink"
              type="url"
              value={manualSpotifyLink}
              onChange={(e) => { setManualSpotifyLink(e.target.value); setFormMessage(null); }}
              placeholder="https://open.spotify.com/track/..."
              className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
              disabled={isAddingManualLink}
              aria-label="Spotify Track Link"
            />
          </div>
          <Button type="submit" size="md" isLoading={isAddingManualLink} disabled={isAddingManualLink || !manualSpotifyLink.trim()}>
            {isAddingManualLink ? 'Adding...' : 'Add to Scan Log'}
          </Button>
        </form>
        {formMessage && (
            <div className={`mt-2 p-1.5 text-xs border bg-red-100 border-red-700 text-red-700`}>
                {formMessage}
            </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(ManualSpotifyAddForm);
