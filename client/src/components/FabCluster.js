import React, { useCallback, useMemo } from "react";
import BarrierReportFAB from "./BarrierReportFAB";

const FabCluster = React.memo(
  ({
    onReportBarrier,
    onTransitInfo,
    onLayersToggle,
    isMobile = false,
    isNavigating = false,
    activeLayers = new Set(),
    className = "",
  }) => {
    // Memoized handlers for better performance

    const handleTransitInfo = useCallback(() => {
      onTransitInfo && onTransitInfo();
    }, [onTransitInfo]);

    const handleLayersToggle = useCallback(() => {
      onLayersToggle && onLayersToggle();
    }, [onLayersToggle]);

    // Memoized active layer count for better performance
    const activeLayerCount = useMemo(() => activeLayers.size, [activeLayers]);

    // FAB button data for consistent rendering
    const fabButtons = useMemo(
      () => [
        {
          id: "transit",
          onClick: handleTransitInfo,
          className: "fab-button fab-transit",
          ariaLabel: "View Halifax transit information",
          title: "Transit Info",
          icon: (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-6 h-6"
              aria-hidden="true"
            >
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          label: "Transit\nInfo",
        },
        {
          id: "layers",
          onClick: handleLayersToggle,
          className: "fab-button fab-layers",
          ariaLabel: `Toggle map layers (${activeLayerCount} active)`,
          title: `Map Layers (${activeLayerCount} active)`,
          icon: (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-6 h-6"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          ),
          label: "Map\nLayers",
          badge: activeLayerCount > 0 ? activeLayerCount : null,
        },
      ],
      [
        handleTransitInfo,
        handleLayersToggle,
        activeLayerCount,
      ]
    );

    return (
      <div
        className={`fab-cluster notch-insets-sides ${className}`}
        role="group"
        aria-label="Quick action buttons"
      >
        <BarrierReportFAB onReportBarrier={onReportBarrier} />

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
                <div
                  className="fab-badge"
                  aria-label={`${button.badge} active layers`}
                >
                  {button.badge}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

FabCluster.displayName = "FabCluster";

export default FabCluster;
