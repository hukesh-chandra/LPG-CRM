import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllCustomers, getTransactions, deleteCustomer, permanentlyDeleteCustomer } from '../services/api';
import { Customer, Transaction } from '../types';
import DataTable, { Column } from '../components/DataTable';
import Button from '../components/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { CustomerInfo } from '../components/CustomerInfo';

const AdminPage: React.FC = () => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState<'mobileNo' | 'name' | 'relationName' | 'consumerNo' | 'customerId'>('mobileNo');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [customersData, transactionsData] = await Promise.all([
                getAllCustomers(),
                getTransactions()
            ]);
            setCustomers(customersData);
            setTransactions(transactionsData);
        } catch (error) {
            console.error("Failed to fetch admin data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteToggle = async (customerId: string, isDeleted: boolean) => {
        const actionKey = isDeleted ? 'restore' : 'delete';
        const confirmMessage = isDeleted ? t('adminPage.confirmRestore') : t('adminPage.confirmDelete');
        
        if (window.confirm(confirmMessage)) {
            try {
                await deleteCustomer(customerId);
                fetchData(); // Refresh data
            } catch (error) {
                console.error(`Failed to ${actionKey} customer`, error);
                alert(t('adminPage.error', actionKey));
            }
        }
    };

    const handlePermanentDelete = async (customerId: string) => {
        if (window.confirm(t('adminPage.confirmPermanentDelete'))) {
            try {
                await permanentlyDeleteCustomer(customerId);
                fetchData(); // Refresh data
            } catch (error) {
                console.error(`Failed to permanently delete customer`, error);
                alert(t('adminPage.errorPermanentDelete'));
            }
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lowerSearch = searchTerm.trim().toLowerCase();
        return customers.filter(c => {
            switch (searchBy) {
                case 'mobileNo': return c.mobileNo && c.mobileNo.includes(searchTerm.trim());
                case 'name': return (c.name && c.name.toLowerCase().includes(lowerSearch)) || (c.relationName && c.relationName.toLowerCase().includes(lowerSearch));
                case 'relationName': return c.relationName && c.relationName.toLowerCase().includes(lowerSearch);
                case 'consumerNo': return c.consumerNo && c.consumerNo.toLowerCase().includes(lowerSearch);
                case 'customerId': return c.customerId && c.customerId.toLowerCase().includes(lowerSearch);
                default: return true;
            }
        });
    }, [customers, searchTerm, searchBy]);
    
    const customerColumns: Column<Customer>[] = [
        { header: t('adminPage.headers.name'), accessor: c => <CustomerInfo customer={c} /> },
        { header: t('adminPage.headers.agency'), accessor: c => c.agencyName ? t(`enums.agencies.${c.agencyName}`) : '' },
        { header: t('adminPage.headers.status'), accessor: c => (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                c.isDeleted ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            }`}>
                {c.isDeleted ? t('adminPage.status.deleted') : t('adminPage.status.active')}
            </span>
        )},
        { header: t('adminPage.headers.mobileNo'), accessor: 'mobileNo' },
        { header: t('adminPage.headers.balance'), accessor: c => `₹${c.balance.toLocaleString(locale, {minimumFractionDigits: 2})}` },
        { header: t('adminPage.headers.actions'), accessor: c => (
            <div className="flex gap-2">
                 <a href={`#/customers/${c.id}`}>
                    <Button size="sm" variant="secondary" disabled={c.isDeleted}>{t('adminPage.actions.edit')}</Button>
                </a>
                 <Button
                    size="sm"
                    variant={c.isDeleted ? 'secondary' : 'danger'}
                    onClick={() => handleDeleteToggle(c.id, !!c.isDeleted)}
                >
                    {c.isDeleted ? t('adminPage.actions.restore') : t('adminPage.actions.delete')}
                </Button>
                {c.isDeleted && (
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handlePermanentDelete(c.id)}
                    >
                        {t('adminPage.actions.permanentDelete')}
                    </Button>
                )}
            </div>
        )}
    ];

    const transactionColumns: Column<Transaction & { customerName?: string }>[] = [
        { header: t('adminPage.headers.customer'), accessor: item => customers.find(c => c.id === item.customerId)?.name || 'Unknown' },
        { header: t('adminPage.headers.date'), accessor: (item) => new Date(item.date).toLocaleDateString(locale) },
        { header: t('adminPage.headers.description'), accessor: 'description' },
        { header: t('adminPage.headers.companyGiven'), accessor: 'gasCompanyGiven' },
        { header: t('adminPage.headers.companyReceived'), accessor: 'gasCompanyReceived' },
        { header: t('adminPage.headers.actions'), accessor: item => (
            <a href={`#/customers/${item.customerId}`}>
                <Button size="sm" variant="secondary">{t('adminPage.actions.viewCustomer')}</Button>
            </a>
        )}
    ];

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingAdmin')}</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('adminPage.title')}</h2>
                <a href="#/add-customer">
                    <Button>{t('adminPage.addCustomer')}</Button>
                </a>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
                 <div className="space-y-8">
                    <div>
                        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('adminPage.customerManagement')}</h3>
                        <div className="flex gap-2 w-full mb-4">
                            <select 
                                value={searchBy}
                                onChange={(e) => setSearchBy(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="mobileNo">{t('addCustomerPage.form.mobileNo')}</option>
                                <option value="name">{t('addCustomerPage.form.name')}</option>
                                <option value="relationName">{t('addCustomerPage.form.relationName')}</option>
                                <option value="consumerNo">{t('addCustomerPage.form.consumerNo')}</option>
                                <option value="customerId">{t('addCustomerPage.form.customerId')}</option>
                            </select>
                            <input
                                type="text"
                                placeholder={t('adminPage.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <DataTable columns={customerColumns} data={filteredCustomers} />
                    </div>

                    <div>
                        <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('adminPage.allTransactions')}</h3>
                        <DataTable columns={transactionColumns} data={transactions} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;