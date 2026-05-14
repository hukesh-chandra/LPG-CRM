import React, { useState, useEffect, useMemo } from 'react';
import { getCustomers, updateCustomer } from '../services/api';
import { Customer } from '../types';
import DataTable, { Column } from '../components/DataTable';
import { useLanguage } from '../contexts/LanguageContext';

const BookingsPage: React.FC = () => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'unmarked' | 'marked' | 'all'>('unmarked');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Failed to load customers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleBooking = async (customer: Customer) => {
        const isUnbooked = !customer.lastBookingDate || (new Date().getTime() - new Date(customer.lastBookingDate).getTime()) / (1000 * 3600 * 24) >= 45;
        const newDate = isUnbooked ? new Date().toISOString() : null;
        try {
            await updateCustomer(customer.id, { lastBookingDate: newDate ?? undefined });
            fetchData();
        } catch (error) {
            console.error("Failed to update booking status", error);
            alert("Error updating booking status.");
        }
    };

    const filteredCustomers = useMemo(() => {
        const now = new Date().getTime();
        return customers.filter(c => {
            const isUnbooked = !c.lastBookingDate || (now - new Date(c.lastBookingDate).getTime()) / (1000 * 3600 * 24) >= 45;
            if (filter === 'unmarked') return isUnbooked;
            if (filter === 'marked') return !isUnbooked;
            return true;
        });
    }, [customers, filter]);

    const columns: Column<Customer>[] = [
        { header: t('bookingsPage.headers.name'), accessor: 'name' },
        { header: t('bookingsPage.headers.customerId'), accessor: 'customerId' },
        { 
            header: t('bookingsPage.headers.lastBookingDate'), 
            accessor: c => c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleDateString(locale) : 'N/A' 
        },
        { 
            header: t('bookingsPage.headers.nextBookingDate'), 
            accessor: c => {
                if (!c.lastBookingDate) return 'N/A';
                const next = new Date(c.lastBookingDate);
                next.setDate(next.getDate() + 45);
                return next.toLocaleDateString(locale);
            }
        },
        { 
            header: t('bookingsPage.headers.actions'), 
            accessor: c => {
                const isUnbooked = !c.lastBookingDate || (new Date().getTime() - new Date(c.lastBookingDate).getTime()) / (1000 * 3600 * 24) >= 45;
                return (
                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            checked={!isUnbooked} 
                            onChange={() => toggleBooking(c)} 
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" 
                        />
                        <span className="text-sm font-medium">{isUnbooked ? t('bookingsPage.mark') : t('bookingsPage.unmark')}</span>
                    </div>
                );
            }
        }
    ];

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingCustomers')}</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('bookingsPage.title')}</h2>
            
            <div className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                    <input 
                        type="radio" 
                        checked={filter === 'unmarked'} 
                        onChange={() => setFilter('unmarked')} 
                        className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{t('bookingsPage.unmarked')}</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                    <input 
                        type="radio" 
                        checked={filter === 'marked'} 
                        onChange={() => setFilter('marked')} 
                        className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{t('bookingsPage.marked')}</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                    <input 
                        type="radio" 
                        checked={filter === 'all'} 
                        onChange={() => setFilter('all')} 
                        className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>{t('bookingsPage.all')}</span>
                </label>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <DataTable data={filteredCustomers} columns={columns} />
            </div>
        </div>
    );
};

export default BookingsPage;
