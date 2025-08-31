import React, { useState, useEffect } from 'react';
import PageWrapper from '../PageWrapper';

const ReportedBarriersPage = ({ onPageOpen, onPageClose }) => {
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
  const [filter, setFilter] = useState('all'); // 'all', 'resolved', 'not-resolved'

  // Mock data for demonstration
  const mockBarriers = [
    {
      id: 1,
      type: 'Steps',
      location: 'Spring Garden Road',
      description: 'Steep steps without handrail',
      status: 'not-resolved',
      date: '2024-01-15',
      coordinates: [-63.5756, 44.6479]
    },
    {
      id: 2,
      type: 'Sidewalk Closure',
      location: 'Barrington Street',
      description: 'Construction blocking sidewalk',
      status: 'resolved',
      date: '2024-01-10',
      coordinates: [-63.5761, 44.6501]
    },
    {
      id: 3,
      type: 'Uneven Surface',
      location: 'South Park Street',
      description: 'Large pothole in sidewalk',
      status: 'not-resolved',
      date: '2024-01-08',
      coordinates: [-63.5747, 44.6502]
    }
  ];

  const filteredBarriers = mockBarriers.filter(barrier => {
    if (filter === 'all') return true;
    return barrier.status === filter;
  });

  return (
    <PageWrapper 
      title="Reported Barriers"
      description="Your barrier reporting history and status"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      
      <div className="page-content">
        {/* Filter Controls */}
        <div className="filter-controls" role="group" aria-label="Filter barriers by status">
          <button
            onClick={() => setFilter('all')}
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            aria-pressed={filter === 'all'}
          >
            All Barriers
          </button>
          <button
            onClick={() => setFilter('not-resolved')}
            className={`filter-button ${filter === 'not-resolved' ? 'active' : ''}`}
            aria-pressed={filter === 'not-resolved'}
          >
            Not Resolved
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`filter-button ${filter === 'resolved' ? 'active' : ''}`}
            aria-pressed={filter === 'resolved'}
          >
            Resolved
          </button>
        </div>

        {/* Barriers List */}
        <div className="barriers-list" role="list" aria-label="List of reported barriers">
          {filteredBarriers.length > 0 ? (
            filteredBarriers.map(barrier => (
              <div key={barrier.id} className="barrier-item" role="listitem">
                <div className="barrier-header">
                  <h3 className="barrier-type">{barrier.type}</h3>
                  <span className={`barrier-status ${barrier.status}`}>
                    {barrier.status === 'resolved' ? '✅ Resolved' : '⏳ Pending'}
                  </span>
                </div>
                <p className="barrier-location">{barrier.location}</p>
                <p className="barrier-description">{barrier.description}</p>
                <p className="barrier-date">Reported: {barrier.date}</p>
              </div>
            ))
          ) : (
            <div className="no-barriers">
              <div className="placeholder-icon">📝</div>
              <h2>No barriers found</h2>
              <p>No barriers match the current filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default ReportedBarriersPage;
