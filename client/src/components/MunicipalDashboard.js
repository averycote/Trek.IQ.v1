import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon, 
  MapIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const MunicipalDashboard = ({ isOpen, onClose, isDarkMode }) => {
  const [analytics, setAnalytics] = useState(null);
  const [datasetStats, setDatasetStats] = useState({});
  const [recentBarriers, setRecentBarriers] = useState([]);
  const [predictiveInsights, setPredictiveInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedView, setSelectedView] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
    }
  }, [selectedTimeframe, isOpen]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load analytics
      const analyticsResponse = await fetch(`/api/ai/analytics?startDate=${getStartDate(selectedTimeframe)}`);
      const analyticsData = await analyticsResponse.json();
      setAnalytics(analyticsData.analytics);

      // Load dataset statistics
      const statsResponse = await fetch('/api/ai/dataset-stats');
      const statsData = await statsResponse.json();
      setDatasetStats(statsData.stats);

      // Load recent barriers
      const barriersResponse = await fetch('/api/barriers?limit=10');
      const barriersData = await barriersResponse.json();
      setRecentBarriers(barriersData.barriers || []);

      // Load predictive insights
      const insightsResponse = await fetch('/api/ai/predictive-maintenance');
      const insightsData = await insightsResponse.json();
      setPredictiveInsights(insightsData.insights?.recommendations || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (timeframe) => {
    const now = new Date();
    switch (timeframe) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'new':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-7xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div>
              <h2 className="text-2xl font-bold">Municipal Dashboard</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Halifax Accessibility Infrastructure Monitoring
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Municipal Dashboard</h1>
                      <p className="text-gray-600 dark:text-gray-300">Halifax Accessibility Infrastructure Monitoring</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <select
                        value={selectedTimeframe}
                        onChange={(e) => setSelectedTimeframe(e.target.value)}
                        className={`px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                      >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                      </select>
                      <button
                        onClick={loadDashboardData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow`}>
                  <div className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <nav className="flex space-x-8 px-6">
                      {[
                        { id: 'overview', name: 'Overview', icon: ChartBarIcon },
                        { id: 'barriers', name: 'Barrier Reports', icon: ExclamationTriangleIcon },
                        { id: 'datasets', name: 'Datasets', icon: MapIcon },
                        { id: 'insights', name: 'AI Insights', icon: InformationCircleIcon }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedView(tab.id)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                            selectedView === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : `border-transparent ${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`
                          }`}
                        >
                          <tab.icon className="h-5 w-5" />
                          <span>{tab.name}</span>
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Overview Tab */}
                {selectedView === 'overview' && (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Barriers</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {analytics?.totalBarriers || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <CheckCircleIcon className="h-8 w-8 text-green-500" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {analytics?.resolvedBarriers || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <ClockIcon className="h-8 w-8 text-yellow-500" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Resolution Time</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {Math.round(analytics?.averageResolutionTime || 0)} days
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <XCircleIcon className="h-8 w-8 text-orange-500" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unresolved</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {analytics?.unresolvedBarriers || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barrier Status Breakdown */}
                    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Barrier Status Breakdown</h3>
                      <div className="space-y-3">
                        {analytics?.statusBreakdown && Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                {status.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">{status}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(count / analytics.totalBarriers) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                      <div className="space-y-4">
                        {recentBarriers.slice(0, 5).map((barrier) => (
                          <div key={barrier.id} className={`flex items-center justify-between p-3 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'} rounded-lg`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(barrier.priority).split(' ')[0]}`}></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{barrier.type}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{barrier.location}</p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(barrier.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Barrier Analytics Tab */}
                {selectedView === 'barriers' && (
                  <div className="space-y-6">
                    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Barrier Analytics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Barriers by Type</h4>
                          <div className="space-y-2">
                            {analytics?.typeBreakdown && Object.entries(analytics.typeBreakdown).map(([type, count]) => (
                              <div key={type} className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-300">{type}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Barriers by Severity</h4>
                          <div className="space-y-2">
                            {analytics?.severityBreakdown && Object.entries(analytics.severityBreakdown).map(([severity, count]) => (
                              <div key={severity} className="flex justify-between items-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(severity)}`}>
                                  {severity.toUpperCase()}
                                </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dataset Monitoring Tab */}
                {selectedView === 'datasets' && (
                  <div className="space-y-6">
                    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dataset Monitoring</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(datasetStats).map(([datasetName, stats]) => (
                          <div key={datasetName} className={`p-4 border rounded-lg ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{datasetName.replace(/_/g, ' ').toUpperCase()}</h4>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Records:</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.count || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated:</span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                            {stats.error && (
                              <div className="text-sm text-red-600">
                                Error: {stats.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights Tab */}
                {selectedView === 'insights' && (
                  <div className="space-y-6">
                    <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Predictive Maintenance Insights</h3>
                      <div className="space-y-4">
                        {predictiveInsights.map((insight, index) => (
                          <div key={index} className={`p-4 border rounded-lg ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{insight.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{insight.description}</p>
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className={`px-2 py-1 rounded-full ${getPriorityColor(insight.priority)}`}>
                                    {insight.priority}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Confidence: {Math.round(insight.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                                Take Action
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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

export default MunicipalDashboard;
