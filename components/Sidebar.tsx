
import React from 'react';
import { DashboardIcon, UsersIcon, UserPlusIcon, GasCylinderIcon, ShieldCheckIcon, TruckIcon, XMarkIcon, ClockIcon } from './icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import { Route } from '../App';

interface SidebarProps {
  currentRoute: Route;
  isOpen: boolean;
  onClose: () => void;
}

const getIsActive = (to: string, currentRoute: Route): boolean => {
    switch (to) {
        case '/':
            return currentRoute.name === 'dashboard';
        case '/customers':
            return currentRoute.name === 'customers' || currentRoute.name === 'customer-detail' || currentRoute.name === 'add-customer';
        case '/deliveries':
            return currentRoute.name === 'deliveries';
        case '/bookings':
            return currentRoute.name === 'bookings';
        case '/admin':
            return currentRoute.name === 'admin';
        default:
            return false;
    }
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; currentRoute: Route }> = ({ to, icon, label, currentRoute }) => {
    const isActive = getIsActive(to, currentRoute);

    return (
      <a
        href={`#${to}`}
        className={
          `flex items-center px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-primary-100 dark:bg-gray-700 text-primary-600 dark:text-white font-semibold' : ''
          }`
        }
      >
        {icon}
        <span className="ml-3">{label}</span>
      </a>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ currentRoute, isOpen, onClose }) => {
  const { t } = useLanguage();
  
  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 sm:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col
        transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <GasCylinderIcon className="w-8 h-8 text-primary-600" />
            <span className="ml-2 text-2xl font-bold text-gray-800 dark:text-gray-200">{t('sidebar.title')}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem to="/" icon={<DashboardIcon className="w-6 h-6" />} label={t('sidebar.dashboard')} currentRoute={currentRoute} />
          <NavItem to="/customers" icon={<UsersIcon className="w-6 h-6" />} label={t('sidebar.customers')} currentRoute={currentRoute} />
          <NavItem to="/deliveries" icon={<TruckIcon className="w-6 h-6" />} label={t('sidebar.deliveries')} currentRoute={currentRoute} />
          <NavItem to="/bookings" icon={<ClockIcon className="w-6 h-6" />} label={t('sidebar.bookings')} currentRoute={currentRoute} />
          <NavItem to="/admin" icon={<ShieldCheckIcon className="w-6 h-6" />} label={t('sidebar.admin')} currentRoute={currentRoute} />
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500">{t('sidebar.footer')}</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
