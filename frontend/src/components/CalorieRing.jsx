import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

export function CalorieRing({ consumed, target }) {
  const remaining = target > 0 ? Math.max(0, target - consumed) : 0;
  const data = target > 0
    ? {
      datasets: [
        {
          data: [consumed, remaining],
          backgroundColor: ['#22c55e', '#e5e7eb'],
          borderWidth: 0,
          cutout: '75%',
        },
      ],
    }
    : {
      datasets: [
        {
          data: [1, 0],
          backgroundColor: ['#e5e7eb', '#f9fafb'],
          borderWidth: 0,
          cutout: '75%',
        },
      ],
    };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
    },
    animation: {
      animateRotate: true,
      animateScale: false,
    },
  };

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">
          {consumed} <span className="text-gray-400">/</span> {target}
        </span>
        <span className="text-sm text-gray-500">kcal</span>
      </div>
    </div>
  );
}