import React from 'react';

const HeatmapLegend = ({ isVisible = true, isDarkMode = false }) => {
  if (!isVisible) return null;

  const legendItems = [
    { color: isDarkMode ? '#1a1a1a' : '#ffffff', label: 'Safe Zone', type: 'accessibility' },
    { color: isDarkMode ? '#1e3a8a' : '#dbeafe', label: 'Low Risk', type: 'low' },
    { color: isDarkMode ? '#fbbf24' : '#fef3c7', label: 'Medium Risk', type: 'medium' },
    { color: isDarkMode ? '#f97316' : '#fed7aa', label: 'High Risk', type: 'high' },
    { color: isDarkMode ? '#dc2626' : '#fecaca', label: 'Very High Risk', type: 'very-high' },
    { color: isDarkMode ? '#7f1d1d' : '#fca5a5', label: 'Critical Risk', type: 'critical' }
  ];

  return (
    <div className={`absolute top-4 right-4 z-50 p-3 rounded-lg shadow-lg border ${
      isDarkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-200'
    }`}>
      <h3 className="text-sm font-semibold mb-2">Accessibility Heatmap</h3>
      <div className="space-y-1">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div 
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Click on areas for details
      </div>
    </div>
  );
};

export default HeatmapLegend;
