import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { Trade } from '../../types';

// Register required ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export type ChartTimeframe = 'all' | '1d' | '1w' | '1m' | '3m' | '6m' | '1y';
export type ChartType = 'equity' | 'drawdown' | 'pnl' | 'cumulative';

interface PerformanceChartProps {
  trades: Trade[];
  chartType: ChartType;
  timeframe?: ChartTimeframe;
  title?: string;
  height?: number;
  initialBalance?: number;
  showVolume?: boolean;
  className?: string;
}

/**
 * Chart component to visualize trading performance with multiple view types
 */
const PerformanceChart: React.FC<PerformanceChartProps> = ({
  trades,
  chartType = 'equity',
  timeframe = 'all',
  title,
  height = 300,
  initialBalance = 10000,
  showVolume = false,
  className = '',
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);

  // Filter trades based on timeframe
  const filteredTrades = useFilterTradesByTimeframe(sortedTrades, timeframe);

  // Generate appropriate chart data based on chart type
  const { labels, datasets, options } = useChartConfiguration(
    filteredTrades,
    chartType,
    title || getDefaultTitle(chartType),
    initialBalance,
    showVolume
  );

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div style={{ height: `${height}px` }}>
        <Line data={{ labels, datasets }} options={options} ref={chartRef} />
      </div>
    </div>
  );
};

// Get default chart title based on chart type
function getDefaultTitle(chartType: ChartType): string {
  switch (chartType) {
    case 'equity':
      return 'Equity Curve';
    case 'drawdown':
      return 'Drawdown Analysis';
    case 'pnl':
      return 'Profit & Loss';
    case 'cumulative':
      return 'Cumulative Returns';
    default:
      return 'Performance Chart';
  }
}

// Filter trades based on selected timeframe
function useFilterTradesByTimeframe(trades: Trade[], timeframe: ChartTimeframe): Trade[] {
  if (timeframe === 'all') {
    return trades;
  }

  const now = new Date().getTime();
  let cutoffTime: number;

  switch (timeframe) {
    case '1d':
      cutoffTime = now - 24 * 60 * 60 * 1000;
      break;
    case '1w':
      cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case '1m':
      cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case '3m':
      cutoffTime = now - 90 * 24 * 60 * 60 * 1000;
      break;
    case '6m':
      cutoffTime = now - 180 * 24 * 60 * 60 * 1000;
      break;
    case '1y':
      cutoffTime = now - 365 * 24 * 60 * 60 * 1000;
      break;
    default:
      return trades;
  }

  return trades.filter(trade => trade.timestamp >= cutoffTime);
}

// Generate chart configuration based on chart type
function useChartConfiguration(
  trades: Trade[],
  chartType: ChartType,
  title: string,
  initialBalance: number,
  showVolume: boolean
) {
  // Generate timestamps for x-axis
  const timestamps = trades.map(trade => new Date(trade.timestamp));

  // Calculate chart data based on chart type
  switch (chartType) {
    case 'equity':
      return generateEquityCurve(trades, timestamps, title, initialBalance, showVolume);
    case 'drawdown':
      return generateDrawdownChart(trades, timestamps, title, initialBalance);
    case 'pnl':
      return generatePnLChart(trades, timestamps, title);
    case 'cumulative':
      return generateCumulativeReturnsChart(trades, timestamps, title);
    default:
      return generateEquityCurve(trades, timestamps, title, initialBalance, showVolume);
  }
}

// Generate equity curve chart
function generateEquityCurve(
  trades: Trade[],
  timestamps: Date[],
  title: string,
  initialBalance: number,
  showVolume: boolean
) {
  // Calculate equity curve points
  let balance = initialBalance;
  const balancePoints = [{ x: timestamps[0] || new Date(), y: balance }];

  const volumes: { x: Date; y: number }[] = [];

  trades.forEach((trade, index) => {
    const pnl = trade.pnl || 0;
    balance += pnl;
    balancePoints.push({ x: new Date(trade.timestamp), y: balance });

    if (showVolume) {
      volumes.push({
        x: new Date(trade.timestamp),
        y: trade.amount * trade.price,
      });
    }
  });

  // Generate datasets
  const datasets = [
    {
      label: 'Account Balance',
      data: balancePoints,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true,
      yAxisID: 'y',
    },
  ];

  if (showVolume && volumes.length > 0) {
    datasets.push({
      label: 'Volume',
      data: volumes,
      backgroundColor: 'rgba(156, 163, 175, 0.5)',
      borderColor: 'rgba(156, 163, 175, 0.8)',
      borderWidth: 1,
      type: 'bar' as const,
      yAxisID: 'volume',
    });
  }

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: determineTimeUnit(timestamps),
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        title: {
          display: true,
          text: 'Date/Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Balance',
        },
        ticks: {
          callback: (value: number) => `$${value.toFixed(2)}`,
        },
      },
      ...(showVolume
        ? {
            volume: {
              position: 'right' as const,
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: 'Volume',
              },
              ticks: {
                callback: (value: number) => `$${value.toFixed(0)}`,
              },
            },
          }
        : {}),
    },
    plugins: {
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            if (context.dataset.label === 'Account Balance') {
              return `Balance: $${context.parsed.y.toFixed(2)}`;
            } else if (context.dataset.label === 'Volume') {
              return `Volume: $${context.parsed.y.toFixed(2)}`;
            }
            return context.dataset.label;
          },
        },
      },
    },
  };

  return { labels: timestamps, datasets, options };
}

