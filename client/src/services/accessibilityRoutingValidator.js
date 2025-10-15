/**
 * Accessibility Routing Validator
 * 
 * Validates that the accessibility routing is actually working
 * and provides detailed analysis of route quality
 */

class AccessibilityRoutingValidator {
  constructor() {
    this.testCases = [];
    this.validationResults = [];
  }

  /**
   * Initialize with test cases
   */
  async initialize() {
    console.log('🧪 Initializing Accessibility Routing Validator...');
    
    // Define test cases for Halifax
    this.testCases = [
      {
        id: 'test_1',
        name: 'Halifax Terminal to Spring Garden Road',
        origin: [-63.5752, 44.6488], // Halifax Terminal
        destination: [-63.5806, 44.6478], // Spring Garden Road
        expectedAccessibility: 'high',
        shouldAvoidSteps: true,
        wheelchairAccessible: true
      },
      {
        id: 'test_2',
        name: 'Dartmouth Ferry to Halifax Ferry',
        origin: [-63.5900, 44.6400], // Dartmouth Ferry
        destination: [-63.5700, 44.6470], // Halifax Ferry
        expectedAccessibility: 'high',
        shouldAvoidSteps: true,
        wheelchairAccessible: true
      },
      {
        id: 'test_3',
        name: 'Halifax Waterfront to Historic Properties',
        origin: [-63.5708, 44.6369], // Halifax Waterfront
        destination: [-63.5708, 44.6369], // Historic Properties
        expectedAccessibility: 'high',
        shouldAvoidSteps: true,
        wheelchairAccessible: true
      },
      {
        id: 'test_4',
        name: 'Citadel Hill to Public Gardens',
        origin: [-63.5806, 44.6478], // Citadel Hill area
        destination: [-63.5806, 44.6478], // Public Gardens
        expectedAccessibility: 'medium',
        shouldAvoidSteps: true,
        wheelchairAccessible: false // May have steps
      }
    ];
    
    console.log(`✅ Validator initialized with ${this.testCases.length} test cases`);
  }

  /**
   * Run comprehensive validation tests
   */
  async runValidationTests(routingService) {
    console.log('🔍 Running accessibility routing validation tests...');
    
    this.validationResults = [];
    
    for (const testCase of this.testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      
      try {
        const result = await this.validateTestCase(testCase, routingService);
        this.validationResults.push(result);
        
        console.log(`✅ Test ${testCase.id}: ${result.status}`);
        if (result.issues.length > 0) {
          console.log(`⚠️ Issues found: ${result.issues.join(', ')}`);
        }
      } catch (error) {
        console.error(`❌ Test ${testCase.id} failed:`, error);
        this.validationResults.push({
          testCase: testCase,
          status: 'failed',
          error: error.message,
          issues: ['Test execution failed']
        });
      }
    }
    
    return this.generateValidationReport();
  }

  /**
   * Validate a single test case
   */
  async validateTestCase(testCase, routingService) {
    const result = {
      testCase: testCase,
      status: 'unknown',
      issues: [],
      route: null,
      accessibilityScore: 0,
      barriersFound: 0,
      stepsFound: 0,
      analysis: {}
    };

    try {
      // Calculate route with accessibility preferences
      const route = await routingService.calculateRoute(
        testCase.origin,
        testCase.destination,
        {
          avoidSteps: testCase.shouldAvoidSteps,
          wheelchairAccessible: testCase.wheelchairAccessible,
          preferWellLit: true,
          avoidSteepSlopes: true
        }
      );

      result.route = route;
      
      // Analyze route accessibility
      const analysis = this.analyzeRouteAccessibility(route, testCase);
      result.analysis = analysis;
      result.accessibilityScore = analysis.overallScore;
      result.barriersFound = analysis.barriers.length;
      result.stepsFound = analysis.steps.length;

      // Validate against expectations
      this.validateRouteQuality(result, testCase);

      result.status = result.issues.length === 0 ? 'passed' : 'warning';

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      result.issues.push('Route calculation failed');
    }

    return result;
  }

  /**
   * Analyze route accessibility
   */
  analyzeRouteAccessibility(route, testCase) {
    const analysis = {
      overallScore: 0,
      barriers: [],
      steps: [],
      narrowPaths: [],
      poorLighting: [],
      winterIssues: [],
      recommendations: []
    };

    if (!route || !route.features || route.features.length === 0) {
      analysis.overallScore = 0;
      analysis.recommendations.push('No route found');
      return analysis;
    }

    const routeFeature = route.features[0];
    const coordinates = routeFeature.geometry.coordinates;
    const properties = routeFeature.properties;

    // Start with base score
    analysis.overallScore = properties.accessibility?.score || 50;

    // Check for barriers
    if (properties.accessibility?.barriers) {
      analysis.barriers = properties.accessibility.barriers;
      analysis.overallScore -= analysis.barriers.length * 10;
    }

    // Check for steps (should be avoided)
    if (testCase.shouldAvoidSteps) {
      // This would need to be enhanced with actual step detection
      // For now, we'll check if the route mentions steps
      if (properties.accessibility?.barriers) {
        const stepBarriers = properties.accessibility.barriers.filter(
          b => b.type === 'steps' || b.description?.toLowerCase().includes('step')
        );
        analysis.steps = stepBarriers;
        analysis.overallScore -= stepBarriers.length * 20;
      }
    }

    // Check for narrow paths
    if (testCase.wheelchairAccessible) {
      if (properties.accessibility?.barriers) {
        const narrowBarriers = properties.accessibility.barriers.filter(
          b => b.type === 'narrow_path'
        );
        analysis.narrowPaths = narrowBarriers;
        analysis.overallScore -= narrowBarriers.length * 15;
      }
    }

    // Generate recommendations
    if (analysis.overallScore < 70) {
      analysis.recommendations.push('Route has accessibility concerns');
    }
    if (analysis.steps.length > 0 && testCase.shouldAvoidSteps) {
      analysis.recommendations.push('Route includes steps that should be avoided');
    }
    if (analysis.narrowPaths.length > 0 && testCase.wheelchairAccessible) {
      analysis.recommendations.push('Route includes narrow paths unsuitable for wheelchairs');
    }

    return analysis;
  }

