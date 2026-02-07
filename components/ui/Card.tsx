import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'elevated';
}

/**
 * Card - Reusable card container component
 *
 * Atomic UI component for consistent card styling
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  variant = 'default'
}) => {
  const baseStyles = 'bg-white rounded-3xl transition-all';

  const variants = {
    default: 'border border-slate-100',
    bordered: 'border-2 border-slate-200',
    elevated: 'shadow-lg border border-slate-50'
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`border-b border-slate-100 pb-4 mb-6 ${className}`}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, icon, className = '' }) => {
  return (
    <h2 className={`text-lg font-bold text-slate-900 flex items-center gap-2 ${className}`}>
      {icon}
      {children}
    </h2>
  );
};

export default Card;
