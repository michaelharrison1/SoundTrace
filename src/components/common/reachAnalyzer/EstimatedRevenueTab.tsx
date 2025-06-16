
import React, { useState, useMemo } from 'react';
import { AggregatedSongData } from '../../../types';
import useLocalStorage from '../../../../hooks/useLocalStorage'; // Assuming correct path
import { formatFollowersDisplay } from './reachAnalyzerUtils'; // For stream count display

interface EstimatedRevenueTabProps {
  uniqueSongsWithStreamCounts: AggregatedSongData[];
  totalStreams: number | null | undefined;
  isLoading: boolean; // Overall loading state from parent
}

const EstimatedRevenueTab: React.FC<EstimatedRevenueTabProps> = ({
  uniqueSongsWithStreamCounts,
  totalStreams,
  isLoading,
}) => {
  const [payoutRate, setPayoutRate] = useLocalStorage<number>('soundtrace_payoutRate', 0.004);
  const [inputPayoutRate, setInputPayoutRate] = useState<string>(payoutRate.toString());

  const handlePayoutRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPayoutRate(e.target.value);
    const newRate = parseFloat(e.target.value);
    if (!isNaN(newRate) && newRate >= 0) {
      setPayoutRate(newRate);
    }
  };
  
  const handlePayoutRateBlur = () => {
    // If input is invalid on blur, reset it to the last valid stored rate
    const newRate = parseFloat(inputPayoutRate);
    if (isNaN(newRate) || newRate < 0) {
        setInputPayoutRate(payoutRate.toString());
    } else {
        setPayoutRate(newRate); // Ensure payoutRate state is updated if only inputPayoutRate changed
    }
  };

  const calculatedTotalRevenue = useMemo(() => {
    if (typeof totalStreams !== 'number' || totalStreams === null || isNaN(payoutRate)) {
      return null;
    }
    return totalStreams * payoutRate;
  }, [totalStreams, payoutRate]);

  const songsWithRevenue = useMemo(() => {
    return uniqueSongsWithStreamCounts
      .map(song => ({
        ...song,
        estimatedRevenue: song.latestStreamCount * payoutRate,
      }))
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
  }, [uniqueSongsWithStreamCounts, payoutRate]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return 'N/A';
    // Show more precision for smaller amounts
    const precision = value < 1 ? 4 : 2;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision })}`;
  };

  return (
    <div className="p-2 text-black">
      <h4 className="text-base font-semibold text-black mb-2 text-center">Estimated Spotify Revenue</h4>
      
      <div className="mb-3 p-2 win95-border-inset bg-gray-100">
        <label htmlFor="payoutRate" className="block text-sm font-normal text-black mb-0.5">
          Per-Stream Payout Rate ($):
        </label>
        <input
          id="payoutRate"
          type="number"
          value={inputPayoutRate}
          onChange={handlePayoutRateChange}
          onBlur={handlePayoutRateBlur}
          step="0.0001"
          min="0"
          className="w-full sm:w-1/3 px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
          aria-label="Per-stream payout rate"
        />
        <p className="text-xs text-gray-600 mt-0.5">
          Default is $0.004. Adjust based on your distributor or estimates. Saved locally.
        </p>
      </div>

      <div className="mb-4 text-center p-2 win95-border-outset bg-gray-100">
        <p className="text-sm text-black">Total Estimated Revenue:</p>
        <p className="text-2xl font-bold text-green-700">
          {isLoading && typeof totalStreams === 'undefined' ? 'Calculating...' : formatCurrency(calculatedTotalRevenue)}
        </p>
      </div>

      <h5 className="text-sm font-semibold text-black mt-3 mb-1">Per-Song Revenue Breakdown:</h5>
      {isLoading && songsWithRevenue.length === 0 ? (
        <p className="text-center text-gray-600 py-3">Loading song data...</p>
      ) : songsWithRevenue.length === 0 ? (
        <p className="text-center text-gray-600 py-3">No songs with stream data found to estimate revenue.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto win95-border-inset bg-white p-0.5">
          <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-[#C0C0C0] sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080]" style={{ width: '45%' }}>Song Title</th>
                <th scope="col" className="px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080]" style={{ width: '25%' }}>Artist</th>
                <th scope="col" className="px-2 py-1 text-center font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080]" style={{ width: '15%' }}>Streams</th>
                <th scope="col" className="px-2 py-1 text-center font-normal text-black win95-border-outset border-b-2 border-b-[#808080]" style={{ width: '15%' }}>Est. Revenue</th>
              </tr>
            </thead>
            <tbody>
              {songsWithRevenue.map(song => (
                <tr key={song.spotifyTrackId} className="border-b border-gray-300 last:border-b-0">
                  <td className="px-2 py-1.5 text-gray-800 truncate" title={song.title}>{song.title}</td>
                  <td className="px-2 py-1.5 text-gray-800 truncate" title={song.artist}>{song.artist}</td>
                  <td className="px-2 py-1.5 text-gray-800 text-center">{formatFollowersDisplay(song.latestStreamCount)}</td>
                  <td className="px-2 py-1.5 text-gray-800 text-center font-semibold">{formatCurrency(song.estimatedRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-2 win95-border-outset bg-yellow-100 text-yellow-800 border border-yellow-700">
        <p className="text-sm font-semibold">Disclaimer:</p>
        <ul className="list-disc list-inside text-xs space-y-0.5 mt-0.5">
          <li>Revenue estimates are based on the per-stream rate you provide and aggregated stream counts from StreamClout.</li>
          <li>Actual payout rates vary significantly based on distributor, listener location, subscription type (free/premium), and other factors.</li>
          <li>These figures are for estimation purposes only and do not represent actual earnings.</li>
          <li>StreamClout data might have its own update frequency and accuracy limitations.</li>
        </ul>
      </div>
    </div>
  );
};

export default React.memo(EstimatedRevenueTab);