import React, { useState, useEffect } from 'react';
import { XMarkIcon, CloudIcon, SunIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SeasonalAdaptation = ({ isOpen, onClose, isDarkMode, onSeasonalSettingsChange }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [seasonalSettings, setSeasonalSettings] = useState({
    winterMode: false,
    rainyMode: false,
    summerMode: false,
    stormMode: false,
    autoAdapt: true
  });
  const [loading, setLoading] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadWeatherData();
      determineCurrentSeason();
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-adapt based on weather conditions
    if (seasonalSettings.autoAdapt && weatherData) {
      autoAdaptToWeather();
    }
  }, [weatherData, seasonalSettings.autoAdapt]);

  const loadWeatherData = async () => {
    setLoading(true);
    try {
      // This would call a real weather API
      const mockWeatherData = {
        temperature: 15,
        precipitation: 0.2,
        windSpeed: 15,
        conditions: 'partly_cloudy',
        humidity: 65,
        pressure: 1013,
        visibility: 10,
        forecast: [
          { day: 'Today', temp: 15, precip: 0.2, condition: 'partly_cloudy' },
          { day: 'Tomorrow', temp: 12, precip: 0.8, condition: 'rainy' },
          { day: 'Day 3', temp: 8, precip: 0.1, condition: 'cloudy' }
        ]
      };
      
      setWeatherData(mockWeatherData);
    } catch (error) {
      console.error('Failed to load weather data:', error);
      toast.error('Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const determineCurrentSeason = () => {
    const month = new Date().getMonth();
    let season = '';
    
    if (month >= 2 && month <= 4) season = 'Spring';
    else if (month >= 5 && month <= 7) season = 'Summer';
    else if (month >= 8 && month <= 10) season = 'Fall';
    else season = 'Winter';
    
    setCurrentSeason(season);
  };

  const autoAdaptToWeather = () => {
    if (!weatherData) return;

    const newSettings = { ...seasonalSettings };

    // Winter conditions
    if (weatherData.temperature < 0 || weatherData.conditions.includes('snow')) {
      newSettings.winterMode = true;
      newSettings.rainyMode = false;
      newSettings.summerMode = false;
      newSettings.stormMode = false;
    }
    // Rainy conditions
    else if (weatherData.precipitation > 0.5 || weatherData.conditions.includes('rain')) {
      newSettings.winterMode = false;
      newSettings.rainyMode = true;
      newSettings.summerMode = false;
      newSettings.stormMode = false;
    }
    // Storm conditions
    else if (weatherData.windSpeed > 30 || weatherData.conditions.includes('storm')) {
      newSettings.winterMode = false;
      newSettings.rainyMode = false;
      newSettings.summerMode = false;
      newSettings.stormMode = true;
    }
    // Summer conditions
    else if (weatherData.temperature > 25) {
      newSettings.winterMode = false;
      newSettings.rainyMode = false;
      newSettings.summerMode = true;
      newSettings.stormMode = false;
    }
    // Clear conditions
    else {
      newSettings.winterMode = false;
      newSettings.rainyMode = false;
      newSettings.summerMode = false;
      newSettings.stormMode = false;
    }

    setSeasonalSettings(newSettings);
    onSeasonalSettingsChange(newSettings);
    
    // Show notification
    const activeModes = Object.entries(newSettings)
      .filter(([key, value]) => value && key !== 'autoAdapt')
      .map(([key]) => key.replace('Mode', '').toLowerCase());
    
    if (activeModes.length > 0) {
      toast.success(`Auto-adapted to ${activeModes.join(', ')} conditions`);
    }
  };

  const handleSettingChange = (setting, value) => {
    const newSettings = { ...seasonalSettings, [setting]: value };
    setSeasonalSettings(newSettings);
    onSeasonalSettingsChange(newSettings);
    
    if (value) {
      toast.success(`${setting.replace('Mode', '').toLowerCase()} mode activated`);
    }
  };

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'snow':
      case 'snowy':
        return <CloudIcon className="h-6 w-6 text-blue-400" />;
      case 'rain':
      case 'rainy':
        return <CloudIcon className="h-6 w-6 text-gray-500" />;
      case 'storm':
      case 'stormy':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      case 'clear':
      case 'sunny':
        return <SunIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <CloudIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getSeasonalRecommendations = () => {
    const recommendations = [];
    
    if (seasonalSettings.winterMode) {
      recommendations.push(
        'Use snow routes and avoid steep hills',
        'Consider longer but safer routes',
        'Allow extra travel time for winter conditions'
      );
    }
    
    if (seasonalSettings.rainyMode) {
      recommendations.push(
        'Avoid areas prone to flooding',
        'Use covered walkways when available',
        'Consider indoor route alternatives'
      );
    }
    
    if (seasonalSettings.stormMode) {
      recommendations.push(
        'Avoid exposed areas and high winds',
        'Use sheltered routes and transit',
        'Consider delaying travel if possible'
      );
    }
    
    if (seasonalSettings.summerMode) {
      recommendations.push(
        'Prefer shaded routes and water fountains',
        'Use air-conditioned transit options',
        'Plan for hydration stops'
      );
    }
    
    return recommendations;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className={`inline-block align-bottom ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full`}>
          {/* Header */}
          <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} px-6 py-4 border-b border-gray-200 dark:border-gray-600`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CloudIcon className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Seasonal Adaptation Mode
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-md ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={`px-6 py-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Weather */}
                {weatherData && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Current Weather & Season
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        {getWeatherIcon(weatherData.conditions)}
                        <div className="ml-3">
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {weatherData.conditions.replace('_', ' ')}
                          </p>
                          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {weatherData.temperature}°C
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Precipitation: {Math.round(weatherData.precipitation * 100)}%
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Wind: {weatherData.windSpeed} km/h
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Season: {currentSeason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Auto-Adaptation Toggle */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Auto-Adaptation
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Automatically adjust routing based on weather conditions
                      </p>
                    </div>
                    <button
                      onClick={() => handleSettingChange('autoAdapt', !seasonalSettings.autoAdapt)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        seasonalSettings.autoAdapt
                          ? 'bg-indigo-600'
                          : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          seasonalSettings.autoAdapt ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Seasonal Modes */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Seasonal Modes
                  </h3>
                  <div className="space-y-3">
                    {[
                      { key: 'winterMode', label: 'Winter Mode', icon: CloudIcon, description: 'Optimize for snow and ice conditions' },
                      { key: 'rainyMode', label: 'Rainy Mode', icon: CloudIcon, description: 'Avoid flooded areas and prefer covered routes' },
                      { key: 'stormMode', label: 'Storm Mode', icon: ExclamationTriangleIcon, description: 'Avoid exposed areas and high winds' },
                      { key: 'summerMode', label: 'Summer Mode', icon: SunIcon, description: 'Prefer shaded routes and cooling stations' }
                    ].map((mode) => (
                      <div key={mode.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center">
                          <mode.icon className={`h-5 w-5 mr-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <div>
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {mode.label}
                            </p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {mode.description}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSettingChange(mode.key, !seasonalSettings[mode.key])}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            seasonalSettings[mode.key]
                              ? 'bg-indigo-600'
                              : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              seasonalSettings[mode.key] ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {getSeasonalRecommendations().length > 0 && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {getSeasonalRecommendations().map((recommendation, index) => (
                        <li key={index} className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <span className="text-indigo-600 mr-2">•</span>
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weather Forecast */}
                {weatherData?.forecast && (
                  <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-lg font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      3-Day Forecast
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {weatherData.forecast.map((day, index) => (
                        <div key={index} className="text-center">
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {day.day}
                          </p>
                          <div className="flex justify-center my-2">
                            {getWeatherIcon(day.condition)}
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {day.temp}°C
                          </p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {Math.round(day.precip * 100)}% rain
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonalAdaptation;
