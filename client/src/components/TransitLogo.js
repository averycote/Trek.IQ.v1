import React from 'react';

const TransitLogo = ({
  className = '',
  size = 'medium',
  style = {},
  showText = true
}) => {
  const sizeStyles = {
    small: { width: '80px', height: 'auto' },
    medium: { width: '120px', height: 'auto' },
    large: { width: '160px', height: 'auto' }
  };

  const logoStyle = {
    ...sizeStyles[size],
    ...style,
    display: 'inline-block',
    verticalAlign: 'middle'
  };

  return (
    <div className={`transit-logo ${className}`} style={{ display: 'inline-block' }}>
      <img
        src="/transit-api-badge@3x.png"
        alt="Powered by Transit"
        style={logoStyle}
        onError={(e) => {
          console.warn('Transit logo failed to load');
          // Hide the logo if it fails to load
          e.target.style.display = 'none';
        }}
      />
      {showText && (
        <span
          className="transit-attribution-text"
          style={{
            fontSize: '12px',
            color: '#666',
            marginLeft: '8px',
            verticalAlign: 'middle',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          Powered by Transit
        </span>
      )}
    </div>
  );
};

export default TransitLogo;
