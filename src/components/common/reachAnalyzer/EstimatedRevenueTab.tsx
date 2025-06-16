
import React, { useState, useMemo, useCallback } from 'react';
import { AggregatedSongData } from '../../../types';
import useLocalStorage from '../../../../hooks/useLocalStorage';
import { formatFollowersDisplay } from './reachAnalyzerUtils';
import ProgressBar from '../ProgressBar'; // Assuming ProgressBar is styled for Win95 theme

interface EstimatedRevenueTabProps {
  uniqueSongsWithStreamCounts: AggregatedSongData[];
  totalStreams: number | null | undefined;
  isLoading: boolean;
}

const EstimatedRevenueTab: React.FC<EstimatedRevenueTabProps> = ({
  uniqueSongsWithStreamCounts,
  totalStreams,
  isLoading,
}) => {
  const [payoutRate, setPayoutRate] = useLocalStorage<number>('soundtrace_payoutRate_v2', 0.0035);
  const [inputPayoutRate, setInputPayoutRate] = useState<string>(payoutRate.toString());
  const [inputError, setInputError] = useState<string | null>(null);

  const handlePayoutRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPayoutRate(e.target.value);
    const newRate = parseFloat(e.target.value);
    if (!isNaN(newRate) && newRate >= 0) {
      setPayoutRate(newRate);
      setInputError(null);
    } else if (e.target.value.trim() === "") {
        setInputError("Payout rate cannot be empty.");
    } else {
      setInputError("Invalid rate. Please enter a positive number.");
    }
  }, [setPayoutRate]);
  
  const handlePayoutRateBlur = useCallback(() => {
    const newRate = parseFloat(inputPayoutRate);
    if (isNaN(newRate) || newRate < 0) {
        setInputPayoutRate(payoutRate.toString()); // Revert to last valid stored rate
        setInputError(newRate < 0 ? "Rate must be positive." : "Invalid number for payout rate.");
    } else {
        setPayoutRate(newRate); // Ensure stored value is updated if valid
        setInputError(null);
    }
  }, [inputPayoutRate, payoutRate, setPayoutRate]);

  const calculatedTotalRevenue = useMemo(() => {
    if (typeof totalStreams !== 'number' || totalStreams === null || isNaN(payoutRate) || payoutRate < 0) {
      return null;
    }
    return totalStreams * payoutRate;
  }, [totalStreams, payoutRate]);

  const songsWithRevenue = useMemo(() => {
    if (isNaN(payoutRate) || payoutRate < 0) return [];
    return uniqueSongsWithStreamCounts
      .map(song => ({
        ...song,
        estimatedRevenue: song.latestStreamCount * payoutRate,
      }))
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
  }, [uniqueSongsWithStreamCounts, payoutRate]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined' || isNaN(value)) {
      return 'N/A';
    }
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  return (
    <div className="p-3 space-y-4 text-black">
      <div>
        <h3 className="text-lg font-semibold text-center mb-1">Estimated Streaming Revenue</h3>
        <p className="text-xs text-gray-700 text-center mb-2">
          Based on StreamClout data. This is a rough estimate and actual earnings may vary.
        </p>
      </div>

      <div className="p-2 win95-border-outset bg-gray-100 text-sm">
        <label htmlFor="payoutRate" className="block font-normal mb-1">
          Payout Rate per Stream (USD):
        </label>
        <input
          id="payoutRate"
          type="number"
          value={inputPayoutRate}
          onChange={handlePayoutRateChange}
          onBlur={handlePayoutRateBlur}
          step="0.0001"
          min="0"
          className="w-32 px-2 py-1 text-sm bg-white text-black win95-border-inset focus:outline-none rounded-none"
          aria-label="Payout rate per stream"
        />
        {inputError && <p className="text-xs text-red-600 mt-0.5">{inputError}</p>}
        <p className="text-xs text-gray-600 mt-0.5">
          (e.g., Spotify average is often cited around $0.003 - $0.005)
        </p>
      </div>

      {isLoading && typeof totalStreams === 'undefined' ? (
        <ProgressBar text="Loading total stream data..." />
      ) : (
        <div className="p-2 win95-border-outset bg-green-100">
          <h4 className="font-semibold text-green-800">Total Estimated Revenue:</h4>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(calculatedTotalRevenue)}
          </p>
          {typeof totalStreams === 'number' && (
            <p className="text-xs text-green-600">
              (from {formatFollowersDisplay(totalStreams)} total streams at ${payoutRate.toFixed(4)}/stream)
            </p>
          )}
        </div>
      )}

      {isLoading && songsWithRevenue.length === 0 ? (
         <ProgressBar text="Loading song revenue data..." />
      ) : songsWithRevenue.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-base font-semibold">Per-Song Estimated Revenue:</h4>
          <div className="max-h-60 overflow-y-auto win95-border-inset bg-white p-0.5">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-1 text-left font-normal text-black bg-gray-300 win95-border-outset border-b-2 border-r-2 border-gray-400">Song Title</th>
                  <th className="px-2 py-1 text-left font-normal text-black bg-gray-300 win95-border-outset border-b-2 border-r-2 border-gray-400">Artist</th>
                  <th className="px-2 py-1 text-right font-normal text-black bg-gray-300 win95-border-outset border-b-2 border-r-2 border-gray-400">Streams (SC)</th>
                  <th className="px-2 py-1 text-right font-normal text-black bg-gray-300 win95-border-outset border-b-2 border-gray-400">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {songsWithRevenue.map((song, index) => (
                  <tr key={song.spotifyTrackId || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="px-2 py-1 border-b border-gray-300 truncate" title={song.title}>{song.title}</td>
                    <td className="px-2 py-1 border-b border-gray-300 truncate" title={song.artist}>{song.artist}</td>
                    <td className="px-2 py-1 border-b border-gray-300 text-right">{formatFollowersDisplay(song.latestStreamCount)}</td>
                    <td className="px-2 py-1 border-b border-gray-300 text-right">{formatCurrency(song.estimatedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !isLoading ? (
        <p className="text-center text-gray-600">No stream data available to calculate revenue.</p>
      ) : null}
    </div>
  );
};

export default React.memo(EstimatedRevenueTab);
