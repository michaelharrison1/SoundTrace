/**
 * Client-side forecasting utilities for stream prediction
 * Uses the same StreamClout data as the Stream History tab
 */

export interface HistoryPoint {
  date: string;
  streams: number;
}

export interface ForecastPoint {
  date: string;
  predictedStreams: number;
}

/**
 * Simple linear trend forecasting based on historical data
 * Uses the last N days to calculate trend and project forward
 */
export function generateLinearForecast(
  history: HistoryPoint[], 
  daysToForecast: number
): ForecastPoint[] {
  if (history.length < 2) {
    // Not enough data for meaningful forecast - return zero predictions
    const lastDate = history.length > 0 ? new Date(history[0].date) : new Date();
    const results: ForecastPoint[] = [];
    
    for (let i = 1; i <= daysToForecast; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);
      results.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedStreams: 0
      });
    }
    return results;
  }

  // Sort by date to ensure proper order
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate daily increments (new streams per day)
  const dailyIncrements: { date: string; increment: number }[] = [];
  for (let i = 1; i < sortedHistory.length; i++) {
    const prevDay = sortedHistory[i - 1];
    const currentDay = sortedHistory[i];
    const increment = Math.max(0, currentDay.streams - prevDay.streams); // Ensure non-negative
    dailyIncrements.push({
      date: currentDay.date,
      increment
    });
  }

  if (dailyIncrements.length === 0) {
    // Fallback: no increments calculated
    const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
    const results: ForecastPoint[] = [];
    
    for (let i = 1; i <= daysToForecast; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);
      results.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedStreams: 0
      });
    }
    return results;
  }

  // Use recent trend for forecasting (last 7 days or all available data if less)
  const recentDays = Math.min(7, dailyIncrements.length);
  const recentIncrements = dailyIncrements.slice(-recentDays);
  
  // Calculate average daily increment over recent period
  const avgDailyIncrement = recentIncrements.reduce((sum, day) => sum + day.increment, 0) / recentIncrements.length;
  
  // Apply some smoothing - if trend is too volatile, dampen it
  const smoothedIncrement = Math.max(0, avgDailyIncrement * 0.8); // Slightly conservative forecast
  
  // Generate forecast
  const lastHistoricalDate = new Date(sortedHistory[sortedHistory.length - 1].date);
  const results: ForecastPoint[] = [];
  
  for (let i = 1; i <= daysToForecast; i++) {
    const forecastDate = new Date(lastHistoricalDate);
    forecastDate.setDate(lastHistoricalDate.getDate() + i);
    
    results.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedStreams: Math.round(smoothedIncrement)
    });
  }

  return results;
}

/**
 * Simple moving average forecasting
 * Uses the average of recent daily increments
 */
export function generateMovingAverageForecast(
  history: HistoryPoint[], 
  daysToForecast: number,
  windowSize: number = 7
): ForecastPoint[] {
  if (history.length < 2) {
    const lastDate = history.length > 0 ? new Date(history[0].date) : new Date();
    const results: ForecastPoint[] = [];
    
    for (let i = 1; i <= daysToForecast; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);
      results.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedStreams: 0
      });
    }
    return results;
  }

  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate daily increments
  const dailyIncrements: number[] = [];
  for (let i = 1; i < sortedHistory.length; i++) {
    const increment = Math.max(0, sortedHistory[i].streams - sortedHistory[i - 1].streams);
    dailyIncrements.push(increment);
  }

  if (dailyIncrements.length === 0) {
    const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
    const results: ForecastPoint[] = [];
    
    for (let i = 1; i <= daysToForecast; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(lastDate.getDate() + i);
      results.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedStreams: 0
      });
    }
    return results;
  }

  // Use moving average of recent increments
  const effectiveWindowSize = Math.min(windowSize, dailyIncrements.length);
  const recentIncrements = dailyIncrements.slice(-effectiveWindowSize);
  const movingAverage = recentIncrements.reduce((sum, inc) => sum + inc, 0) / recentIncrements.length;
  
  // Generate forecast
  const lastHistoricalDate = new Date(sortedHistory[sortedHistory.length - 1].date);
  const results: ForecastPoint[] = [];
  
  for (let i = 1; i <= daysToForecast; i++) {
    const forecastDate = new Date(lastHistoricalDate);
    forecastDate.setDate(lastHistoricalDate.getDate() + i);
    
    results.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedStreams: Math.round(movingAverage)
    });
  }

  return results;
}

/**
 * Aggregate forecasts from multiple tracks
 */
export function aggregateForecasts(forecasts: ForecastPoint[][]): ForecastPoint[] {
  const dateMap = new Map<string, number>();
  
  forecasts.forEach(trackForecast => {
    trackForecast.forEach(point => {
      dateMap.set(point.date, (dateMap.get(point.date) || 0) + point.predictedStreams);
    });
  });
  
  return Array.from(dateMap.entries())
    .map(([date, predictedStreams]) => ({ date, predictedStreams }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