// Generate drawdown chart
function generateDrawdownChart(
  trades: Trade[],
  timestamps: Date[],
  title: string,
  initialBalance: number
) {
  // Calculate drawdown series
  let balance = initialBalance;
  let peak = initialBalance;
  const drawdownPoints: { x: Date; y: number }[] = [{ x: timestamps[0] || new Date(), y: 0 }];

  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    balance += pnl;

    // Update peak if we have a new high
    if (balance > peak) {
      peak = balance;
    }

    // Calculate drawdown percentage
    const drawdownPercent = peak > 0 ? ((peak - balance) / peak) * 100 : 0;

    drawdownPoints.push({
      x: new Date(trade.timestamp),
      y: drawdownPercent,
    });
  });

  // Drawdown dataset
  const datasets = [
    {
      label: 'Drawdown %',
      data: drawdownPoints,
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      tension: 0.2,
      fill: true,
    },
  ];

  // Calculate maximum drawdown for annotation
  const maxDrawdown = Math.max(...drawdownPoints.map(p => p.y));
  const maxDrawdownDate = drawdownPoints.find(p => p.y === maxDrawdown)?.x;

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: determineTimeUnit(timestamps),
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        title: {
          display: true,
          text: 'Date/Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Drawdown %',
        },
        ticks: {
          callback: (value: number) => `${value.toFixed(2)}%`,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `Drawdown: ${context.parsed.y.toFixed(2)}%`,
        },
      },
      annotation: {
        annotations: {
          maxDrawdownLine: {
            type: 'line',
            yMin: maxDrawdown,
            yMax: maxDrawdown,
            borderColor: 'rgb(220, 38, 38)',
            borderWidth: 1,
            borderDash: [5, 5],
            label: {
              content: `Max Drawdown: ${maxDrawdown.toFixed(2)}%`,
              enabled: true,
              position: 'end',
            },
          },
        },
      },
    },
  };

  return { labels: timestamps, datasets, options };
}

// Generate P&L chart
function generatePnLChart(trades: Trade[], timestamps: Date[], title: string) {
  // Extract P&L values for each trade
  const pnlPoints = trades.map(trade => ({
    x: new Date(trade.timestamp),
    y: trade.pnl || 0,
  }));

  // Create datasets
  const datasets = [
    {
      label: 'Trade P&L',
      data: pnlPoints,
      backgroundColor: (context: any) => {
        // Red for losses, green for profits
        const value = context.raw?.y || 0;
        return value >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
      },
      borderColor: (context: any) => {
        const value = context.raw?.y || 0;
        return value >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
      },
      borderWidth: 1,
      type: 'bar' as const,
    },
  ];

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: determineTimeUnit(timestamps),
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        title: {
          display: true,
          text: 'Date/Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Profit/Loss',
        },
        ticks: {
          callback: (value: number) => `$${value.toFixed(2)}`,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `P&L: ${value >= 0 ? '+' : ''}$${value.toFixed(2)}`;
          },
        },
      },
    },
  };

  return { labels: timestamps, datasets, options };
}

// Generate cumulative returns chart
function generateCumulativeReturnsChart(trades: Trade[], timestamps: Date[], title: string) {
  // Calculate cumulative returns percentage
  let cumulativeReturn = 0;
  const returnPoints = [{ x: timestamps[0] || new Date(), y: 0 }];

  trades.forEach(trade => {
    const pnl = trade.pnl || 0;
    const pnlPercent = trade.pnlPercent || 0;

    // Add percentage return for this trade
    cumulativeReturn += pnlPercent;

    returnPoints.push({
      x: new Date(trade.timestamp),
      y: cumulativeReturn,
    });
  });

  // Create datasets
  const datasets = [
    {
      label: 'Cumulative Returns %',
      data: returnPoints,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true,
    },
  ];

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: determineTimeUnit(timestamps),
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        title: {
          display: true,
          text: 'Date/Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Returns %',
        },
        ticks: {
          callback: (value: number) => `${value.toFixed(2)}%`,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `Return: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
          },
        },
      },
    },
  };

  return { labels: timestamps, datasets, options };
}

// Determine the appropriate time unit based on the date range
function determineTimeUnit(timestamps: Date[]): 'hour' | 'day' | 'week' | 'month' {
  if (timestamps.length < 2) return 'day';

  const firstDate = timestamps[0];
  const lastDate = timestamps[timestamps.length - 1];
  const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays < 1) {
    return 'hour';
  } else if (diffDays < 14) {
    return 'day';
  } else if (diffDays < 60) {
    return 'week';
  } else {
    return 'month';
  }
}

export default PerformanceChart;
