import React, { useState, useEffect, useMemo } from 'react';
import { getCustomers, updateCustomer, isCustomerUnbooked, getEligibleBookingDate } from '../services/api';
import { Customer } from '../types';
import DataTable, { Column } from '../components/DataTable';
import { useLanguage } from '../contexts/LanguageContext';
import { CustomerInfo } from '../components/CustomerInfo';
import Button from '../components/Button';

const BookingDateInput = React.memo(({ customer, defaultValue, onUpdate }: { customer: Customer, defaultValue: string, onUpdate: (c: Customer, val: string) => void }) => {
    const [val, setVal] = useState(defaultValue);
    useEffect(() => setVal(defaultValue), [defaultValue]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVal(e.target.value);
    };

    const handleBlur = () => {
        if (val !== defaultValue) {
            onUpdate(customer, val);
        }
    };

    return (
        <input 
            type="date"
            value={val}
            onChange={handleChange}
            onBlur={handleBlur}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 max-w-[140px]"
        />
    );
});

const BookingsPage: React.FC = () => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'unmarked' | 'marked' | 'all'>('unmarked');
    const [villageFilter, setVillageFilter] = useState<string>('all');
    const [panchayatFilter, setPanchayatFilter] = useState<string>('all');
    const [agencyFilter, setAgencyFilter] = useState<string>('all');
    const [kycFilter, setKycFilter] = useState<'all' | 'completed' | 'pending'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchBy, setSearchBy] = useState<'mobileNo' | 'name' | 'consumerNo' | 'customerId'>('mobileNo');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const uniquePanchayats = useMemo(() => Array.from(new Set(customers.map(c => c.panchayat === 'Other' ? c.otherPanchayat || 'Other' : c.panchayat).filter(Boolean))), [customers]);
    const uniqueVillages = useMemo(() => {
        let filtered = customers;
        if (panchayatFilter !== 'all') {
            filtered = customers.filter(c => (c.panchayat === 'Other' ? c.otherPanchayat || 'Other' : c.panchayat) === panchayatFilter);
        }
        return Array.from(new Set(filtered.map(c => c.village === 'Other' ? c.otherVillage || 'Other' : c.village).filter(Boolean)));
    }, [customers, panchayatFilter]);
    const uniqueAgencies = useMemo(() => Array.from(new Set(customers.map(c => c.agencyName).filter(Boolean))), [customers]);
    
    const handlePanchayatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPanchayatFilter(e.target.value);
        setVillageFilter('all');
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(2);
        return `${dd}/${mm}/${yy}`;
    };

    const handleExport = () => {
        if (typeof (window as any).XLSX === 'undefined') {
            alert("Export unavailable");
            return;
        }
        const XLSX = (window as any).XLSX;
        
        const dataToExport = filteredCustomers.map(customer => {
            const relation = `${customer.relationType || ''} ${customer.relationName || ''}`.trim();
            const villageName = customer.village === 'Other' ? customer.otherVillage : t(`enums.villages.${customer.village}`);
            
            let nextBookingDate = 'N/A';
            if (customer.lastBookingDate) {
                const next = new Date(customer.lastBookingDate);
                next.setDate(next.getDate() + getBookingCycleDays(customer.agencyName));
                nextBookingDate = formatDate(next.toISOString());
            }

            return [
                customer.name, 
                relation,
                customer.mobileNo, 
                villageName,
                customer.customerId, 
                customer.consumerNo,
                customer.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending'),
                customer.remark || '',
                formatDate(customer.lastBookingDate),
                nextBookingDate
            ];
        });

        const headers = ['Name', 'Relation Name', 'Mobile No', 'Village', 'Customer ID', 'Consumer No', 'KYC', 'Remark', 'Last Booking Date', 'Next Booking Date'];
        const worksheetData = [headers, ...dataToExport];
        
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bookings");
        XLSX.writeFile(wb, "Bookings_Data.xlsx");
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this website');
            return;
        }
        
        let tableHtml = `<table border="1" style="width:100%; border-collapse: collapse; font-family: sans-serif;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 8px; text-align: left;">Name</th>
                    <th style="padding: 8px; text-align: left;">Relation Name</th>
                    <th style="padding: 8px; text-align: left;">Mobile No</th>
                    <th style="padding: 8px; text-align: left;">Village</th>
                    <th style="padding: 8px; text-align: left;">Customer ID</th>
                    <th style="padding: 8px; text-align: left;">Consumer No</th>
                    <th style="padding: 8px; text-align: left;">KYC</th>
                    <th style="padding: 8px; text-align: left;">Remark</th>
                    <th style="padding: 8px; text-align: left;">Last Booking Date</th>
                    <th style="padding: 8px; text-align: left;">Next Booking Date</th>
                </tr>
            </thead>
            <tbody>
                ${filteredCustomers.map(c => {
                    const relation = `${c.relationType || ''} ${c.relationName || ''}`.trim();
                    const villageName = c.village === 'Other' ? c.otherVillage : t(`enums.villages.${c.village}`);
                    const kycStatus = c.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending');
                    let nextBookingDate = 'N/A';
                    if (c.lastBookingDate) {
                        const next = new Date(c.lastBookingDate);
                        next.setDate(next.getDate() + getBookingCycleDays(c.agencyName));
                        nextBookingDate = formatDate(next.toISOString());
                    }
                    return `
                    <tr>
                        <td style="padding: 8px;">${c.name}</td>
                        <td style="padding: 8px;">${relation}</td>
                        <td style="padding: 8px;">${c.mobileNo}</td>
                        <td style="padding: 8px;">${villageName}</td>
                        <td style="padding: 8px;">${c.customerId}</td>
                        <td style="padding: 8px;">${c.consumerNo || ''}</td>
                        <td style="padding: 8px;">${kycStatus}</td>
                        <td style="padding: 8px;">${c.remark || ''}</td>
                        <td style="padding: 8px;">${formatDate(c.lastBookingDate)}</td>
                        <td style="padding: 8px;">${nextBookingDate}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>`;
        
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(2);
        const printDate = `${dd}/${mm}/${yy}`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Bookings</title>
                    <style>
                        @media print {
                            body { font-family: sans-serif; }
                            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                            .header h1 { margin: 0; }
                            .header p { margin: 5px 0 0 0; }
                            .date-text { font-weight: bold; }
                        }
                        body { font-family: sans-serif; }
                        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                        .header h1 { margin: 0; }
                        .header p { margin: 5px 0 0 0; }
                        .date-text { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Bookings</h1>
                            <p>Total: ${filteredCustomers.length}</p>
                        </div>
                        <div class="date-text">
                            Date: ${printDate}
                        </div>
                    </div>
                    ${tableHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

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

    const toggleBooking = React.useCallback(async (customer: Customer) => {
        const isUnbooked = isCustomerUnbooked(customer.lastBookingDate, customer.agencyName);
        
        if (isUnbooked) {
            if (!window.confirm(t('bookingsPage.markConfirmation') || "Are you sure you want to mark this booking and add it to pending deliveries?")) {
                return;
            }
        }
        
        const newDate = isUnbooked ? new Date().toISOString() : null;
        try {
            await updateCustomer(customer.id, { lastBookingDate: newDate });
            if (isUnbooked) {
                const { addDelivery } = await import('../services/api');
                try {
                    await addDelivery(customer.id);
                } catch(e) {
                    console.error("Failed to add delivery", e);
                }
            }
            fetchData();
        } catch (error) {
            console.error("Failed to update booking status", error);
            alert("Error updating booking status.");
        }
    }, [t]);

    const updateBookingDate = React.useCallback(async (customer: Customer, dateString: string) => {
        try {
            const newDate = dateString ? new Date(dateString).toISOString() : null;
            await updateCustomer(customer.id, { lastBookingDate: newDate });
            fetchData();
        } catch (error) {
            console.error("Failed to update booking date", error);
            alert("Error updating booking date.");
        }
    }, []);

    const filteredCustomers = useMemo(() => {
        const searchLower = searchTerm.trim().toLowerCase();
        
        return customers.filter(c => {
            if (searchTerm.trim()) {
                let matchesSearch = false;
                switch (searchBy) {
                    case 'mobileNo': matchesSearch = !!(c.mobileNo && c.mobileNo.includes(searchTerm.trim())); break;
                    case 'name': matchesSearch = !!(c.name && c.name.toLowerCase().includes(searchLower)); break;
                    case 'consumerNo': matchesSearch = !!(c.consumerNo && c.consumerNo.toLowerCase().includes(searchLower)); break;
                    case 'customerId': matchesSearch = !!(c.customerId && c.customerId.toLowerCase().includes(searchLower)); break;
                }
                if (!matchesSearch) return false;
            }

            const isUnbooked = isCustomerUnbooked(c.lastBookingDate, c.agencyName);
            
            if (filter === 'unmarked' && !isUnbooked) return false;
            if (filter === 'marked' && isUnbooked) return false;

            const cVillage = c.village === 'Other' ? c.otherVillage : c.village;
            if (villageFilter !== 'all' && cVillage !== villageFilter) return false;

            const cPanchayat = c.panchayat === 'Other' ? c.otherPanchayat : c.panchayat;
            if (panchayatFilter !== 'all' && cPanchayat !== panchayatFilter) return false;

            if (agencyFilter !== 'all' && c.agencyName !== agencyFilter) return false;
            if (kycFilter !== 'all') {
                if (kycFilter === 'completed' && !c.kyc) return false;
                if (kycFilter === 'pending' && c.kyc) return false;
            }

            if (startDate || endDate) {
                if (!c.lastBookingDate) return false;
                const bookingDay = c.lastBookingDate.slice(0, 10);
                if (startDate && bookingDay < startDate) return false;
                if (endDate && bookingDay > endDate) return false;
            }

            return true;
        });
    }, [customers, filter, villageFilter, panchayatFilter, agencyFilter, kycFilter, searchTerm, startDate, endDate]);

    const columns: Column<Customer>[] = useMemo(() => [
        { header: t('bookingsPage.headers.name'), accessor: c => <CustomerInfo customer={c} /> },
        { header: t('addCustomerPage.form.kyc'), accessor: (c) => c.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending') },
        { 
            header: t('bookingsPage.headers.lastBookingDate'), 
            accessor: c => (
                <BookingDateInput 
                    customer={c} 
                    defaultValue={c.lastBookingDate ? c.lastBookingDate.split('T')[0] : ''} 
                    onUpdate={updateBookingDate} 
                />
            )
        },
        { 
            header: t('bookingsPage.headers.nextBookingDate'), 
            accessor: c => {
                if (!c.lastBookingDate) return 'N/A';
                const next = getEligibleBookingDate(c.lastBookingDate, c.agencyName);
                return next.toLocaleDateString(locale);
            }
        },
        { 
            header: t('bookingsPage.headers.actions'), 
            accessor: c => {
                const isUnbooked = isCustomerUnbooked(c.lastBookingDate, c.agencyName);
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
    ], [t, locale]);

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingCustomers')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('bookingsPage.title')}</h2>
                <div className="flex items-center gap-2">
                    <Button onClick={handlePrint} variant="secondary">{t('customerListPage.print') || 'Print'}</Button>
                    <Button onClick={handleExport} variant="secondary">{t('customerListPage.export') || 'Export'}</Button>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
                {/* Row 1: Search and Dropdown Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select 
                            value={searchBy}
                            onChange={(e) => setSearchBy(e.target.value as any)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="mobileNo">{t('addCustomerPage.form.mobileNo')}</option>
                            <option value="name">{t('addCustomerPage.form.name')}</option>
                            <option value="consumerNo">{t('addCustomerPage.form.consumerNo')}</option>
                            <option value="customerId">{t('addCustomerPage.form.customerId')}</option>
                        </select>
                        <input
                            type="text"
                            placeholder={t('deliveryPage.searchPlaceholder') || "Search..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
                        />
                    </div>

                    <div className="flex items-center space-x-4">
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
                </div>

                {/* Row 2: Select Filters */}
                <div className="flex flex-wrap gap-3">
                    <select
                        value={villageFilter}
                        onChange={(e) => setVillageFilter(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                        <option value="all">{t('bookingsPage.filters.allVillages') || 'All Villages'}</option>
                        {uniqueVillages.map(v => (
                            <option key={v} value={v}>{t(`enums.villages.${v}`) || v}</option>
                        ))}
                    </select>

                    <select
                        value={panchayatFilter}
                        onChange={handlePanchayatChange}
                        className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                        <option value="all">{t('bookingsPage.filters.allPanchayats') || 'All Panchayats'}</option>
                        {uniquePanchayats.map(p => (
                            <option key={p} value={p}>{p === 'Other' ? t('enums.other') : (t(`enums.panchayats.${p}`) || p)}</option>
                        ))}
                    </select>

                    <select
                        value={agencyFilter}
                        onChange={(e) => setAgencyFilter(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                        <option value="all">{t('bookingsPage.filters.allAgencies') || 'All Agencies'}</option>
                        {uniqueAgencies.map(a => (
                            <option key={a} value={a}>{t(`enums.agencies.${a}`) || a}</option>
                        ))}
                    </select>
                    
                    <select
                        value={kycFilter}
                        onChange={(e) => setKycFilter(e.target.value as any)}
                        className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                        <option value="all">{t('addCustomerPage.form.kyc')} ({t('customerListPage.all')})</option>
                        <option value="completed">{t('customerListPage.kycCompleted')}</option>
                        <option value="pending">{t('customerListPage.kycPending')}</option>
                    </select>
                </div>

                {/* Row 3: Custom Date Filter Panel */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('bookingsPage.lastBookingDateFilter') || 'Last Booking Date'}:</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-gray-400 text-sm">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                            type="button"
                            size="sm"
                            variant={!startDate && !endDate ? 'primary' : 'secondary'}
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                        >
                            {t('gasTransactionsPage.allTime')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0] ? 'primary' : 'secondary'}
                            onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                setStartDate(today);
                                setEndDate(today);
                            }}
                        >
                            {t('gasTransactionsPage.today')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={startDate === new Date().toISOString().slice(0, 7) + '-01' && endDate === new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] ? 'primary' : 'secondary'}
                            onClick={() => {
                                const now = new Date();
                                const year = now.getFullYear();
                                const month = String(now.getMonth() + 1).padStart(2, '0');
                                setStartDate(`${year}-${month}-01`);
                                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                                setEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
                            }}
                        >
                            {t('gasTransactionsPage.thisMonth')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <DataTable data={filteredCustomers} columns={columns} />
            </div>
        </div>
    );
};

export default BookingsPage;
