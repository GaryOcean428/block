import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  BarController,
  LineController,
} from 'chart.js';
import type { ChartOptions, ChartData, ChartDataset } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { MarketData } from '../../types';

// Register all required components and controllers
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Filler,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface PriceChartProps {
  data: MarketData[];
  pair: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, pair }) => {
  const filteredData = data.filter(item => item.pair === pair);

  const labels = filteredData.map(item => {
    const date = new Date(item.timestamp);
    return date.toLocaleTimeString();
  });

  // Create specific typed datasets for mixed chart
  const priceDataset: ChartDataset<'line', number[]> = {
    label: `${pair} Price`,
    data: filteredData.map(item => item.close),
    fill: true,
    borderColor: 'rgb(59, 130, 246)',
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    tension: 0.2,
  };

  const volumeDataset: ChartDataset<'bar', number[]> = {
    label: 'Volume',
    data: filteredData.map(item => item.volume),
    type: 'bar',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    yAxisID: 'volume',
  };

  // Create properly typed chart data
  const chartData: ChartData<'line', number[]> = {
    labels,
    datasets: [priceDataset, volumeDataset as unknown as ChartDataset<'line', number[]>],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const dataIndex = context.dataIndex;
            const dataPoint = filteredData[dataIndex];
            return dataPoint
              ? [
                  `Price: $${dataPoint.close.toFixed(2)}`,
                  `High: $${dataPoint.high.toFixed(2)}`,
                  `Low: $${dataPoint.low.toFixed(2)}`,
                  `Volume: ${dataPoint.volume.toFixed(2)}`,
                ]
              : [];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        position: 'left',
        grid: {
          display: true,
        },
      },
      volume: {
        position: 'right',
        grid: {
          display: false,
        },
      },
    },
  };

  return <Chart type="line" options={options} data={chartData} height={80} />;
};

export default PriceChart;
