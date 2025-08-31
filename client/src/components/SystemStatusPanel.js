import React, { useState, useEffect, useRef } from 'react';
import apiIntegrationManager from '../services/apiIntegrationManager';

const SystemStatusPanel = ({ isOpen, onClose }) => {
  const [systemStatus, setSystemStatus] = useState(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      updateSystemStatus();
      const interval = setInterval(updateSystemStatus, 5000);
      refreshIntervalRef.current = interval;
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isOpen]);

  const updateSystemStatus = React.useCallback(() => {
    const status = apiIntegrationManager.getSystemStatus();
    setSystemStatus(status);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'failed':
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      case 'unknown':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthPercentage = (health) => {
    if (!health || !health.overall) return 0;
    return Math.round(health.overall);
  };

  const getHealthColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {systemStatus ? (
            <div className="p-6 space-y-6">
              {/* Overall System Health */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Overall System Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getHealthColor(getHealthPercentage(systemStatus.healthStatus))}`}>
                      {getHealthPercentage(systemStatus.healthStatus)}%
                    </div>
                    <div className="text-sm text-gray-600">System Health</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {systemStatus.performanceMetrics?.totalRequests || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {systemStatus.performanceMetrics?.successfulRequests || 0}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                </div>
              </div>

              {/* Service Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(systemStatus.serviceStatus || {}).map(([service, status]) => (
                    <div key={service} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 capitalize">{service}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </div>
                      {systemStatus.healthStatus?.performance?.[service] && (
                        <div className="mt-2 text-sm text-gray-600">
                          <div>Response: {Math.round(systemStatus.healthStatus.performance[service].avgResponseTime || 0)}ms</div>
                          <div>Error Rate: {Math.round((systemStatus.healthStatus.performance[service].errorRate || 0) * 100)}%</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Flow Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data Flow Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(systemStatus.dataFlowStatus || {}).map(([flow, status]) => (
                    <div key={flow} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{flow.replace('_to_', ' → ')}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                          {status.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div>Type: {status.dataType}</div>
                        <div>Priority: {status.priority}</div>
                        <div>Last Update: {new Date(status.lastUpdate).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Quality Scores */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data Quality Scores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(systemStatus.dataHarmonization?.qualityScores || {}).map(([service, score]) => (
                    <div key={service} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 capitalize">{service}</span>
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.round(score * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(systemStatus.performanceMetrics?.averageResponseTime || 0)}ms
                    </div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {systemStatus.performanceMetrics?.successfulRequests || 0}
                    </div>
                    <div className="text-sm text-gray-600">Successful Requests</div>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {systemStatus.performanceMetrics?.failedRequests || 0}
                    </div>
                    <div className="text-sm text-gray-600">Failed Requests</div>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {systemStatus.dataHarmonization?.conflicts || 0}
                    </div>
                    <div className="text-sm text-gray-600">Data Conflicts</div>
                  </div>
                </div>
              </div>

              {/* Recent Errors */}
              {systemStatus.healthStatus?.recentErrors?.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Errors</h3>
                  <div className="space-y-2">
                    {systemStatus.healthStatus.recentErrors.slice(0, 5).map((error, index) => (
                      <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-red-800">{error.service}</span>
                          <span className="text-sm text-red-600">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm text-red-700 mt-1">{error.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* System Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Initialized</div>
                    <div className="font-medium text-gray-900">
                      {systemStatus.isInitialized ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Last Harmonization</div>
                    <div className="font-medium text-gray-900">
                      {systemStatus.dataHarmonization?.lastHarmonization 
                        ? new Date(systemStatus.dataHarmonization.lastHarmonization).toLocaleString()
                        : 'Never'
                      }
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Data Conflicts Resolved</div>
                    <div className="font-medium text-gray-900">
                      {systemStatus.dataHarmonization?.resolutions || 0}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Last Request</div>
                    <div className="font-medium text-gray-900">
                      {systemStatus.performanceMetrics?.lastRequestTime
                        ? new Date(systemStatus.performanceMetrics.lastRequestTime).toLocaleTimeString()
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading system status...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between items-center">
          <button
            onClick={updateSystemStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Status
          </button>
          <div className="text-sm text-gray-500">
            Last updated: {systemStatus ? new Date().toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPanel;

