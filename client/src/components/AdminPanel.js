import React, { useState, useMemo } from 'react';

const AdminPanel = React.memo(({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('reports');
  const [barriers] = useState([]); // Placeholder for barrier data

  // Tab definitions
  const tabs = useMemo(() => [
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
        </svg>
      )
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      )
    }
  ], []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleExportData = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  const handleGenerateReport = () => {
    // Generate report functionality
    console.log('Generating report...');
  };

  if (!isOpen) return null;

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2 className="panel-title">Admin Dashboard</h2>
        <button
          onClick={onClose}
          className="panel-close"
          aria-label="Close admin panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="panel-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              aria-pressed={activeTab === tab.id}
            >
              <div className="tab-icon">{tab.icon}</div>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="reports-tab">
              <div className="tab-header">
                <h3>Barrier Reports</h3>
                <div className="tab-actions">
                  <button
                    onClick={handleExportData}
                    className="action-button secondary"
                    aria-label="Export reports"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    <span>Export</span>
                  </button>
                  <button
                    onClick={handleGenerateReport}
                    className="action-button primary"
                    aria-label="Generate report"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>

              <div className="reports-list">
                {barriers.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <h4>No Reports Yet</h4>
                    <p>Barrier reports from users will appear here</p>
                  </div>
                ) : (
                  barriers.map((barrier, index) => (
                    <div key={index} className="report-item">
                      <div className="report-header">
                        <span className="report-type">{barrier.type}</span>
                        <span className="report-date">{barrier.date}</span>
                      </div>
                      <div className="report-content">
                        <p className="report-description">{barrier.description}</p>
                        <p className="report-location">{barrier.location}</p>
                      </div>
                      <div className="report-actions">
                        <button className="action-button small">View Details</button>
                        <button className="action-button small">Mark Resolved</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              <div className="tab-header">
                <h3>Accessibility Analytics</h3>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <div className="card-header">
                    <h4>Total Barriers</h4>
                    <span className="card-value">127</span>
                  </div>
                  <div className="card-chart">
                    {/* Chart placeholder */}
                    <div className="chart-placeholder">Chart</div>
                  </div>
                </div>

                <div className="analytics-card">
                  <div className="card-header">
                    <h4>Most Common Issues</h4>
                  </div>
                  <div className="card-list">
                    <div className="list-item">
                      <span className="item-label">Missing Curb Cuts</span>
                      <span className="item-value">45</span>
                    </div>
                    <div className="list-item">
                      <span className="item-label">Blocked Sidewalks</span>
                      <span className="item-value">32</span>
                    </div>
                    <div className="list-item">
                      <span className="item-label">Poor Lighting</span>
                      <span className="item-value">28</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <div className="card-header">
                    <h4>Resolution Rate</h4>
                    <span className="card-value">78%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '78%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Infrastructure Tab */}
          {activeTab === 'infrastructure' && (
            <div className="infrastructure-tab">
              <div className="tab-header">
                <h3>City Infrastructure</h3>
              </div>

              <div className="infrastructure-sections">
                <div className="section">
                  <h4>Accessibility Features</h4>
                  <div className="feature-list">
                    <div className="feature-item">
                      <span className="feature-label">Accessible Parking Spaces</span>
                      <span className="feature-count">1,247</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Curb Cuts</span>
                      <span className="feature-count">3,892</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Accessible Transit Stops</span>
                      <span className="feature-count">156</span>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <h4>Maintenance Schedule</h4>
                  <div className="maintenance-list">
                    <div className="maintenance-item">
                      <div className="maintenance-info">
                        <span className="maintenance-title">Sidewalk Repairs</span>
                        <span className="maintenance-location">Downtown District</span>
                      </div>
                      <span className="maintenance-status scheduled">Scheduled</span>
                    </div>
                    <div className="maintenance-item">
                      <div className="maintenance-info">
                        <span className="maintenance-title">Curb Cut Installation</span>
                        <span className="maintenance-location">West End</span>
                      </div>
                      <span className="maintenance-status in-progress">In Progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AdminPanel.displayName = 'AdminPanel';

export default AdminPanel;
