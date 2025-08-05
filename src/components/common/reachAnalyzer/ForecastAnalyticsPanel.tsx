import React, { useMemo } from 'react';
import { DailyAnalyticsSnapshot } from '../../../types';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ForecastAnalyticsPanelProps {
  data: DailyAnalyticsSnapshot[];
  metric: 'cumulativeFollowers' | 'cumulativeStreams';
  color?: string;
}

// Simple linear regression for forecasting
function linearForecast(data: { date: string; value: number }[], days: number) {
  if (data.length < 2) return [];
  const n = data.length;
  const x = data.map((_, i) => i + 1);
  const y = data.map(d => d.value);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const lastDate = new Date(data[data.length - 1].date);
  const forecast = [];
  for (let i = 1; i <= days; i++) {
    const forecastX = n + i;
    const forecastValue = slope * forecastX + intercept;
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(lastDate.getDate() + i);
    forecast.push({
      date: forecastDate.toISOString().slice(0, 10),
      value: Math.round(forecastValue),
      isForecast: true,
    });
  }
  return forecast;
}

const ForecastAnalyticsPanel: React.FC<ForecastAnalyticsPanelProps> = ({ data, metric, color = '#0074D9' }) => {
  const chartData = useMemo(() => {
    const base = data.map(d => ({
      date: d.date,
      value: d[metric] ?? 0,
      isForecast: false,
    })).filter(d => d.value > 0);
    const forecast = linearForecast(base, 7);
    return [...base, ...forecast];
  }, [data, metric]);

  return (
    <div className="win95-border-outset bg-white p-3 mb-4">
      <h3 className="text-base font-bold mb-1">{metric === 'cumulativeFollowers' ? 'Followers Trend & Forecast' : 'Streams Trend & Forecast'}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={10} />
          <YAxis />
          <Tooltip formatter={(value: any) => value.toLocaleString()} />
          <Legend />
          <Line type="monotone" dataKey="value" stroke={color} dot={false} name="Actual" isAnimationActive={false} strokeWidth={2} />
          <Line type="monotone" dataKey="value" stroke="#FF4136" dot={false} name="Forecast" isAnimationActive={false} strokeDasharray="5 5" strokeWidth={2}
            data={chartData.filter(d => d.isForecast)} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-600 mt-1">Forecast is a simple linear projection based on recent history.</div>
    </div>
  );
};

export default ForecastAnalyticsPanel;