  /**
   * Validate route quality against expectations
   */
  validateRouteQuality(result, testCase) {
    // Check if route was found
    if (!result.route || !result.route.features || result.route.features.length === 0) {
      result.issues.push('No route found');
      return;
    }

    // Check accessibility score
    if (result.accessibilityScore < 60) {
      result.issues.push(`Low accessibility score: ${result.accessibilityScore}`);
    }

    // Check for steps when they should be avoided
    if (testCase.shouldAvoidSteps && result.stepsFound > 0) {
      result.issues.push(`Route includes ${result.stepsFound} step(s) that should be avoided`);
    }

    // Check for barriers
    if (result.barriersFound > 2) {
      result.issues.push(`Route has ${result.barriersFound} accessibility barriers`);
    }

    // Check wheelchair accessibility
    if (testCase.wheelchairAccessible && result.analysis.narrowPaths.length > 0) {
      result.issues.push('Route includes narrow paths unsuitable for wheelchairs');
    }
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testCases.length,
      passed: 0,
      warnings: 0,
      failed: 0,
      overallScore: 0,
      summary: {},
      detailedResults: this.validationResults
    };

    // Count results
    for (const result of this.validationResults) {
      switch (result.status) {
        case 'passed':
          report.passed++;
          break;
        case 'warning':
          report.warnings++;
          break;
        case 'failed':
          report.failed++;
          break;
      }
    }

    // Calculate overall score
    const totalScore = this.validationResults.reduce((sum, result) => {
      return sum + (result.accessibilityScore || 0);
    }, 0);
    report.overallScore = Math.round(totalScore / this.validationResults.length);

    // Generate summary
    report.summary = {
      accessibilityRouting: report.overallScore >= 70 ? 'Working' : 'Needs Improvement',
      barrierAvoidance: report.warnings + report.failed === 0 ? 'Effective' : 'Needs Work',
      wheelchairSupport: this.checkWheelchairSupport(),
      stepAvoidance: this.checkStepAvoidance()
    };

    console.log('\n📊 VALIDATION REPORT');
    console.log('==================');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed}`);
    console.log(`Warnings: ${report.warnings}`);
    console.log(`Failed: ${report.failed}`);
    console.log(`Overall Score: ${report.overallScore}/100`);
    console.log(`Accessibility Routing: ${report.summary.accessibilityRouting}`);
    console.log(`Barrier Avoidance: ${report.summary.barrierAvoidance}`);
    console.log(`Wheelchair Support: ${report.summary.wheelchairSupport}`);
    console.log(`Step Avoidance: ${report.summary.stepAvoidance}`);

    return report;
  }

  /**
   * Check wheelchair support effectiveness
   */
  checkWheelchairSupport() {
    const wheelchairTests = this.validationResults.filter(
      r => r.testCase.wheelchairAccessible
    );
    
    if (wheelchairTests.length === 0) return 'Not Tested';
    
    const successfulTests = wheelchairTests.filter(
      r => r.status === 'passed' && r.analysis.narrowPaths.length === 0
    );
    
    const successRate = (successfulTests.length / wheelchairTests.length) * 100;
    
    if (successRate >= 80) return 'Excellent';
    if (successRate >= 60) return 'Good';
    if (successRate >= 40) return 'Fair';
    return 'Poor';
  }

  /**
   * Check step avoidance effectiveness
   */
  checkStepAvoidance() {
    const stepAvoidanceTests = this.validationResults.filter(
      r => r.testCase.shouldAvoidSteps
    );
    
    if (stepAvoidanceTests.length === 0) return 'Not Tested';
    
    const successfulTests = stepAvoidanceTests.filter(
      r => r.status === 'passed' && r.stepsFound === 0
    );
    
    const successRate = (successfulTests.length / stepAvoidanceTests.length) * 100;
    
    if (successRate >= 80) return 'Excellent';
    if (successRate >= 60) return 'Good';
    if (successRate >= 40) return 'Fair';
    return 'Poor';
  }

  /**
   * Get validation results
   */
  getValidationResults() {
    return this.validationResults;
  }

  /**
   * Export validation report
   */
  exportReport() {
    const report = this.generateValidationReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-routing-validation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const accessibilityRoutingValidator = new AccessibilityRoutingValidator();

export default accessibilityRoutingValidator;

