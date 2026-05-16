import React, { useState, useEffect, useRef } from 'react';
import { getDashboardStats, getCustomers, addTransaction } from '../services/api';
import Card from '../components/Card';
import DataTable, { Column } from '../components/DataTable';
import { Transaction, Customer } from '../types';
import { UsersIcon, CurrencyDollarIcon, TruckIcon, ShieldCheckIcon, ClockIcon } from '../components/icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { CustomerInfo } from '../components/CustomerInfo';

import { GAS_COMPANIES } from '../constants';

interface DashboardStats {
  totalCustomers: number;
  totalTransactions: number;
  totalOutstanding: number;
  pendingDeliveries: number;
  completedDeliveriesInPeriod: number;
  recentTransactions: (Transaction & { customerName: string })[];
}

const QuickSellForm: React.FC<{ onSaleRecorded: () => void }> = ({ onSaleRecorded }) => {
    const { t } = useLanguage();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        price: '',
        amountPaid: '',
        description: '14.2kg Refill',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        getCustomers().then(setCustomers);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.mobileNo.includes(searchQuery) ||
        c.consumerNo.includes(searchQuery)
    ).slice(0, 10);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setSearchQuery(`${customer.name} (${customer.consumerNo})`);
        setShowDropdown(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer && !searchQuery.trim()) {
            alert(t('dashboard.quickSell.error'));
            return;
        }

        setIsSubmitting(true);
        try {
            const transactionData: any = {
                price: Number(formData.price),
                amountPaid: Number(formData.amountPaid),
                description: formData.description,
                gasCompanyGiven: GAS_COMPANIES[0],
                source: 'quick-sell' as const,
            };

            if (!selectedCustomer) {
                transactionData.walkInName = searchQuery;
            }

            await addTransaction(selectedCustomer?.id, transactionData);
            
            if (selectedCustomer) {
                const isUnbooked = !selectedCustomer.lastBookingDate || (new Date().getTime() - new Date(selectedCustomer.lastBookingDate).getTime()) / (1000 * 3600 * 24) >= 45;
                if (isUnbooked) {
                    if (window.confirm(t('dashboard.quickSell.unbookedAlert'))) {
                        await import('../services/api').then(api => api.updateCustomer(selectedCustomer.id, { lastBookingDate: new Date().toISOString() }));
                    }
                }
            }

            alert(t('dashboard.quickSell.success'));
            
            // Reset form
            setFormData({
                price: '',
                amountPaid: '',
                description: '14.2kg Refill',
            });
            setSearchQuery('');
            setSelectedCustomer(null);
            onSaleRecorded();
        } catch (error) {
            console.error("Quick sell error:", error);
            alert(t('dashboard.quickSell.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('dashboard.quickSell.title')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('dashboard.quickSell.searchCustomer')}
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowDropdown(true);
                                setSelectedCustomer(null);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder={t('dashboard.quickSell.searchCustomer')}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">{t('dashboard.quickSell.customerNote')}</p>
                        {showDropdown && searchQuery && !selectedCustomer && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(c => (
                                        <div 
                                            key={c.id} 
                                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                            onClick={() => handleCustomerSelect(c)}
                                        >
                                            <CustomerInfo customer={c} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-2 text-gray-500 dark:text-gray-400">No customers found</div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <Input label={t('dashboard.quickSell.description')} name="description" value={formData.description} onChange={handleChange} required />
                    <Input label={t('dashboard.quickSell.price')} name="price" type="number" value={formData.price} onChange={handleChange} required />
                    <Input label={t('dashboard.quickSell.amountPaid')} name="amountPaid" type="number" value={formData.amountPaid} onChange={handleChange} required />
                </div>
                
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !searchQuery.trim()}>
                        {isSubmitting ? '...' : t('dashboard.quickSell.sellAction')}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const [activeFilter, setActiveFilter] = useState('all');

  const { t, language } = useLanguage();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats(dateRange.start && dateRange.end ? { start: dateRange.start, end: dateRange.end } : undefined);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const setDateFilter = (filter: string) => {
    setActiveFilter(filter);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch(filter) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case 'all':
        default:
            setDateRange({ start: null, end: null });
            return;
    }
    setDateRange({ start, end });
  }

  const transactionColumns: Column<Transaction & { customerName: string }>[] = [
    { header: t('dashboard.table.customer'), accessor: 'customerName' },
    { header: t('dashboard.table.date'), accessor: (item) => new Date(item.date).toLocaleDateString(locale) },
    { header: t('dashboard.table.price'), accessor: (item) => `₹${item.price.toLocaleString(locale)}` },
    { header: t('dashboard.table.amountPaid'), accessor: (item) => `₹${item.amountPaid.toLocaleString(locale)}` },
    { header: t('dashboard.table.amountDue'), accessor: (item) => {
        const due = item.price - item.amountPaid;
        const color = due > 0 ? 'text-red-600' : due < 0 ? 'text-green-600' : '';
        return <span className={color}>{`₹${due.toLocaleString(locale)}`}</span>;
    } },
    { header: t('dashboard.table.description'), accessor: 'description' },
  ];
  
  if (loading) {
    return <div className="text-center p-8">{t('messages.loadingDashboard')}</div>;
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('dashboard.title')}</h2>
            <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                <Button size="sm" variant={activeFilter === 'all' ? 'primary' : 'secondary'} onClick={() => setDateFilter('all')}>{t('dashboard.filters.all')}</Button>
                <Button size="sm" variant={activeFilter === 'today' ? 'primary' : 'secondary'} onClick={() => setDateFilter('today')}>{t('dashboard.filters.today')}</Button>
                <Button size="sm" variant={activeFilter === 'month' ? 'primary' : 'secondary'} onClick={() => setDateFilter('month')}>{t('dashboard.filters.month')}</Button>
                <Button size="sm" variant={activeFilter === 'year' ? 'primary' : 'secondary'} onClick={() => setDateFilter('year')}>{t('dashboard.filters.year')}</Button>
            </div>
        </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card title={t('dashboard.activeCustomers')} value={(stats?.totalCustomers ?? 0).toLocaleString(locale)} icon={<UsersIcon className="w-8 h-8"/>} />
        <Card title={t('dashboard.pendingDeliveries')} value={(stats?.pendingDeliveries ?? 0).toLocaleString(locale)} icon={<TruckIcon className="w-8 h-8"/>} />
        <Card title={t('dashboard.pendingBookings')} value={(stats?.pendingBookings ?? 0).toLocaleString(locale)} icon={<ClockIcon className="w-8 h-8 text-amber-500"/>} />
        <Card title={t('dashboard.completedDeliveries')} value={(stats?.completedDeliveriesInPeriod ?? 0).toLocaleString(locale)} icon={<ShieldCheckIcon className="w-8 h-8"/>} />
        <Card title={t('dashboard.outstandingBalance')} value={`₹${(stats?.totalOutstanding ?? 0).toLocaleString(locale)}`} icon={<CurrencyDollarIcon className="w-8 h-8 text-red-500"/>} />
      </div>

      <QuickSellForm onSaleRecorded={fetchStats} />

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('dashboard.recentTransactions')}</h3>
        <DataTable columns={transactionColumns} data={stats?.recentTransactions ?? []} emptyMessage={t('messages.noRecentTransactions')}/>
      </div>
    </div>
  );
};

export default Dashboard;