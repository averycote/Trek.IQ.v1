/**
 * Elevation Service Test Utility
 * 
 * Test the Open-Elevation API integration to ensure it works correctly
 */

import elevationService from '../services/elevationService';

/**
 * Test the elevation service with Halifax coordinates
 */
export const testElevationService = async () => {
  console.log('🧪 Testing Open-Elevation API integration...');
  
  try {
    // Test coordinates around Halifax, Nova Scotia
    const testCoordinates = [
      { latitude: 44.6488, longitude: -63.5752 }, // Halifax Downtown
      { latitude: 44.6366, longitude: -63.5917 }, // Dalhousie University
      { latitude: 44.6428, longitude: -63.5762 }, // Halifax Public Gardens
      { latitude: 44.6581, longitude: -63.5791 }, // Halifax Transit Terminal
      { latitude: 44.6502, longitude: -63.5747 }  // South Park Street
    ];
    
    console.log(`📍 Testing with ${testCoordinates.length} Halifax coordinates`);
    
    // Test the elevation service
    const startTime = performance.now();
    const results = await elevationService.getElevation(testCoordinates);
    const endTime = performance.now();
    
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ Elevation API test completed in ${duration}ms`);
    console.log(`📊 Results:`, results);
    
    // Validate results
    if (results && results.length === testCoordinates.length) {
      console.log('✅ All elevation points retrieved successfully');
      
      results.forEach((result, index) => {
        console.log(`  Point ${index + 1}: ${result.latitude}, ${result.longitude} = ${result.elevation}m`);
      });
      
      return {
        success: true,
        duration,
        results,
        message: `Retrieved ${results.length} elevation points successfully`
      };
    } else {
      console.warn('⚠️ Elevation results incomplete or using fallback data');
      return {
        success: false,
        duration,
        results,
        message: 'Elevation service returned incomplete results (may be using fallback)'
      };
    }
    
  } catch (error) {
    console.error('❌ Elevation service test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Elevation service test failed'
    };
  }
};

/**
 * Test route elevation analysis
 */
export const testRouteElevationAnalysis = async () => {
  console.log('🧪 Testing route elevation analysis...');
  
  try {
    // Simple route from Halifax downtown to Dalhousie University
    const routeCoordinates = [
      [-63.5752, 44.6488], // Halifax Downtown
      [-63.5780, 44.6450], // Intermediate point
      [-63.5850, 44.6400], // Intermediate point
      [-63.5917, 44.6366]  // Dalhousie University
    ];
    
    console.log(`🛣️ Testing route analysis with ${routeCoordinates.length} coordinate points`);
    
    const startTime = performance.now();
    const analysis = await elevationService.analyzeRouteElevation(routeCoordinates);
    const endTime = performance.now();
    
    const duration = Math.round(endTime - startTime);
    
    console.log(`✅ Route elevation analysis completed in ${duration}ms`);
    console.log(`📊 Analysis:`, analysis);
    
    return {
      success: true,
      duration,
      analysis,
      message: `Route analysis completed with ${analysis.available ? 'real' : 'fallback'} data`
    };
    
  } catch (error) {
    console.error('❌ Route elevation analysis test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Route elevation analysis failed'
    };
  }
};

/**
 * Run all elevation tests
 */
export const runElevationTests = async () => {
  console.log('🚀 Starting comprehensive elevation service tests...');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: Basic elevation lookup
  console.log('\n--- Test 1: Basic Elevation Lookup ---');
  const test1 = await testElevationService();
  results.tests.push({
    name: 'Basic Elevation Lookup',
    ...test1
  });
  
  // Test 2: Route elevation analysis
  console.log('\n--- Test 2: Route Elevation Analysis ---');
  const test2 = await testRouteElevationAnalysis();
  results.tests.push({
    name: 'Route Elevation Analysis',
    ...test2
  });
  
  // Summary
  const passedTests = results.tests.filter(test => test.success).length;
  const totalTests = results.tests.length;
  
  console.log(`\n🏁 Elevation Service Tests Complete: ${passedTests}/${totalTests} passed`);
  
  results.summary = {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    success: passedTests === totalTests
  };
  
  // Make results available globally for verification
  if (typeof window !== 'undefined') {
    window.TREK_IQ_ELEVATION_TEST_RESULTS = results;
  }
  
  return results;
};

export default {
  testElevationService,
  testRouteElevationAnalysis,
  runElevationTests
};
