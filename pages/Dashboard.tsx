import React, { useState, useEffect, useRef } from 'react';
import { getDashboardStats, getCustomers, addTransaction, isCustomerUnbooked, getEligibleBookingDate, getBookingCycleDays, listStockLocations, listStockTransactions } from '../services/api';
import Card from '../components/Card';
import DataTable, { Column } from '../components/DataTable';
import { Transaction, Customer, StockLocation, StockTransaction, CYLINDER_TYPE_LABELS, DOMESTIC_14KG_CYLINDERS } from '../types';
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
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchBy, setSearchBy] = useState<'mobileNo' | 'name' | 'relationName' | 'consumerNo' | 'customerId'>('mobileNo');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        price: '',
        amountPaid: '',
        paymentMethod: 'cash',
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

    const filteredCustomers = React.useMemo(() => {
        if (!searchQuery.trim()) return customers.slice(0, 10);
        const lowerSearch = searchQuery.trim().toLowerCase();
        return customers.filter(c => {
            switch (searchBy) {
                case 'mobileNo': return c.mobileNo && c.mobileNo.includes(searchQuery.trim());
                case 'name': return (c.name && c.name.toLowerCase().includes(lowerSearch)) || (c.relationName && c.relationName.toLowerCase().includes(lowerSearch));
                case 'relationName': return c.relationName && c.relationName.toLowerCase().includes(lowerSearch);
                case 'consumerNo': return c.consumerNo && c.consumerNo.toLowerCase().includes(lowerSearch);
                case 'customerId': return c.customerId && c.customerId.toLowerCase().includes(lowerSearch);
                default: return true;
            }
        }).slice(0, 10);
    }, [customers, searchQuery, searchBy]);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        const rel = customer.relationName ? ` (${customer.relationType || 'S/O'} ${customer.relationName})` : '';
        setSearchQuery(`${customer.name}${rel} - ${customer.consumerNo}`);
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

        const numericPrice = Number(formData.price);
        const is14kgRefill = formData.description.toLowerCase().includes('14.2') || formData.description.toLowerCase().includes('14kg') || formData.description.toLowerCase().includes('refill') || !formData.description;

        // OUT-OF-CYCLE PRICE WARNING FOR 14.2KG REFILLS
        if (selectedCustomer && selectedCustomer.lastBookingDate && is14kgRefill) {
            const isUnbooked = isCustomerUnbooked(selectedCustomer.lastBookingDate, selectedCustomer.agencyName);
            if (!isUnbooked && numericPrice < 1600) {
                const cycleDays = getBookingCycleDays(selectedCustomer.agencyName);
                const eligibleDate = getEligibleBookingDate(selectedCustomer.lastBookingDate, selectedCustomer.agencyName);
                const warningMsg = `⚠️ OUT-OF-CYCLE REFILL WARNING:\n\n` +
                    `Customer ${selectedCustomer.name} booked recently on ${new Date(selectedCustomer.lastBookingDate).toLocaleDateString(locale)}.\n` +
                    `Their ${cycleDays}-day booking cycle is NOT complete yet (Eligible date: ${eligibleDate.toLocaleDateString(locale)}).\n\n` +
                    `For out-of-cycle refills, the standard non-subsidized price should be at least ₹1,600.\n` +
                    `You have entered ₹${numericPrice}.\n\n` +
                    `Are you sure you want to proceed with ₹${numericPrice}?`;
                
                if (!window.confirm(warningMsg)) {
                    return; // Stop submission if user cancels
                }
            }
        }

        setIsSubmitting(true);
        try {
            const transactionData: any = {
                price: numericPrice,
                amountPaid: Number(formData.amountPaid),
                paymentMethod: formData.paymentMethod,
                description: formData.description,
                gasCompanyGiven: selectedCustomer?.agencyName || GAS_COMPANIES[0],
                source: 'quick-sell' as const,
            };

            if (!selectedCustomer) {
                transactionData.walkInName = searchQuery;
            }

            await addTransaction(selectedCustomer?.id, transactionData);
            
            if (selectedCustomer) {
                const isUnbooked = isCustomerUnbooked(selectedCustomer.lastBookingDate, selectedCustomer.agencyName);
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
                paymentMethod: 'cash',
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
                        <div className="flex gap-2">
                            <select 
                                value={searchBy}
                                onChange={(e) => setSearchBy(e.target.value as any)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="mobileNo">{t('addCustomerPage.form.mobileNo')}</option>
                                <option value="name">{t('addCustomerPage.form.name')}</option>
                                <option value="relationName">{t('addCustomerPage.form.relationName')}</option>
                                <option value="consumerNo">{t('addCustomerPage.form.consumerNo')}</option>
                                <option value="customerId">{t('addCustomerPage.form.customerId')}</option>
                            </select>
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
                        </div>
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
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Payment Method
                        </label>
                        <select
                            name="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="cash">Cash Payment</option>
                            <option value="online">Online / UPI Transfer</option>
                        </select>
                    </div>
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
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [stockLogs, setStockLogs] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const [activeFilter, setActiveFilter] = useState('all');

  const { t, language } = useLanguage();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [data, locs, txs] = await Promise.all([
        getDashboardStats(dateRange.start && dateRange.end ? { start: dateRange.start, end: dateRange.end } : undefined),
        listStockLocations(),
        listStockTransactions(10),
      ]);
      setStats(data);
      setStockLocations(locs);
      setStockLogs(txs);
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

  const transactionColumns: Column<Transaction & { customerName: string }>[] = React.useMemo(() => [
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
  ], [t, locale]);
  
  if (loading) {
    return <div className="text-center p-8">{t('messages.loadingDashboard')}</div>;
  }

  // Calculate total 14.2kg stocks on Home Page
  const stock14kgSummary = stockLocations.reduce((acc, loc) => {
    DOMESTIC_14KG_CYLINDERS.forEach(type => {
      const s = loc.stock?.[type] || { filled: 0, empty: 0 };
      acc.filled += s.filled || 0;
      acc.empty += s.empty || 0;
    });
    return acc;
  }, { filled: 0, empty: 0 });

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

      {/* 14.2kg Stock Overview Card on Home Page */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    📦 Stock Overview (14.2kg Domestic Refills)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Live cylinder inventory counts across Godown, Showroom Counter, and Delivery Vehicles.
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total 14.2kg Filled</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">{stock14kgSummary.filled} units</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total 14.2kg Empties</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{stock14kgSummary.empty} units</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stockLocations.map((loc) => (
                <div key={loc.id} className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-md border border-gray-200 dark:border-gray-600 space-y-2">
                    <h4 className="font-semibold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                        {loc.name}
                    </h4>
                    {DOMESTIC_14KG_CYLINDERS.map((type) => {
                        const s = loc.stock?.[type] || { filled: 0, empty: 0 };
                        return (
                            <div key={type} className="flex justify-between text-xs py-0.5 border-b border-gray-100 dark:border-gray-600/50 last:border-b-0">
                                <span className="text-gray-600 dark:text-gray-400">{CYLINDER_TYPE_LABELS[type]}</span>
                                <div>
                                    <span className="text-green-600 font-medium mr-2">{s.filled}F</span>
                                    <span className="text-amber-600 font-medium">{s.empty}E</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
      </div>

      <QuickSellForm onSaleRecorded={fetchStats} />

      {/* Recent Stock Log on Home Page */}
      {stockLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-3">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Recent Stock Movements</h3>
            <div className="space-y-2">
                {stockLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex justify-between items-center text-xs p-2.5 rounded bg-gray-50 dark:bg-gray-700/50">
                        <div>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 mr-2">
                                [{log.type.toUpperCase()}] {CYLINDER_TYPE_LABELS[log.cylinderType] || log.cylinderType}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{log.note}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-gray-400 block text-[10px]">{new Date(log.createdAt).toLocaleTimeString(locale)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      <div>
        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('dashboard.recentTransactions')}</h3>
        <DataTable columns={transactionColumns} data={stats?.recentTransactions ?? []} emptyMessage={t('messages.noRecentTransactions')}/>
      </div>
    </div>
  );
};

export default Dashboard;
