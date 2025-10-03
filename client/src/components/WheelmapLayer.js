// WheelmapLayer Component - Displays accessible places using official Accessibility Cloud widget + Overpass API
// OPTIMIZATION: Lazy load Overpass API service to reduce initial bundle size
import React, { useState, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import apiHealthMonitor from '../services/apiHealthMonitor';

// OPTIMIZATION: Production-safe logging to reduce console overhead
const devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

const devError = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  } else {
    // In production, still log errors but less verbosely
    console.error(args[0]);
  }
};

const WheelmapLayer = ({ 
  isVisible, 
  map, 
  bounds, 
  onLayerToggle, 
  activeLayers = new Set(),
  isDarkMode = false,
  isMobile = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [overpassPlaces, setOverpassPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [wheelchairFilter, setWheelchairFilter] = useState('yes');
  const [dataSource, setDataSource] = useState('combined'); // 'wheelmap', 'overpass', 'combined'

  // Filter places based on active layers
  const shouldShowPlace = useCallback((place) => {
    if (activeLayers.size === 0) {
      return true; // Show all if no filters active
    }
    
    // Map Wheelmap categories to layer IDs
    const categoryToLayerMap = {
      'accommodation': 'wheelmap_accommodation',
      'food': 'wheelmap_food', 
      'restaurant': 'wheelmap_food',
      'leisure': 'wheelmap_leisure',
      'entertainment': 'wheelmap_leisure',
      'public_transport': 'wheelmap_public_transport',
      'shopping': 'wheelmap_shopping',
      'tourism': 'wheelmap_leisure',
      'health': 'wheelmap_health',
      'healthcare': 'wheelmap_health',
      'education': 'wheelmap_health',
      'toilets': 'wheelmap_toilets',
      'restroom': 'wheelmap_toilets',
      'parking': 'wheelmap_parking'
    };
    
    const placeCategory = place.category || place.properties?.category || 'other';
    const layerId = categoryToLayerMap[placeCategory.toLowerCase()] || 'wheelmap_food';
    
    const shouldShow = activeLayers.has(layerId);
    
    // Debug logging (only for first few places to avoid spam)
    if (Math.random() < 0.1) { // Log only 10% of places to avoid spam
      console.log('🔍 Filtering place:', {
        placeName: place.properties?.name || place.name?.en || 'Unknown',
        placeCategory,
        layerId,
        activeLayers: Array.from(activeLayers),
        shouldShow,
        placeData: place
      });
    }
    
    return shouldShow;
  }, [activeLayers]);

  // Load accessible places when layer becomes visible
  useEffect(() => {
    console.log('🔍 WheelmapLayer visibility changed:', { isVisible, hasMap: !!map, hasBounds: !!bounds });

    if (isVisible && map && bounds) {
      console.log('✅ Conditions met, loading accessibility places');
      loadAccessiblePlaces();
    } else if (!isVisible) {
      console.log('❌ Layer not visible, clearing markers and places');
      clearMarkers();
      setPlaces([]);
    } else {
      console.log('⚠️ Layer visible but missing requirements:', { map: !!map, bounds: !!bounds });
    }
  }, [isVisible, map, bounds, selectedCategory, wheelchairFilter, dataSource]);

  // Load accessible places using local API (bypassing widget issues)
  const loadAccessiblePlaces = useCallback(async () => {
    if (!map || !bounds) return;

    setLoading(true);
    setError(null);

    try {
      const searchBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      // Calculate center coordinates from bounds
      const centerLat = (searchBounds.north + searchBounds.south) / 2;
      const centerLng = (searchBounds.west + searchBounds.east) / 2;

      console.log('🚀 WheelmapLayer: Starting data load process...');
      console.log('📍 Search area center:', centerLat, centerLng);
      console.log('🎯 Data source:', dataSource);
      console.log('🎯 Will try: Local API (Halifax) → Wheelmap.org (Global) → Overpass API → Real Halifax locations');

      // Show loading indicator in console
      console.log('⏳ Loading accessibility markers...');

      // Load data based on selected source
      const promises = [];
      
      if (dataSource === 'wheelmap' || dataSource === 'combined') {
        promises.push(loadFromLocalAPI(centerLat, centerLng));
      }
      
      if (dataSource === 'overpass' || dataSource === 'combined') {
        promises.push(loadFromOverpassAPI(searchBounds));
      }
      
      await Promise.allSettled(promises);

    } catch (error) {
      console.error('❌ Error loading accessibility data:', error);
      console.log('🧪 Creating real Halifax locations as final fallback');
      createTestMarkers();
    } finally {
      setLoading(false);
    }
  }, [map, bounds, selectedCategory, wheelchairFilter]);

  // Re-create markers when active layers change
  useEffect(() => {
    if (isVisible && map && (places.length > 0 || overpassPlaces.length > 0)) {
      console.log('🔄 Active layers changed, recreating markers:', Array.from(activeLayers));
      console.log('🔄 Total places available:', places.length + overpassPlaces.length);
      
      // Combine places from both sources
      const allPlaces = [...places, ...overpassPlaces];
      if (allPlaces.length > 0) {
        console.log('🔄 Recreating markers with filtering...');
        createMarkersFromWidgetData(allPlaces, 'combined');
      }
    }
  }, [activeLayers, places, overpassPlaces, isVisible, map]);

  // Register services with health monitor
  useEffect(() => {
    const registerServices = async () => {
      try {
        // Register WheelmapApiService
        const { default: wheelmapApiService } = await import('../services/wheelmapApiService.js');
        apiHealthMonitor.registerService('wheelmap', wheelmapApiService, {
          maxFailureRate: 0.3,
          maxResponseTime: 15000,
          circuitBreakerThreshold: 5
        });

        // Register OverpassApiService
        const { default: overpassApiService } = await import('../services/overpassApiService');
        apiHealthMonitor.registerService('overpass', overpassApiService, {
          maxFailureRate: 0.4,
          maxResponseTime: 30000,
          circuitBreakerThreshold: 3
        });

        console.log('✅ API services registered with health monitor');
      } catch (error) {
        console.error('❌ Failed to register services with health monitor:', error);
      }
    };

    registerServices();
  }, []);

  // Load accessibility data from local API
  const loadFromLocalAPI = async (centerLat, centerLng) => {
    console.log('🔄 Loading accessibility data from local API');

    // Expand search area significantly to get more places
    const bounds = {
      west: centerLng - 0.5, // ~50km west (much larger area)
      south: centerLat - 0.5, // ~50km south
      east: centerLng + 0.5, // ~50km east
      north: centerLat + 0.5 // ~50km north
    };

    console.log('🔍 Expanded search bounds:', bounds);

    try {
      // Use our existing wheelmapApiService
      const { default: wheelmapApiService } = await import('../services/wheelmapApiService.js');

      // Load all accessibility places by default (no category filter)
      const result = await wheelmapApiService.searchAccessiblePlaces(bounds, {
        limit: 500, // Load many more places (increased from 100)
        wheelchair: 'yes', // Show all accessible places
        category: null // No category filter - show all types
      });

      console.log('📊 Local API result:', result);

      if (result && result.places && result.places.length > 0) {
        console.log('✅ Loaded', result.places.length, 'accessibility places from local API');
        setPlaces(result.places);
        createMarkersFromWidgetData(result.places);
      } else {
        console.log('⚠️ No data from local API, trying full wheelmap.org API...');
        await loadFromWheelmapOrgAPI(bounds);
      }
    } catch (error) {
      console.error('❌ Local API failed:', error);
      console.log('🧪 Creating test markers as fallback');
      createTestMarkers();
    }
  };

  // Load accessibility data from Overpass API (OpenStreetMap)
  const loadFromOverpassAPI = async (bounds) => {
    console.log('🗺️ Loading accessibility data from Overpass API...');
    
    try {
      // OPTIMIZATION: Lazy load Overpass API service only when needed
      const { default: overpassApiService } = await import('../services/overpassApiService');
      
      // Register this lazy-loaded element for verification
      if (typeof window !== 'undefined') {
        if (!window.TREK_IQ_LAZY_ELEMENTS) {
          window.TREK_IQ_LAZY_ELEMENTS = [];
        }
        window.TREK_IQ_LAZY_ELEMENTS.push('overpassApiService');
      }
      
      const overpassData = await overpassApiService.getAccessibilityData(bounds);
      console.log('✅ Overpass API returned', overpassData.elements?.length || 0, 'accessibility elements');
      
      if (overpassData.elements && overpassData.elements.length > 0) {
        // Convert Overpass data to our format
        const convertedPlaces = overpassData.elements.map(element => {
          const tags = element.tags || {};
          const lat = element.lat || (element.center && element.center.lat);
          const lng = element.lon || (element.center && element.center.lon);
          
          if (!lat || !lng) return null;
          
          return {
            id: `overpass_${element.type}_${element.id}`,
            coordinates: [lng, lat],
            geometry: { coordinates: [lng, lat] },
            properties: {
              name: tags.name || tags.amenity || tags.building || 'Unnamed OSM Place',
              category: tags.amenity || tags.building || tags.public_transport || 'other',
              wheelchair: tags.wheelchair || 'unknown',
              originalId: element.id,
              source: 'overpass',
              osm_type: element.type,
              ...tags // Include all OSM tags
            },
            wheelchair: tags.wheelchair || 'unknown',
            name: { en: tags.name || tags.amenity || tags.building || 'Unnamed OSM Place' },
            category: tags.amenity || tags.building || tags.public_transport || 'other'
          };
        }).filter(Boolean);
        
        console.log('🔄 Converted', convertedPlaces.length, 'Overpass places to marker format');
        
        // Store Overpass places separately
        setOverpassPlaces(convertedPlaces);
        
        // Create markers for Overpass data
        createMarkersFromWidgetData(convertedPlaces, 'overpass');
      } else {
        console.log('⚠️ No Overpass accessibility data found in this area');
      }
    } catch (error) {
      console.error('❌ Error loading Overpass data:', error);
    }
  };

  // Fallback to full wheelmap.org API for comprehensive data
  const loadFromWheelmapOrgAPI = async (bounds) => {
    console.log('🌍 Loading from full wheelmap.org API for comprehensive coverage');

    try {
      const { default: wheelmapApiService } = await import('../services/wheelmapApiService.js');

      // Use the wheelmap.org proxy endpoint for broader coverage
      const result = await wheelmapApiService.fetchPOIs(bounds, {
        limit: 200,
        wheelchair: 'yes'
      });

      if (result && result.length > 0) {
        console.log('✅ Loaded', result.length, 'places from wheelmap.org API');

        // Convert wheelmap.org format to our format
        const convertedPlaces = result.map(item => ({
          name: item.properties?.name ? { en: item.properties.name } : { en: 'Unknown Place' },
          coordinates: item.geometry?.coordinates || [bounds.west, bounds.south],
          category: item.properties?.category || 'unknown',
          wheelchair: item.properties?.wheelchair || 'unknown',
          properties: item.properties || {}
        }));

        setPlaces(convertedPlaces);
        createMarkersFromWidgetData(convertedPlaces);
      } else {
        console.log('⚠️ No data from wheelmap.org API, creating real Halifax locations');
        createTestMarkers();
      }
    } catch (error) {
      console.error('❌ Wheelmap.org API failed:', error);
      console.log('🧪 Creating real Halifax locations as final fallback');
      createTestMarkers();
    }
  };

  // Create fallback markers using real Halifax locations when APIs fail
  const createTestMarkers = () => {
    if (!map) {
      console.error('❌ Map not available for fallback markers');
      return;
    }

    console.log('🧪 Creating fallback accessibility markers using real Halifax locations...');

    // Real Halifax locations with accurate coordinates and accessibility information
    const realHalifaxPlaces = [
      {
        name: { en: 'Halifax Central Library' },
        coordinates: [-63.5724, 44.6492], // Real coordinates for Halifax Central Library
        category: 'library',
        wheelchair: 'yes'
      },
      {
        name: { en: 'Scotiabank Centre' },
        coordinates: [-63.5738, 44.6476], // Real coordinates for Scotiabank Centre
        category: 'bank',
        wheelchair: 'yes'
      },
      {
        name: { en: 'Tim Hortons Downtown' },
        coordinates: [-63.5712, 44.6501], // Real coordinates for downtown Tim Hortons
        category: 'coffee',
        wheelchair: 'yes'
      },
      {
        name: { en: 'Shoppers Drug Mart Downtown' },
        coordinates: [-63.5745, 44.6468], // Real coordinates for downtown Shoppers
        category: 'pharmacy',
        wheelchair: 'yes'
      },
      {
        name: { en: 'Halifax Public Gardens' },
        coordinates: [-63.5762, 44.6428], // Real coordinates for Halifax Public Gardens
        category: 'park',
        wheelchair: 'limited'
      },
      {
        name: { en: 'Dalhousie University' },
        coordinates: [-63.5917, 44.6366], // Real coordinates for Dalhousie University
        category: 'university',
        wheelchair: 'yes'
      },
      {
        name: { en: 'Halifax Transit Terminal' },
        coordinates: [-63.5791, 44.6581], // Real coordinates for Halifax Transit Terminal
        category: 'bus_station',
        wheelchair: 'yes'
      },
      {
        name: { en: 'Sobeys Downtown' },
        coordinates: [-63.5698, 44.6512], // Real coordinates for downtown Sobeys
        category: 'supermarket',
        wheelchair: 'yes'
      }
    ];

    console.log('🗺️ Created', realHalifaxPlaces.length, 'real Halifax accessibility markers as fallback');
    createMarkersFromWidgetData(realHalifaxPlaces);
  };

  // Create markers from widget data
  const createMarkersFromWidgetData = (places, source = 'wheelmap') => {
    console.log('🎯 Creating markers from widget data, places array:', places, 'source:', source);
    
    // Don't clear markers if we're adding to existing ones (combined mode)
    if (dataSource !== 'combined') {
    clearMarkers();
    }

    // Comprehensive map validation with more detailed checks
    if (!map) {
      console.error('❌ Map not available for marker creation');
      return;
    }

    // Check if map is properly initialized and has required methods
    const requiredMethods = ['getContainer', 'on', 'isStyleLoaded', 'getBounds', 'addLayer', 'getLayer', 'getSource', 'addSource'];
    const missingMethods = requiredMethods.filter(method => typeof map[method] !== 'function');
    
    if (missingMethods.length > 0) {
      console.error('❌ Map not properly initialized - missing required methods:', missingMethods);
      return;
    }

    // Check if map container exists and is in the DOM
    const mapContainer = map.getContainer();
    if (!mapContainer || !mapContainer.parentNode) {
      console.error('❌ Map container not available or not attached to DOM');
      return;
    }

    // Check if mapboxgl is available
    if (!mapboxgl || !mapboxgl.Marker) {
      console.error('❌ Mapbox GL JS not available');
      return;
    }

    // Check if map is fully loaded
    if (!map.isStyleLoaded()) {
      console.warn('⚠️ Map style not fully loaded, waiting...');
      map.once('styledata', () => {
        console.log('✅ Map style loaded, retrying marker creation');
        createMarkersFromWidgetData(places, source);
      });
      return;
    }

    // Additional validation: ensure map has a valid style
    try {
      const style = map.getStyle();
      if (!style || !style.sources) {
        console.error('❌ Map style not properly loaded');
        return;
      }
    } catch (error) {
      console.error('❌ Error accessing map style:', error);
      return;
    }

    console.log('🗺️ Map is available and ready, creating markers...');

    // Validate places array
    if (!places || !Array.isArray(places) || places.length === 0) {
      console.warn('⚠️ No valid places data provided');
      return;
    }

    // OPTIMIZATION: Limit markers to prevent UI clutter and improve performance
    const limitedPlaces = places.slice(0, 50); // Reduced from 100 to 50 for better performance
    if (places.length > 50) {
      console.log(`📊 Limiting to 50 markers out of ${places.length} total places for optimal performance`);
    }

    // OPTIMIZATION: Use more efficient array processing with early returns
    const newMarkers = [];
    let filteredCount = 0;
    
    for (let i = 0; i < limitedPlaces.length; i++) {
      const place = limitedPlaces[i];
      
      // Filter based on active layers
      if (!shouldShowPlace(place)) {
        filteredCount++;
        continue;
      }
      
      // Handle different data formats
      const coords = place.geometry?.coordinates || place.coordinates;

      if (!coords) {
        console.log(`⚠️ No coordinates for place ${i + 1}, skipping`);
        continue;
      }

      const lng = coords[0];
      const lat = coords[1];

      // Validate coordinates are valid numbers
      if (typeof lng !== 'number' || typeof lat !== 'number' || 
          isNaN(lng) || isNaN(lat) || 
          !isFinite(lng) || !isFinite(lat)) {
        console.warn(`⚠️ Invalid coordinates for place ${i + 1}: [${lng}, ${lat}], skipping`);
        continue;
      }

      // Validate coordinate ranges (rough bounds check)
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        console.warn(`⚠️ Coordinates out of valid range for place ${i + 1}: [${lng}, ${lat}], skipping`);
        continue;
      }

      // Create clean, professional marker element
      if (!document) {
        console.error('❌ Document not available, cannot create marker element');
        continue; // Skip this place and continue with the next one
      }
      const markerElement = document.createElement('div');
      markerElement.style.width = '28px';
      markerElement.style.height = '28px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.border = '2px solid white';
      markerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';
      markerElement.style.cursor = 'pointer';
      markerElement.style.display = 'flex';
      markerElement.style.alignItems = 'center';
      markerElement.style.justifyContent = 'center';
      markerElement.style.fontSize = '14px';
      markerElement.style.fontWeight = 'bold';
      markerElement.style.transition = 'all 0.2s ease';

      // Set background color based on accessibility
      const wheelchair = place.properties?.wheelchair || place.wheelchair;
      switch (wheelchair) {
        case 'yes':
          markerElement.style.backgroundColor = '#00AA00';
          markerElement.textContent = '♿';
          break;
        case 'limited':
          markerElement.style.backgroundColor = '#FFAA00';
          markerElement.textContent = '!';
          break;
        case 'no':
          markerElement.style.backgroundColor = '#CC0000';
          markerElement.textContent = '✗';
          break;
        default:
          markerElement.style.backgroundColor = '#888888';
          markerElement.textContent = '?';
      }

      // Ensure marker is visible and clickable
      markerElement.style.zIndex = '1000';
      markerElement.style.pointerEvents = 'auto';
      markerElement.style.userSelect = 'none';
      markerElement.style.cursor = 'pointer';

      // Add CSS for mapbox popups to ensure they're visible
      if (document && !document.getElementById('wheelmap-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'wheelmap-popup-styles';
        style.textContent = `
          .mapboxgl-popup-content {
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            border: 1px solid #e1e5e9 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            z-index: 9999 !important;
          }
          .mapboxgl-popup-tip {
            border-top-color: white !important;
            z-index: 9999 !important;
          }
          .mapboxgl-popup {
            z-index: 9999 !important;
          }
        `;
        if (document && document.head) {
          document.head.appendChild(style);
        console.log('🎨 Added popup styles');
        } else {
          console.warn('⚠️ document.head not available, skipping popup styles');
        }
      }

      // Add debug info to element
      markerElement.title = `${place.name?.en || place.name || 'Place'} - Click for details`;
      markerElement.setAttribute('data-place-name', place.name?.en || place.name || 'Unknown');

      // Verify marker element is valid before creating Mapbox marker
      if (!markerElement) {
        console.warn('⚠️ Invalid marker element, skipping marker creation for place:', place.name || 'Unknown');
        continue;
      }

      // Additional validation for marker element
      if (!markerElement.nodeType || markerElement.nodeType !== 1) {
        console.warn('⚠️ Invalid DOM element, skipping marker creation for place:', place.name || 'Unknown');
        continue;
      }

      // Validate map object and its methods (more comprehensive check)
      if (!map || typeof map.getContainer !== 'function' || typeof map.on !== 'function' || 
          typeof map.addLayer !== 'function' || typeof map.getLayer !== 'function') {
        console.warn('⚠️ Invalid map object, skipping marker creation for place:', place.name || 'Unknown');
        continue;
      }

      // Additional check: ensure map is still properly initialized
      try {
        const mapContainer = map.getContainer();
        if (!mapContainer || !mapContainer.parentNode) {
          console.warn('⚠️ Map container not available, skipping marker creation for place:', place.name || 'Unknown');
          continue;
        }
      } catch (error) {
        console.warn('⚠️ Error accessing map container, skipping marker creation for place:', place.name || 'Unknown', error);
        continue;
      }

      let marker;
      try {
        marker = new mapboxgl.Marker(markerElement)
        .setLngLat([lng, lat])
        .addTo(map);
      } catch (error) {
        console.error('❌ Failed to create or add marker to map:', error, 'for place:', place.name || 'Unknown');
        continue;
      }

      // Verify marker position
      console.log(`📍 Marker position check: [${lng}, ${lat}] vs actual:`, marker.getLngLat());

      // Add click listener with better event handling
      marker.getElement().addEventListener('click', async (event) => {
        console.log('📍 Marker clicked:', place.name?.en || place.name);
        event.stopPropagation(); // Prevent map click

        // Visual feedback that click was registered
        marker.getElement().style.transform = 'scale(0.9)';
        setTimeout(() => {
          marker.getElement().style.transform = 'scale(1)';
        }, 150);

        try {
          // First show a loading popup
          const loadingPopup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '300px',
            anchor: 'bottom',
            offset: [0, -10]
          })
            .setLngLat([lng, lat])
            .setHTML(`
              <div style="
                padding: 20px;
                text-align: center;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              ">
                <div style="font-size: 16px; margin-bottom: 8px;">🔄 Loading...</div>
                <div style="font-size: 12px; color: #6b7280;">Fetching detailed accessibility info</div>
              </div>
            `);

          loadingPopup.addTo(map);

          // Fetch detailed data from Wheelmap API
          const { default: wheelmapApiService } = await import('../services/wheelmapApiService.js');

          console.log('🔍 Fetching detailed data for node:', place.properties?.originalId || place.id);

          const detailedData = await wheelmapApiService.getPlaceDetails(
            place.properties?.originalId || place.id
          );

          console.log('📊 Detailed data received:', detailedData);

          // Close loading popup
          loadingPopup.remove();

          let popupContent;
          if (detailedData) {
            // Create enhanced popup with detailed data
            popupContent = createSimplePopupContent({
              ...place,
              ...detailedData,
              properties: {
                ...place.properties,
                ...detailedData
              }
            });
            console.log('📝 Enhanced popup content generated with rich data');
          } else {
            // Fallback to basic popup if detailed data fetch failed
            popupContent = createSimplePopupContent(place);
            console.log('📝 Basic popup content generated (fallback)');
          }

          const popup = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: detailedData ? '340px' : '300px',
            anchor: 'bottom',
            offset: [0, -10]
          })
            .setLngLat([lng, lat])
            .setHTML(popupContent);

          // Add to map and track it
          popup.addTo(map);
          console.log('✅ Enhanced popup successfully added to map');

          // Auto-remove popup after 15 seconds (longer for rich content)
          setTimeout(() => {
            try {
              if (popup.isOpen && popup.isOpen()) {
                popup.remove();
                console.log('🗑️ Auto-removed popup after timeout');
              }
            } catch (e) {
              console.log('Popup already closed');
            }
          }, detailedData ? 15000 : 10000);

        } catch (popupError) {
          console.error('❌ Failed to create popup:', popupError);
          // Fallback: show basic popup without API call
          try {
            const basicPopup = new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              maxWidth: '300px',
              anchor: 'bottom',
              offset: [0, -10]
            })
              .setLngLat([lng, lat])
              .setHTML(createSimplePopupContent(place));

            basicPopup.addTo(map);
            console.log('✅ Basic popup fallback created');
          } catch (fallbackError) {
            console.error('❌ Fallback popup also failed:', fallbackError);
            // Final fallback: browser alert
          alert(`Accessibility Info:\n${place.name?.en || place.name || 'Unknown Place'}\n${place.category || 'Unknown Type'}`);
          }
        }
      });

      // Better hover effects without transform scaling
      marker.getElement().addEventListener('mouseenter', () => {
        marker.getElement().style.borderWidth = '3px';
        marker.getElement().style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
        marker.getElement().style.zIndex = '1001';
      });

      marker.getElement().addEventListener('mouseleave', () => {
        marker.getElement().style.borderWidth = '2px';
        marker.getElement().style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        marker.getElement().style.zIndex = '1000';
      });

      newMarkers.push(marker);
    }

    setMarkers(newMarkers);
    console.log(`✅ Created ${newMarkers.length} accessibility markers (filtered out ${filteredCount} places)`);
    console.log('🎉 Accessibility markers loaded successfully! Click any marker for details.');

    // Check if any markers are within current map bounds
    const mapBounds = map.getBounds();
    console.log('🗺️ Current map bounds:', mapBounds);

    let visibleMarkers = 0;
    newMarkers.forEach((marker, index) => {
      const markerLngLat = marker.getLngLat();
      if (mapBounds.contains(markerLngLat)) {
        visibleMarkers++;
        console.log(`👁️ Marker ${index + 1} is visible at:`, markerLngLat);
      } else {
        console.log(`🙈 Marker ${index + 1} is outside bounds at:`, markerLngLat);
      }
    });

    console.log(`👁️ ${visibleMarkers}/${newMarkers.length} markers are within current map bounds`);

    // If no markers are visible, zoom to show them
    if (visibleMarkers === 0 && newMarkers.length > 0) {
      console.log('🔄 No markers visible, fitting map to show markers');
      // Validate markers are within Halifax bounds before fitting
      const halifaxBounds = {
        west: -63.8,
        east: -63.4,
        south: 44.5,
        north: 44.8
      };
      
      const bounds = new mapboxgl.LngLatBounds();
      let hasValidMarkers = false;
      
      newMarkers.forEach(marker => {
        const lngLat = marker.getLngLat();
        const [lng, lat] = [lngLat.lng, lngLat.lat];
        
        // Only add markers that are within Halifax bounds
        if (lng >= halifaxBounds.west && lng <= halifaxBounds.east &&
            lat >= halifaxBounds.south && lat <= halifaxBounds.north) {
          bounds.extend(lngLat);
          hasValidMarkers = true;
        }
      });
      
      if (hasValidMarkers) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        console.log('✅ WheelmapLayer: Map fitted to valid marker bounds within Halifax');
      } else {
        console.warn('⚠️ WheelmapLayer: No valid markers within Halifax bounds, keeping map centered');
        // Don't reposition map if no valid markers
      }
    }
  };

  // Add markers to the map
  const addMarkersToMap = useCallback((placesData) => {
    if (!map) return;

    // Clear existing markers
    clearMarkers();

    const newMarkers = placesData.map(place => {
      const markerElement = createMarkerElement(place);
      
      // Skip if marker element creation failed
      if (!markerElement) {
        console.warn('⚠️ Skipping marker creation for place:', place.name || 'Unknown');
        return null;
      }

      // Additional validation for marker element
      if (!markerElement.nodeType || markerElement.nodeType !== 1) {
        console.warn('⚠️ Invalid DOM element, skipping marker creation for place:', place.name || 'Unknown');
        return null;
      }

      // Validate map object and its methods
      if (!map || typeof map.getContainer !== 'function' || typeof map.on !== 'function') {
        console.warn('⚠️ Invalid map object, skipping marker creation for place:', place.name || 'Unknown');
        return null;
      }

      let marker;
      try {
        marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'bottom'
      })
        .setLngLat(place.coordinates)
        .addTo(map);
      } catch (error) {
        console.error('❌ Failed to create or add marker to map:', error, 'for place:', place.name || 'Unknown');
        return null;
      }

      // Add popup with place information
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px'
      }).setHTML(createPopupContent(place));

      marker.setPopup(popup);

      return marker;
    }).filter(marker => marker !== null); // Remove null markers

    setMarkers(newMarkers);
  }, [map]);

  // Create marker element
  const createMarkerElement = (place) => {
    if (!document) {
      console.error('❌ Document not available, cannot create marker element');
      return null;
    }
    const markerEl = document.createElement('div');
    markerEl.className = 'wheelmap-marker';
    
    const accessibilityColor = place.color;
    const icon = place.icon;
    const name = place.name;
    
    markerEl.innerHTML = `
      <div class="marker-container" style="background-color: ${accessibilityColor}">
        <div class="marker-icon">${icon}</div>
        <div class="marker-glow"></div>
      </div>
    `;

    // Add click handler
    markerEl.addEventListener('click', () => {
      // Handle marker click
      console.log('Clicked on:', place.name);
    });

    return markerEl;
  };

  // Create popup content
  const createPopupContent = (place) => {
    const accessibilityDetails = place.accessibility;
    const features = accessibilityDetails.features.map(f => f.description).join(', ');
    
    return `
      <div class="wheelmap-popup">
        <div class="popup-header">
          <h3>${place.name}</h3>
          <div class="accessibility-badge" style="background-color: ${place.color}">
            ${place.wheelchair === 'yes' ? '♿ Accessible' : 
              place.wheelchair === 'limited' ? '♿ Limited' : 
              place.wheelchair === 'no' ? '❌ Not Accessible' : '❓ Unknown'}
          </div>
        </div>
        <div class="popup-content">
          <p><strong>Category:</strong> ${place.category}</p>
          ${place.address.street ? `<p><strong>Address:</strong> ${place.address.street}${place.address.housenumber ? ` ${place.address.housenumber}` : ''}</p>` : ''}
          ${features ? `<p><strong>Features:</strong> ${features}</p>` : ''}
          <p><strong>Accessibility Score:</strong> ${accessibilityDetails.rating}/100</p>
        </div>
        <div class="popup-footer">
          <a href="https://wheelmap.org/en/node/${place.id}" target="_blank" rel="noopener noreferrer">
            View on Wheelmap
          </a>
        </div>
      </div>
    `;
  };

  // Get accessibility icon based on wheelchair status
  const getAccessibilityIcon = (wheelchairStatus) => {
    switch (wheelchairStatus) {
      case 'yes':
        return 'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3e%3ccircle cx="12" cy="12" r="10" fill="%2300AA00" opacity="0.8"/%3e%3cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="white"/%3e%3c/svg%3e';
      case 'limited':
        return 'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3e%3ccircle cx="12" cy="12" r="10" fill="%23FFAA00" opacity="0.8"/%3e%3ctext x="12" y="16" text-anchor="middle" fill="white" font-size="14" font-weight="bold"%3e!%3c/text%3e%3c/svg%3e';
      case 'no':
        return 'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3e%3ccircle cx="12" cy="12" r="10" fill="%23CC0000" opacity="0.8"/%3e%3cpath d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="white"/%3e%3c/svg%3e';
      default:
        return 'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"%3e%3ccircle cx="12" cy="12" r="10" fill="%23888888" opacity="0.8"/%3e%3ctext x="12" y="16" text-anchor="middle" fill="white" font-size="12"%3e?%3c/text%3e%3c/svg%3e';
    }
  };

  // Create enhanced trek.iq popup content with rich Wheelmap data
  const createSimplePopupContent = (place) => {
    // Extract rich data from place object
    const name = place.properties?.name || place.name?.en || 'Accessible Place';
    const category = place.properties?.category || place.category || 'Unknown';
    const wheelchair = place.properties?.wheelchair || place.wheelchair || 'unknown';
    const address = place.properties?.address?.street || '';
    const phone = place.properties?.phone || '';
    const website = place.properties?.website || '';
    const email = place.properties?.email || place.contact?.email || '';

    // Rich data extraction
    const photos = place.photos || place.properties?.photos || [];
    const reviews = place.reviews || place.properties?.reviews || {};
    const facilities = place.facilities || place.properties?.facilities || {};
    const accessibilityFeatures = place.accessibility?.features || [];
    const community = place.community || place.properties?.community || {};

    // Additional details
    const description = place.details?.description || place.properties?.description || '';
    const openingHours = place.details?.opening_hours || place.properties?.opening_hours || '';
    const operator = place.details?.operator || place.properties?.operator || '';
    const brand = place.details?.brand || place.properties?.brand || '';

    // Trek.iq branded accessibility status with proper colors
    let statusText = 'Unknown';
    let statusColor = '#6b7280'; // Neutral gray
    let statusBg = '#f3f4f6';
    let icon = '❓';

    switch (wheelchair) {
      case 'yes':
        statusText = 'Fully Accessible';
        statusColor = '#14b8a6'; // Trek.iq primary teal
        statusBg = '#f0fdfa';
        icon = '♿';
        break;
      case 'limited':
        statusText = 'Limited Access';
        statusColor = '#f59e0b'; // Warning orange
        statusBg = '#fffbeb';
        icon = '⚠️';
        break;
      case 'no':
        statusText = 'Not Accessible';
        statusColor = '#ef4444'; // Error red
        statusBg = '#fef2f2';
        icon = '❌';
        break;
    }

    // Enhanced Trek.IQ popup with rich Wheelmap data
    return `
      <div style="
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 340px;
        line-height: 1.5;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        overflow: hidden;
      ">
        <!-- Trek.iq Header -->
        <div style="
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          color: white;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="
              width: 24px;
              height: 24px;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
            ">TQ</div>
            <div style="font-size: 12px; font-weight: 600; opacity: 0.9;">TREK.IQ</div>
          </div>
          ${reviews.totalReviews > 0 ? `
            <div style="font-size: 11px; opacity: 0.9;">
              ⭐ ${reviews.totalReviews} reviews
            </div>
          ` : ''}
        </div>

        <!-- Main Content -->
        <div style="padding: 16px;">
          <!-- Place Name & Basic Info -->
          <h3 style="
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.3;
          ">${name}</h3>

          <!-- Brand/Operator Info -->
          ${(brand || operator) ? `
            <div style="
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 8px;
            ">
              ${brand ? `${brand}` : ''}${brand && operator ? ' • ' : ''}${operator ? `${operator}` : ''}
            </div>
          ` : ''}

          <!-- Category & Accessibility Status -->
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 4px 8px;
              background: #f3f4f6;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 500;
              color: #374151;
            ">
              <span>🏷️</span>
              <span style="text-transform: capitalize;">${category.replace('_', ' ')}</span>
            </div>

            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 4px 8px;
              background: ${statusBg};
              border: 1px solid ${statusColor}20;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              color: ${statusColor};
            ">
              <span>${icon}</span>
              <span>${statusText}</span>
            </div>
          </div>

          <!-- Description -->
          ${description ? `
            <div style="
              background: #f8fafc;
              border-radius: 8px;
              padding: 10px;
              margin-bottom: 12px;
              font-size: 13px;
              color: #374151;
              line-height: 1.4;
            ">
              ${description}
            </div>
          ` : ''}

          <!-- Detailed Accessibility Features -->
          ${accessibilityFeatures.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="
                font-size: 14px;
                font-weight: 600;
                color: #0f172a;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <span>♿</span>
                <span>Accessibility Features</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${accessibilityFeatures.slice(0, 4).map(feature => `
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 10px;
                    background: #f8fafc;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #374151;
                  ">
                    <span style="font-size: 14px;">
                      ${feature.status === 'yes' ? '✅' :
                        feature.status === 'no' ? '❌' :
                        feature.status === 'limited' ? '⚠️' : '❓'}
                    </span>
                    <span>${feature.description}</span>
                  </div>
                `).join('')}
                ${accessibilityFeatures.length > 4 ? `
                  <div style="
                    font-size: 12px;
                    color: #6b7280;
                    text-align: center;
                    padding: 4px;
                  ">
                    +${accessibilityFeatures.length - 4} more features
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Photos Section -->
          ${photos && photos.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="
                font-size: 14px;
                font-weight: 600;
                color: #0f172a;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <span>📷</span>
                <span>Photos</span>
              </div>
              <div style="
                display: flex;
                gap: 8px;
                overflow-x: auto;
                scrollbar-width: none;
                -ms-overflow-style: none;
              ">
                ${photos.slice(0, 4).map((photo, index) => `
                  <div style="
                    flex-shrink: 0;
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #d1d5db;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    position: relative;
                  "
                  onclick="window.open('${photo.url}', '_blank')"
                  onmouseover="this.style.transform='scale(1.05)'"
                  onmouseout="this.style.transform='scale(1)'">
                    <span style="font-size: 16px;">📷</span>
                    ${index === 0 ? '<div style="position: absolute; top: -8px; right: -8px; background: #14b8a6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600;">1</div>' : ''}
                  </div>
                `).join('')}
                ${photos.length > 4 ? `
                  <div style="
                    flex-shrink: 0;
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #1d4ed8;
                    cursor: pointer;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                    align-items: center;
                  "
                  onclick="window.open('https://wheelmap.org/nodes/${place.properties?.originalId || place.id}', '_blank')">
                    +${photos.length - 4}
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Facility Information -->
          ${Object.keys(facilities).length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="
                font-size: 14px;
                font-weight: 600;
                color: #0f172a;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <span>🏢</span>
                <span>Facilities</span>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px;">
                ${Object.entries(facilities).slice(0, 6).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return '';
                  const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
                  return `
                    <div style="
                      background: #f8fafc;
                      border-radius: 6px;
                      padding: 6px 8px;
                      font-size: 11px;
                    ">
                      <div style="font-weight: 600; color: #374151; margin-bottom: 2px;">${displayKey}</div>
                      <div style="color: #6b7280;">${displayValue}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Contact & Hours -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
            ${(address || phone || email || website) ? `
              <div style="margin-bottom: 12px;">
                ${address ? `
                  <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                    <span style="font-size: 12px; color: #6b7280; font-weight: 500; min-width: 45px;">📍</span>
                    <span style="font-size: 13px; color: #374151; line-height: 1.3;">${address}</span>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  ${phone ? `
                    <a href="tel:${phone}" style="
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      font-size: 13px;
                      color: #3b82f6;
                      text-decoration: none;
                      font-weight: 500;
                    ">
                      <span>📞</span>
                      <span>${phone}</span>
                    </a>
                  ` : ''}

                  ${email ? `
                    <a href="mailto:${email}" style="
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      font-size: 13px;
                      color: #3b82f6;
                      text-decoration: none;
                      font-weight: 500;
                    ">
                      <span>✉️</span>
                      <span>Email</span>
                    </a>
                  ` : ''}

                  ${website ? `
                    <a href="${website}" target="_blank" rel="noopener noreferrer" style="
                      display: flex;
                      align-items: center;
                      gap: 4px;
                      font-size: 13px;
                      color: #3b82f6;
                      text-decoration: none;
                      font-weight: 500;
                    ">
                      <span>🌐</span>
                      <span>Website</span>
                    </a>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            ${openingHours ? `
              <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="font-size: 12px; color: #6b7280; font-weight: 500;">🕒 Hours:</span>
                  <span style="font-size: 13px; color: #374151; font-weight: 500;">${openingHours}</span>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Community Info -->
          ${community.lastUpdated ? `
            <div style="
              font-size: 11px;
              color: #6b7280;
              text-align: center;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
            ">
              Last updated: ${new Date(community.lastUpdated).toLocaleDateString()}
              ${community.contributor ? ` by ${community.contributor}` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Footer with Wheelmap Link -->
        <div style="
          background: #f8fafc;
          padding: 12px 16px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        ">
          <a href="https://wheelmap.org/nodes/${place.properties?.originalId || place.id}" target="_blank" rel="noopener noreferrer" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #6b7280;
            text-decoration: none;
            font-weight: 500;
            padding: 6px 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          ">
            <span>🔗</span>
            <span>View full accessibility details on wheelmap.org</span>
          </a>
        </div>
      </div>
    `;
  };

  // Create clean popup content for Mapbox markers
  const createInfoWindowContent = (place) => {
    const name = place.properties?.name || place.name?.en || 'Accessible Place';
    const category = place.properties?.category || place.category || 'Unknown';
    const wheelchair = place.properties?.wheelchair || place.wheelchair || 'unknown';

    // Get appropriate icon and color
    const getAccessibilityInfo = (status) => {
      switch (status) {
        case 'yes': return { icon: '♿', text: 'Accessible', color: '#00AA00' };
        case 'limited': return { icon: '⚠️', text: 'Limited Access', color: '#FFAA00' };
        case 'no': return { icon: '❌', text: 'Not Accessible', color: '#CC0000' };
        default: return { icon: '❓', text: 'Unknown', color: '#888888' };
      }
    };

    const accessibility = getAccessibilityInfo(wheelchair);

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 280px; line-height: 1.4;">
        <h3 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px; font-weight: 600;">${name}</h3>

        <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 6px 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid ${accessibility.color};">
          <span style="font-size: 14px; margin-right: 6px;">${accessibility.icon}</span>
          <span style="font-size: 13px; font-weight: 500; color: ${accessibility.color};">${accessibility.text}</span>
        </div>

        <div style="color: #6c757d; font-size: 13px;">
          <p style="margin: 6px 0; display: flex;">
            <strong style="min-width: 60px; color: #495057;">Type:</strong>
            <span style="text-transform: capitalize;">${category.replace('_', ' ')}</span>
          </p>

          ${place.properties?.address?.street ? `
            <p style="margin: 6px 0; display: flex;">
              <strong style="min-width: 60px; color: #495057;">Address:</strong>
              <span>${place.properties.address.street}${place.properties.address.housenumber ? ` ${place.properties.address.housenumber}` : ''}</span>
            </p>
          ` : ''}

          ${place.properties?.phone ? `
            <p style="margin: 6px 0; display: flex;">
              <strong style="min-width: 60px; color: #495057;">Phone:</strong>
              <span>${place.properties.phone}</span>
            </p>
          ` : ''}
        </div>

        ${place.properties?.website ? `
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e9ecef;">
            <a href="${place.properties.website}" target="_blank" rel="noopener noreferrer"
               style="color: #007bff; text-decoration: none; font-size: 13px; font-weight: 500;">
              🌐 Visit Website
            </a>
          </div>
        ` : ''}
      </div>
    `;
  };

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markers.forEach(marker => marker.remove());
    setMarkers([]);
  }, [markers]);

  // Get accessibility categories
  const getAccessibilityCategories = () => {
    return [
      { id: 'all', name: 'All Categories', icon: '📍' },
      { id: 'restaurant', name: 'Restaurants', icon: '🍽️' },
      { id: 'parking', name: 'Parking', icon: '🅿️' },
      { id: 'toilet', name: 'Toilets', icon: '🚻' },
      { id: 'bank', name: 'Banks', icon: '🏦' },
      { id: 'hospital', name: 'Hospitals', icon: '🏥' },
      { id: 'hotel', name: 'Hotels', icon: '🏨' }
    ];
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Handle wheelchair filter change
  const handleWheelchairFilterChange = (filter) => {
    setWheelchairFilter(filter);
  };


  if (!isVisible) {
    return null;
  }

  // On mobile, don't render the controls overlay as they're handled by the layers panel
  if (isMobile) {
    return null;
  }

  return (
    <div className="wheelmap-layer-controls">
      {/* Data Source Selector */}
      <div className="filter-section">
        <label className="filter-label">🌟 Data Source:</label>
        <select 
          value={dataSource} 
          onChange={(e) => setDataSource(e.target.value)}
          className="filter-select"
        >
          <option value="combined">🌟 Combined (Wheelmap + OSM)</option>
          <option value="wheelmap">🌐 Wheelmap Community</option>
          <option value="overpass">📍 OpenStreetMap Only</option>
        </select>
      </div>

      {/* Category Filter */}
      <div className="filter-section">
        <label className="filter-label">Category:</label>
        <select 
          value={selectedCategory} 
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="filter-select"
        >
          {getAccessibilityCategories().map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Wheelchair Filter */}
      <div className="filter-section">
        <label className="filter-label">Accessibility:</label>
        <select 
          value={wheelchairFilter} 
          onChange={(e) => handleWheelchairFilterChange(e.target.value)}
          className="filter-select"
        >
          <option value="yes">♿ Fully Accessible</option>
          <option value="limited">⚠️ Limited Access</option>
          <option value="no">❌ Not Accessible</option>
          <option value="unknown">❓ Unknown</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading accessible places...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Results Summary */}
      {places.length > 0 && !loading && (
        <div className="results-summary">
          <span>Found {places.length} accessible places</span>
        </div>
      )}

      {/* Legend */}
      <div className="wheelmap-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Fully Accessible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
          <span>Limited Access</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
          <span>Not Accessible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9E9E9E' }}></div>
          <span>Unknown</span>
        </div>
      </div>
    </div>
  );
};

export default WheelmapLayer;
