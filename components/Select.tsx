
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ label, name, error, children, ...props }, ref) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        ref={ref}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm
          ${error
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500'
          }
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});


Select.displayName = 'Select';
export default Select;
