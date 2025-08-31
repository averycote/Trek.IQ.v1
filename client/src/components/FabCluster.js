import React, { useCallback, useMemo } from 'react';

const FabCluster = React.memo(({
  onReportBarrier,
  onTransitInfo,
  onLayersToggle,
  onMobileRoutingVerification,
  isMobile = false,
  isNavigating = false,
  activeLayers = new Set(),
  className = ''
}) => {
  // Memoized handlers for better performance
  const handleReportBarrier = useCallback(() => {
    onReportBarrier && onReportBarrier();
  }, [onReportBarrier]);

  const handleTransitInfo = useCallback(() => {
    onTransitInfo && onTransitInfo();
  }, [onTransitInfo]);

  const handleLayersToggle = useCallback(() => {
    onLayersToggle && onLayersToggle();
  }, [onLayersToggle]);

  const handleMobileRoutingVerification = useCallback(() => {
    onMobileRoutingVerification && onMobileRoutingVerification();
  }, [onMobileRoutingVerification]);

  // Memoized active layer count for better performance
  const activeLayerCount = useMemo(() => activeLayers.size, [activeLayers]);

  // FAB button data for consistent rendering
  const fabButtons = useMemo(() => [
    {
      id: 'report',
      onClick: handleReportBarrier,
      className: 'fab-button fab-report',
      ariaLabel: 'Report accessibility barrier',
      title: 'Report Barrier',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      ),
      label: 'Report\nBarrier'
    },
    {
      id: 'transit',
      onClick: handleTransitInfo,
      className: 'fab-button fab-transit',
      ariaLabel: 'View Halifax transit information',
      title: 'Transit Info',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      ),
      label: 'Transit\nInfo'
    },
    {
      id: 'layers',
      onClick: handleLayersToggle,
      className: 'fab-button fab-layers',
      ariaLabel: `Toggle map layers (${activeLayerCount} active)`,
      title: `Map Layers (${activeLayerCount} active)`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
          <path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
        </svg>
      ),
      label: 'Map\nLayers',
      badge: activeLayerCount > 0 ? activeLayerCount : null
    },
    {
      id: 'mobile-test',
      onClick: handleMobileRoutingVerification,
      className: 'fab-button fab-mobile-test',
      ariaLabel: 'Test mobile routing functionality',
      title: 'Mobile Routing Test',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      label: 'Mobile\nTest'
    }
  ], [handleReportBarrier, handleTransitInfo, handleLayersToggle, handleMobileRoutingVerification, activeLayerCount]);

  return (
    <div className={`fab-cluster ${className}`} role="group" aria-label="Quick action buttons">
      {fabButtons.map((button) => (
        <button
          key={button.id}
          onClick={button.onClick}
          className={button.className}
          aria-label={button.ariaLabel}
          title={button.title}
          type="button"
        >
          <div className="fab-content">
            {button.icon}
            <span className="fab-label">{button.label}</span>
            {button.badge && (
              <div className="fab-badge" aria-label={`${button.badge} active layers`}>
                {button.badge}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

FabCluster.displayName = 'FabCluster';

export default FabCluster;
