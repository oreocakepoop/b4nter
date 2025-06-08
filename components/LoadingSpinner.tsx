
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string; // Allow passing additional classes like text-primary, etc.
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const sizeClass = `loading-${size}`;
  
  return (
    <span className={`loading loading-spinner ${sizeClass} ${className || ''}`}></span>
  );
};

export default LoadingSpinner;