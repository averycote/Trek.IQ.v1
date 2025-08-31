import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const AccessibilityConfidenceScore = ({ 
  route, 
  predictedBarriers, 
  accessibilityData, 
  isVisible = true,
  onScoreClick,
  isDarkMode = false
}) => {
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate confidence score based on multiple factors
  useEffect(() => {
    if (!route || !isVisible) return;

    const calculateScore = () => {
      let totalScore = 100;
      const breakdown = {
        dataQuality: 0,
        barrierPrediction: 0,
        accessibilityCoverage: 0,
        routeComplexity: 0,
        seasonalFactors: 0
      };

      // Data Quality Score (30% weight)
      const dataQualityScore = calculateDataQualityScore(route, accessibilityData);
      breakdown.dataQuality = dataQualityScore;
      totalScore += (dataQualityScore - 50) * 0.3;

      // Barrier Prediction Accuracy (25% weight)
      const predictionScore = calculatePredictionScore(predictedBarriers);
      breakdown.barrierPrediction = predictionScore;
      totalScore += (predictionScore - 50) * 0.25;

      // Accessibility Coverage (20% weight)
      const coverageScore = calculateCoverageScore(route, accessibilityData);
      breakdown.accessibilityCoverage = coverageScore;
      totalScore += (coverageScore - 50) * 0.2;

      // Route Complexity (15% weight)
      const complexityScore = calculateComplexityScore(route);
      breakdown.routeComplexity = complexityScore;
      totalScore += (complexityScore - 50) * 0.15;

      // Seasonal Factors (10% weight)
      const seasonalScore = calculateSeasonalScore(route);
      breakdown.seasonalFactors = seasonalScore;
      totalScore += (seasonalScore - 50) * 0.1;

      // Ensure score is within bounds
      totalScore = Math.max(0, Math.min(100, totalScore));

      setConfidenceScore(Math.round(totalScore));
      setScoreBreakdown(breakdown);
    };

    calculateScore();
  }, [route, predictedBarriers, accessibilityData, isVisible]);

  // Calculate data quality score
  const calculateDataQualityScore = (route, accessibilityData) => {
    let score = 50; // Base score

    // Check if we have accessibility data for the route
    if (accessibilityData && accessibilityData.length > 0) {
      const routePoints = route.coordinates || [];
      const coverage = accessibilityData.filter(point => 
        routePoints.some(coord => 
          Math.abs(coord.lat - point.lat) < 0.001 && 
          Math.abs(coord.lng - point.lng) < 0.001
        )
      ).length / routePoints.length;

      score += coverage * 30; // Up to 30 points for good coverage
    }

    // Check data freshness
    const dataAge = getDataAge(accessibilityData);
    if (dataAge < 24) { // Less than 24 hours
      score += 20;
    } else if (dataAge < 168) { // Less than a week
      score += 10;
    }

    return Math.min(100, score);
  };

  // Calculate prediction accuracy score
  const calculatePredictionScore = (predictedBarriers) => {
    if (!predictedBarriers || predictedBarriers.length === 0) {
      return 70; // No predictions = neutral score
    }

    let totalConfidence = 0;
    let highConfidenceCount = 0;

    predictedBarriers.forEach(prediction => {
      const confidence = prediction.confidence || 0.5;
      totalConfidence += confidence;
      
      if (confidence > 0.8) {
        highConfidenceCount++;
      }
    });

    const avgConfidence = totalConfidence / predictedBarriers.length;
    const highConfidenceRatio = highConfidenceCount / predictedBarriers.length;

    // Score based on average confidence and ratio of high-confidence predictions
    return Math.round((avgConfidence * 60) + (highConfidenceRatio * 40));
  };

  // Calculate accessibility coverage score
  const calculateCoverageScore = (route, accessibilityData) => {
    if (!route.coordinates || route.coordinates.length === 0) {
      return 50;
    }

    let score = 50;
    const routeLength = route.coordinates.length;

    // Check if we have accessibility data for key points
    const keyPoints = getKeyRoutePoints(route.coordinates);
    let coveredPoints = 0;

    keyPoints.forEach(point => {
      const hasData = accessibilityData?.some(data => 
        Math.abs(data.lat - point.lat) < 0.001 && 
        Math.abs(data.lng - point.lng) < 0.001
      );
      if (hasData) coveredPoints++;
    });

    const coverageRatio = coveredPoints / keyPoints.length;
    score += coverageRatio * 40; // Up to 40 points for good coverage

    // Bonus for comprehensive data
    if (accessibilityData && accessibilityData.length > routeLength * 0.5) {
      score += 10;
    }

    return Math.min(100, score);
  };

  // Calculate route complexity score
  const calculateComplexityScore = (route) => {
    if (!route.coordinates || route.coordinates.length < 2) {
      return 50;
    }

    let score = 50;
    const coordinates = route.coordinates;

    // Simpler routes get higher scores (easier to predict)
    if (coordinates.length < 10) {
      score += 20;
    } else if (coordinates.length < 50) {
      score += 10;
    } else {
      score -= 10; // Complex routes are harder to predict
    }

    // Check for straightness (straighter routes are easier to predict)
    const straightness = calculateRouteStraightness(coordinates);
    score += straightness * 20;

    return Math.min(100, Math.max(0, score));
  };

  // Calculate seasonal factors score
  const calculateSeasonalScore = (route) => {
    let score = 50;
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();

    // Seasonal adjustments
    if (month >= 11 || month <= 2) { // Winter
      score -= 15; // Winter conditions are harder to predict
    } else if (month >= 3 && month <= 5) { // Spring
      score -= 5; // Spring weather can be unpredictable
    } else if (month >= 6 && month <= 8) { // Summer
      score += 10; // Summer conditions are more predictable
    }

    // Time of day adjustments
    if (hour >= 6 && hour <= 18) { // Daytime
      score += 5;
    } else { // Nighttime
      score -= 10; // Night conditions are harder to assess
    }

    return Math.min(100, Math.max(0, score));
  };

  // Helper functions
  const getDataAge = (data) => {
    if (!data || data.length === 0) return 999; // Very old if no data
    // Mock implementation - would check actual data timestamps
    return Math.random() * 168; // 0-168 hours (1 week)
  };

  const getKeyRoutePoints = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return [];
    
    const keyPoints = [];
    const step = Math.max(1, Math.floor(coordinates.length / 5));
    
    for (let i = 0; i < coordinates.length; i += step) {
      keyPoints.push(coordinates[i]);
    }
    
    return keyPoints;
  };

  const calculateRouteStraightness = (coordinates) => {
    if (coordinates.length < 3) return 1.0;
    
    let totalAngle = 0;
    let angleCount = 0;
    
    for (let i = 1; i < coordinates.length - 1; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const next = coordinates[i + 1];
      
      const angle1 = Math.atan2(curr.lat - prev.lat, curr.lng - prev.lng);
      const angle2 = Math.atan2(next.lat - curr.lat, next.lng - curr.lng);
      
      let angleDiff = Math.abs(angle2 - angle1);
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      totalAngle += angleDiff;
      angleCount++;
    }
    
    const avgAngle = totalAngle / angleCount;
    // Convert to straightness (0 = very curvy, 1 = very straight)
    return Math.max(0, 1 - (avgAngle / Math.PI));
  };

  // Get score category and color
  const getScoreCategory = (score) => {
    if (score >= 80) return { category: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircleIcon };
    if (score >= 60) return { category: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: ShieldCheckIcon };
    if (score >= 40) return { category: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: InformationCircleIcon };
    if (score >= 20) return { category: 'Poor', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: ExclamationTriangleIcon };
    return { category: 'Very Poor', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircleIcon };
  };

  if (!isVisible || !confidenceScore) return null;

  const scoreInfo = getScoreCategory(confidenceScore);
  const IconComponent = scoreInfo.icon;

  return (
    <div className={`fixed top-20 right-4 z-50 transition-all duration-300 ${
      isExpanded ? 'w-80' : 'w-64'
    }`}>
      <div className={`p-4 rounded-lg shadow-lg border ${
        isDarkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-200'
      }`}>
        {/* Main Score Display */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <IconComponent className={`w-6 h-6 ${scoreInfo.color}`} />
            <div>
              <h3 className="text-sm font-semibold">Accessibility Confidence</h3>
              <p className={`text-xs ${scoreInfo.color}`}>{scoreInfo.category}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreInfo.color}`}>
              {confidenceScore}%
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              confidenceScore >= 80 ? 'bg-green-500' :
              confidenceScore >= 60 ? 'bg-blue-500' :
              confidenceScore >= 40 ? 'bg-yellow-500' :
              confidenceScore >= 20 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${confidenceScore}%` }}
          />
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Data Quality</span>
                <span className="font-semibold">{scoreBreakdown.dataQuality}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="h-1 bg-blue-500 rounded-full"
                  style={{ width: `${scoreBreakdown.dataQuality}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Barrier Prediction</span>
                <span className="font-semibold">{scoreBreakdown.barrierPrediction}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="h-1 bg-green-500 rounded-full"
                  style={{ width: `${scoreBreakdown.barrierPrediction}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Accessibility Coverage</span>
                <span className="font-semibold">{scoreBreakdown.accessibilityCoverage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="h-1 bg-purple-500 rounded-full"
                  style={{ width: `${scoreBreakdown.accessibilityCoverage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Route Complexity</span>
                <span className="font-semibold">{scoreBreakdown.routeComplexity}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="h-1 bg-orange-500 rounded-full"
                  style={{ width: `${scoreBreakdown.routeComplexity}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Seasonal Factors</span>
                <span className="font-semibold">{scoreBreakdown.seasonalFactors}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="h-1 bg-yellow-500 rounded-full"
                  style={{ width: `${scoreBreakdown.seasonalFactors}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {onScoreClick && (
          <button
            onClick={() => onScoreClick(confidenceScore, scoreBreakdown)}
            className={`w-full mt-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            View Route Details
          </button>
        )}
      </div>
    </div>
  );
};

export default AccessibilityConfidenceScore;
