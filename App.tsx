
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CustomerListPage from './pages/CustomerListPage';
import AddCustomerPage from './pages/AddCustomerPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import AdminPage from './pages/AdminPage';
import DeliveryPage from './pages/DeliveryPage';
import AssignDeliveryPage from './pages/AssignDeliveryPage';
import StockPage from './pages/StockPage';
import BookingsPage from './pages/BookingsPage';
import GasTransactionsPage from './pages/GasTransactionsPage';
import PasswordModal from './components/PasswordModal';
import { useDarkMode } from './hooks/useDarkMode';
import { loginAdminUser, getCurrentAuthAppUser } from './services/api';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

export type Route =
  | { name: 'dashboard' }
  | { name: 'customers' }
  | { name: 'add-customer' }
  | { name: 'deliveries' }
  | { name: 'assign-delivery' }
  | { name: 'stock' }
  | { name: 'bookings' }
  | { name: 'gas-transactions' }
  | { name: 'admin' }
  | { name: 'customer-detail'; id: string }
  | { name: 'not-found' };

const parseRoute = (hash: string): Route => {
    const path = hash.substring(1) || '/';
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 0 || path === '/') return { name: 'dashboard' };

    switch (parts[0]) {
        case 'customers':
            return parts[1] ? { name: 'customer-detail', id: parts[1] } : { name: 'customers' };
        case 'add-customer':
            return { name: 'add-customer' };
        case 'deliveries':
            return { name: 'deliveries' };
        case 'assign-delivery':
            return { name: 'assign-delivery' };
        case 'stock':
            return { name: 'stock' };
        case 'bookings':
            return { name: 'bookings' };
        case 'gas-transactions':
            return { name: 'gas-transactions' };
        case 'admin':
            return { name: 'admin' };
        default:
            return { name: 'not-found' };
    }
};

const AppContent: React.FC = () => {
    useDarkMode();
    const { t } = useLanguage();
  
    const [route, setRoute] = useState(() => parseRoute(window.location.hash));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        // Auto-close sidebar on route change for mobile
        setIsSidebarOpen(false);
    }, [route]);
    
    useEffect(() => {
        const handleHashChange = () => {
            setRoute(parseRoute(window.location.hash));
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Check route on initial load

        // Check firebase auth state
        getCurrentAuthAppUser().then(user => {
            if (user) {
                setIsAuthenticated(true);
            }
            setCheckingAuth(false);
        }).catch(() => {
            setCheckingAuth(false);
        });

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []); 
    
    const handleLoginSubmit = async (email: string, password: string) => {
        const user = await loginAdminUser(email, password);
        if (user.uid === 'master-admin') {
            try {
                localStorage.setItem('master_admin_session', 'true');
            } catch (e) {}
        }
        setIsAuthenticated(true);
    };
  
    const renderContent = () => {
        switch (route.name) {
            case 'dashboard':
                return <Dashboard />;
            case 'customers':
                return <CustomerListPage />;
            case 'add-customer':
                return <AddCustomerPage />;
            case 'deliveries':
                return <DeliveryPage />;
            case 'assign-delivery':
                return <AssignDeliveryPage />;
            case 'stock':
                return <StockPage />;
            case 'bookings':
                return <BookingsPage />;
            case 'gas-transactions':
                return <GasTransactionsPage />;
            case 'admin':
                return <AdminPage />;
            case 'customer-detail':
                return <CustomerDetailPage id={route.id} />;
            case 'not-found':
            default:
                return <div className="text-center p-8">{t('app.pageNotFound')}</div>;
        }
    };

    if (checkingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <PasswordModal 
                    isOpen={true}
                    onSubmit={handleLoginSubmit}
                />
            </div>
        );
    }

    return (
        <>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden relative">
                <Sidebar 
                    currentRoute={route} 
                    isOpen={isSidebarOpen} 
                    onClose={() => setIsSidebarOpen(false)} 
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8">
                        {renderContent()}
                    </main>
                </div>
            </div>
        </>
    );
};

const App: React.FC = () => (
    <LanguageProvider>
        <AppContent />
    </LanguageProvider>
);

export default App;
