import React from 'react';

const RouteStep = React.memo(({
  step,
  stepNumber,
  isLast = false
}) => {
  const { instruction, distance, duration } = step;

  return (
    <div className="route-step">
      <div className="step-number">
        <span className="step-circle">{stepNumber}</span>
      </div>
      
      <div className="step-content">
        <div className="step-instruction">
          {instruction}
        </div>
        
        <div className="step-details">
          <span className="step-distance">{distance}m</span>
          <span className="step-duration">{Math.round(duration)}s</span>
        </div>
      </div>
      
      {!isLast && (
        <div className="step-connector">
          <div className="connector-line"></div>
        </div>
      )}
    </div>
  );
});

RouteStep.displayName = 'RouteStep';

export default RouteStep;
