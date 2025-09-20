import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageWrapper from '../PageWrapper';
import AdminAuthModal from '../AdminAuthModal';

const AdminDashboardPage = ({ onPageOpen, onPageClose }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // FIXED: Notify parent component when page opens/closes
  useEffect(() => {
    if (onPageOpen) {
      onPageOpen();
    }
    return () => {
      if (onPageClose) {
        onPageClose();
      }
    };
  }, [onPageOpen, onPageClose]);

  // Check authentication on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = useCallback(() => {
    const adminAuth = sessionStorage.getItem('adminAuth');
    const storedUser = sessionStorage.getItem('adminUser');
    
    if (adminAuth && storedUser) {
      // Verify the session is still valid
      verifyAdminSession(adminAuth, storedUser);
    } else {
      setIsCheckingAuth(false);
      setShowAuthModal(true);
    }
  }, []);

  const verifyAdminSession = async (authToken, username) => {
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAdminUser(username);
        setShowAuthModal(false);
      } else {
        // Session expired or invalid
        sessionStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminUser');
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error('Session verification failed:', error);
      sessionStorage.removeItem('adminAuth');
      sessionStorage.removeItem('adminUser');
      setShowAuthModal(true);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleAuthentication = (username) => {
    setIsAuthenticated(true);
    setAdminUser(username);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setAdminUser(null);
    setShowAuthModal(true);
    toast.success('Logged out successfully');
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [barriers, setBarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    type: ''
  });
  const [selectedBarrier, setSelectedBarrier] = useState(null);
  const [showBarrierDetail, setShowBarrierDetail] = useState(false);

  // Mock analytics data
  const analyticsData = {
    totalUsers: 1247,
    activeRoutes: 89,
    reportedBarriers: 156,
    resolvedBarriers: 142,
    systemUptime: '99.8%'
  };

  const barrierTypes = {
    steps_stairs: { label: 'Steps / Stairs', icon: '🪜', color: '#EF4444' },
    steep_slope: { label: 'Steep Slope', icon: '📈', color: '#F59E0B' },
    obstructed_path: { label: 'Obstructed Path', icon: '🚧', color: '#F59E0B' },
    inaccessible_entrance: { label: 'Inaccessible Entrance', icon: '🚪', color: '#EF4444' },
    no_curb_cut: { label: 'No Curb Cut', icon: '♿', color: '#10B981' },
    poor_lighting: { label: 'Poor Lighting', icon: '💡', color: '#F59E0B' },
    construction: { label: 'Construction', icon: '🏗️', color: '#DC2626' },
    snow_ice: { label: 'Snow/Ice', icon: '❄️', color: '#3B82F6' },
    other: { label: 'Other', icon: '❓', color: '#6B7280' }
  };

  const severityLevels = {
    low: { label: 'Low', color: '#10B981' },
    medium: { label: 'Medium', color: '#F59E0B' },
    high: { label: 'High', color: '#EF4444' },
    critical: { label: 'Critical', color: '#DC2626' }
  };

  const statusOptions = {
    new: { label: 'New', color: '#3B82F6' },
    in_review: { label: 'In Review', color: '#F59E0B' },
    resolved: { label: 'Resolved', color: '#10B981' }
  };

  const fetchBarriers = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.severity) queryParams.append('severity', filters.severity);
      if (filters.type) queryParams.append('type', filters.type);

      const adminAuth = sessionStorage.getItem('adminAuth');
      const response = await fetch(`/api/barriers?${queryParams}`, {
        headers: {
          'Authorization': `Basic ${adminAuth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to fetch barriers');
      }
      
      const data = await response.json();
      setBarriers(data.barriers);
    } catch (error) {
      console.error('Error fetching barriers:', error);
      toast.error('Failed to load barrier reports');
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthenticated]);

  // Fetch barriers on component mount
  useEffect(() => {
    fetchBarriers();
  }, [fetchBarriers]);

  const updateBarrierStatus = useCallback(async (barrierId, newStatus) => {
    try {
      const adminAuth = sessionStorage.getItem('adminAuth');
      const response = await fetch(`/api/barriers/${barrierId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Basic ${adminAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to update barrier');
      }

      toast.success('Barrier status updated successfully');
      fetchBarriers(); // Refresh the list
    } catch (error) {
      console.error('Error updating barrier:', error);
      toast.error('Failed to update barrier status');
    }
  }, [fetchBarriers]);

  const handleFilterChange = useCallback((filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const handleBarrierClick = useCallback((barrier) => {
    setSelectedBarrier(barrier);
    setShowBarrierDetail(true);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBarrierStats = () => {
    const total = barriers.length;
    const newCount = barriers.filter(b => b.status === 'new').length;
    const inReviewCount = barriers.filter(b => b.status === 'in_review').length;
    const resolvedCount = barriers.filter(b => b.status === 'resolved').length;
    const criticalCount = barriers.filter(b => b.severity === 'critical').length;

    return { total, newCount, inReviewCount, resolvedCount, criticalCount };
  };

  const stats = getBarrierStats();

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <PageWrapper 
        title="Admin Dashboard"
        description="System analytics and barrier management"
        onPageOpen={onPageOpen}
        onPageClose={onPageClose}
      >
        <div className="page-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Verifying admin access...</span>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper 
      title="Admin Dashboard"
      description="System analytics and barrier management"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthentication}
      />
      
      <div className="page-content">
        {/* Only show content if authenticated */}
        {isAuthenticated ? (
          <>
            {/* Admin Header */}
            <div className="admin-header">
              <div className="admin-info">
                <span className="admin-welcome">Welcome, {adminUser}</span>
                <span className="admin-status">● Admin Access</span>
              </div>
              <button
                onClick={handleLogout}
                className="logout-button"
                title="Logout"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-icon">📊</span>
            Overview
          </button>
          <button
            className={`admin-tab ${activeTab === 'barriers' ? 'active' : ''}`}
            onClick={() => setActiveTab('barriers')}
          >
            <span className="tab-icon">⚠️</span>
            Barrier Management
            {stats.newCount > 0 && (
              <span className="tab-badge">{stats.newCount}</span>
            )}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Analytics Overview */}
            <div className="analytics-overview">
              <h2>System Overview</h2>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <div className="analytics-icon">👥</div>
                  <div className="analytics-content">
                    <h3>Total Users</h3>
                    <p className="analytics-value">{analyticsData.totalUsers}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">🗺️</div>
                  <div className="analytics-content">
                    <h3>Active Routes</h3>
                    <p className="analytics-value">{analyticsData.activeRoutes}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">⚠️</div>
                  <div className="analytics-content">
                    <h3>Reported Barriers</h3>
                    <p className="analytics-value">{analyticsData.reportedBarriers}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">✅</div>
                  <div className="analytics-content">
                    <h3>Resolved Barriers</h3>
                    <p className="analytics-value">{analyticsData.resolvedBarriers}</p>
                  </div>
                </div>
                
                <div className="analytics-card">
                  <div className="analytics-icon">⚡</div>
                  <div className="analytics-content">
                    <h3>System Uptime</h3>
                    <p className="analytics-value">{analyticsData.systemUptime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Barrier Statistics */}
            <div className="barrier-stats">
              <h2>Barrier Statistics</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-icon">📊</span>
                    <span className="stat-title">Total Barriers</span>
                  </div>
                  <div className="stat-value">{stats.total}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-icon">🆕</span>
                    <span className="stat-title">New Reports</span>
                  </div>
                  <div className="stat-value new">{stats.newCount}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-icon">👀</span>
                    <span className="stat-title">In Review</span>
                  </div>
                  <div className="stat-value review">{stats.inReviewCount}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-icon">✅</span>
                    <span className="stat-title">Resolved</span>
                  </div>
                  <div className="stat-value resolved">{stats.resolvedCount}</div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-icon">🚨</span>
                    <span className="stat-title">Critical</span>
                  </div>
                  <div className="stat-value critical">{stats.criticalCount}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barriers Tab */}
        {activeTab === 'barriers' && (
          <div className="barriers-content">
            {/* Filters */}
            <div className="barrier-filters">
              <h2>Barrier Management</h2>
              <div className="filter-controls">
                <div className="filter-group">
                  <label htmlFor="status-filter">Status</label>
                  <select
                    id="status-filter"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All Status</option>
                    {Object.entries(statusOptions).map(([key, status]) => (
                      <option key={key} value={key}>{status.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label htmlFor="severity-filter">Severity</label>
                  <select
                    id="severity-filter"
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                  >
                    <option value="">All Severity</option>
                    {Object.entries(severityLevels).map(([key, severity]) => (
                      <option key={key} value={key}>{severity.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label htmlFor="type-filter">Type</label>
                  <select
                    id="type-filter"
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">All Types</option>
                    {Object.entries(barrierTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Barriers Table */}
            <div className="barriers-table-container">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <span>Loading barriers...</span>
                </div>
              ) : barriers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No barriers found</h3>
                  <p>No barrier reports match your current filters.</p>
                </div>
              ) : (
                <div className="barriers-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Description</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barriers.map((barrier) => (
                        <tr key={barrier.id} onClick={() => handleBarrierClick(barrier)}>
                          <td>
                            <div className="barrier-type-cell">
                              <span className="type-icon">{barrierTypes[barrier.type]?.icon}</span>
                              <span className="type-label">{barrierTypes[barrier.type]?.label}</span>
                            </div>
                          </td>
                          <td>
                            <span 
                              className="severity-badge"
                              style={{ backgroundColor: severityLevels[barrier.severity]?.color }}
                            >
                              {severityLevels[barrier.severity]?.label}
                            </span>
                          </td>
                          <td>
                            <div className="description-cell">
                              <span className="description-text">{barrier.description}</span>
                              {barrier.locationDetails && (
                                <span className="location-details">{barrier.locationDetails}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="location-cell">
                              <span className="coordinates">
                                {barrier.latitude.toFixed(4)}, {barrier.longitude.toFixed(4)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: statusOptions[barrier.status]?.color }}
                            >
                              {statusOptions[barrier.status]?.label}
                            </span>
                          </td>
                          <td>
                            <span className="date-text">{formatDate(barrier.createdAt)}</span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBarrierClick(barrier);
                                }}
                                title="View Details"
                              >
                                👁️
                              </button>
                              {barrier.status === 'new' && (
                                <button
                                  className="action-btn review"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateBarrierStatus(barrier.id, 'in_review');
                                  }}
                                  title="Mark as In Review"
                                >
                                  👀
                                </button>
                              )}
                              {barrier.status !== 'resolved' && (
                                <button
                                  className="action-btn resolve"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateBarrierStatus(barrier.id, 'resolved');
                                  }}
                                  title="Mark as Resolved"
                                >
                                  ✅
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
          </>
        ) : (
          <div className="auth-required">
            <div className="auth-required-content">
              <div className="auth-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-16 h-16">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <h2>Admin Access Required</h2>
              <p>Please authenticate to access the admin dashboard.</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="modal-button primary"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barrier Detail Modal */}
      {showBarrierDetail && selectedBarrier && (
        <div className="modal-overlay" onClick={() => setShowBarrierDetail(false)}>
          <div className="modal-container barrier-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Barrier Details</h2>
              <button
                onClick={() => setShowBarrierDetail(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="modal-content">
              <div className="barrier-detail-content">
                <div className="detail-section">
                  <h3>Basic Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">
                        {barrierTypes[selectedBarrier.type]?.icon} {barrierTypes[selectedBarrier.type]?.label}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Severity:</span>
                      <span 
                        className="detail-value severity"
                        style={{ color: severityLevels[selectedBarrier.severity]?.color }}
                      >
                        {severityLevels[selectedBarrier.severity]?.label}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span 
                        className="detail-value status"
                        style={{ color: statusOptions[selectedBarrier.status]?.color }}
                      >
                        {statusOptions[selectedBarrier.status]?.label}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Reported:</span>
                      <span className="detail-value">{formatDate(selectedBarrier.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Description</h3>
                  <p className="description-text">{selectedBarrier.description}</p>
                </div>

                <div className="detail-section">
                  <h3>Location</h3>
                  <div className="location-details">
                    <div className="coordinates">
                      <strong>Coordinates:</strong> {selectedBarrier.latitude.toFixed(6)}, {selectedBarrier.longitude.toFixed(6)}
                    </div>
                    {selectedBarrier.locationDetails && (
                      <div className="location-notes">
                        <strong>Details:</strong> {selectedBarrier.locationDetails}
                      </div>
                    )}
                  </div>
                </div>

                {selectedBarrier.photoUrl && (
                  <div className="detail-section">
                    <h3>Photo</h3>
                    <img 
                      src={selectedBarrier.photoUrl} 
                      alt="Barrier" 
                      className="barrier-photo"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <div className="status-actions">
                {selectedBarrier.status === 'new' && (
                  <button
                    className="modal-button secondary"
                    onClick={() => {
                      updateBarrierStatus(selectedBarrier.id, 'in_review');
                      setShowBarrierDetail(false);
                    }}
                  >
                    Mark as In Review
                  </button>
                )}
                {selectedBarrier.status !== 'resolved' && (
                  <button
                    className="modal-button primary"
                    onClick={() => {
                      updateBarrierStatus(selectedBarrier.id, 'resolved');
                      setShowBarrierDetail(false);
                    }}
                  >
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default AdminDashboardPage;
