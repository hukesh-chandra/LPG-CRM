
import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, value, icon, children }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className="p-3 bg-primary-100 dark:bg-primary-500/20 rounded-full text-primary-600 dark:text-primary-300">
          {icon}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

export default Card;
