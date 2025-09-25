// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom'; // Commented out for now due to ES module issues

// Mock global objects that might not be available in test environment
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

// Mock Web Workers
global.Worker = jest.fn(() => ({
  postMessage: jest.fn(),
  terminate: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Leaflet
global.L = {
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn(),
  })),
  polyline: jest.fn(() => ({
    addTo: jest.fn(),
    setLatLngs: jest.fn(),
    bringToFront: jest.fn(),
    setStyle: jest.fn(),
  })),
  latLngBounds: jest.fn(() => ({
    extend: jest.fn(),
  })),
  latLng: jest.fn(),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    setLatLng: jest.fn(),
  })),
};
