
import React, { useEffect, useState, useCallback } from 'react';
import { AggregatedSongData, HistoricalSongStreamEntry, PredictedStreamEntry } from '../../../types';
import { analyticsService } from '../../../services/analyticsService';
import TimeBasedAnalyticsGraph from './TimeBasedAnalyticsGraph';
import ProgressBar from '../ProgressBar';
import MusicNoteIcon from '../../icons/MusicNoteIcon';
import Button from '../Button'; // For forecast range buttons

interface SongStreamDetailProps {
  song: AggregatedSongData;
  onClose: () => void; // Callback to clear selection
}

type ForecastRangeOption = { label: string; days: number };
const forecastRanges: ForecastRangeOption[] = [
  { label: 'Next 30 Days', days: 30 },
  { label: 'Next 90 Days', days: 90 },
  { label: 'Next 180 Days', days: 180 },
];

const SongStreamDetail: React.FC<SongStreamDetailProps> = ({ song, onClose }) => {
  const [history, setHistory] = useState<HistoricalSongStreamEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [forecast, setForecast] = useState<PredictedStreamEntry[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [selectedForecastRange, setSelectedForecastRange] = useState<ForecastRangeOption>(forecastRanges[0]);

  useEffect(() => {
    if (!song.spotifyTrackId) {
      setHistoryError("Selected song has no Spotify Track ID to fetch history.");
      setIsLoadingHistory(false);
      setForecastError("Cannot forecast without historical data.");
      setIsLoadingForecast(false);
      return;
    }

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      setHistory([]);
      try {
        const songHistoryData = await analyticsService.getSongStreamHistory(song.spotifyTrackId);
        setHistory(songHistoryData);

      } catch (err: any) {
        console.error("Error fetching song stream history:", err);
        setHistoryError(err.message || "Failed to load song stream history.");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [song.spotifyTrackId, song.latestStreamCount]); // Removed song.latestStreamCount from deps as history is independent of it

  const fetchForecast = useCallback(async (rangeDays: number) => {
    if (!song.spotifyTrackId || historyError) { // Don't fetch if no ID or if history already failed
      setForecastError("Cannot generate forecast due to missing ID or history error.");
      return;
    }
    setIsLoadingForecast(true);
    setForecastError(null);
    setForecast([]);
    try {
      const forecastData = await analyticsService.getSongStreamForecast(song.spotifyTrackId, rangeDays);
      setForecast(forecastData);
    } catch (err: any) {
      console.error("Error fetching song stream forecast:", err);
      setForecastError(err.message || "Failed to load stream forecast.");
    } finally {
      setIsLoadingForecast(false);
    }
  }, [song.spotifyTrackId, historyError]);

  // Fetch forecast when history is loaded and a range is selected
  useEffect(() => {
    if (!isLoadingHistory && history.length > 0 && !historyError) {
      fetchForecast(selectedForecastRange.days);
    } else if (!isLoadingHistory && (history.length === 0 || historyError)){
      // If history loading is done and there's no history or an error, clear forecast section
      setForecast([]);
      setForecastError(historyError || "No historical data to generate forecast.");
      setIsLoadingForecast(false);
    }
  }, [isLoadingHistory, history, historyError, selectedForecastRange, fetchForecast]);


  return (
    <div className="mt-4 p-3 win95-border-outset bg-[#C0C0C0]">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-base font-semibold text-black">Stream Details & Forecast:</h4>
        <button onClick={onClose} className="win95-button-sm !px-1.5 !py-0.5" title="Close song detail view">X</button>
      </div>
      
      <div className="flex items-center mb-3 p-1 win95-border-inset bg-gray-100">
        {song.coverArtUrl ? (
          <img src={song.coverArtUrl} alt={song.title} className="w-12 h-12 object-cover mr-3 win95-border-inset flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 bg-gray-300 win95-border-inset flex items-center justify-center mr-3 flex-shrink-0">
            <MusicNoteIcon className="w-6 h-6 text-gray-500" />
          </div>
        )}
        <div className="overflow-hidden">
          <p className="text-lg text-black font-bold truncate" title={song.title}>{song.title}</p>
          <p className="text-sm text-gray-700 truncate" title={song.artist}>{song.artist}</p>
          {song.albumName && <p className="text-xs text-gray-600 truncate" title={song.albumName}>Album: {song.albumName}</p>}
        </div>
      </div>

      {/* Historical Streams Section */}
      <h5 className="text-sm font-semibold text-black mt-3 mb-1">Historical Streams</h5>
      {isLoadingHistory && <ProgressBar text={`Loading history for ${song.title}...`} />}
      {historyError && <p className="text-sm text-red-600 text-center py-3">{historyError}</p>}
      {!isLoadingHistory && !historyError && history.length > 0 && (
        <TimeBasedAnalyticsGraph
          data={history}
          dataKey="streams"
          isLoading={false}
          graphColor="#1DB954" 
          valueLabel="Streams"
          title=""
          description={`Daily stream counts. Use brush to zoom/pan.`}
        />
      )}
      {!isLoadingHistory && !historyError && history.length === 0 && (
        <p className="text-sm text-gray-700 text-center py-3">No detailed historical stream data available for this song.</p>
      )}

      {/* Future Stream Forecast Section */}
      <hr className="my-4 border-t-2 border-b-2 border-t-gray-400 border-b-white" />
      <h5 className="text-sm font-semibold text-black mt-3 mb-1">Future Stream Forecast (Daily Average)</h5>
      <div className="flex items-center space-x-1 mb-2">
        <span className="text-xs text-black mr-1">Forecast:</span>
        {forecastRanges.map(fr => (
          <Button
            key={fr.days}
            onClick={() => setSelectedForecastRange(fr)}
            size="sm"
            className={`!text-xs !px-1 !py-0.5 ${selectedForecastRange.days === fr.days ? '!shadow-none !translate-x-[0.5px] !translate-y-[0.5px] !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white' : 'win95-border-outset'}`}
            disabled={isLoadingForecast || isLoadingHistory || !!historyError}
          >
            {fr.label}
          </Button>
        ))}
      </div>

      {isLoadingForecast && <ProgressBar text={`Generating forecast for ${selectedForecastRange.label}...`} />}
      {forecastError && !isLoadingForecast && <p className="text-sm text-red-600 text-center py-3">{forecastError}</p>}
      {!isLoadingForecast && !forecastError && forecast.length > 0 && (
        <TimeBasedAnalyticsGraph
          data={forecast.map(f => ({ date: f.date, streams: f.predictedStreams }))} // Adapt data structure for graph
          dataKey="streams" // "streams" here means predicted daily streams
          isLoading={false}
          graphColor="#FFA500" // Orange for forecast
          valueLabel="Predicted Daily Streams"
          title=""
          description={`Predicted average daily streams for the ${selectedForecastRange.label}.`}
        />
      )}
      {!isLoadingForecast && !forecastError && forecast.length === 0 && history.length > 0 && (
        <p className="text-sm text-gray-700 text-center py-3">Could not generate forecast for the selected period.</p>
      )}
    </div>
  );
};

export default React.memo(SongStreamDetail);
