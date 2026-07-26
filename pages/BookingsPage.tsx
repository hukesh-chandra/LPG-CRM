import React, { useState, useEffect, useMemo } from 'react';
import { getCustomers, updateCustomer, isCustomerUnbooked, getEligibleBookingDate, getBookingCycleDays } from '../services/api';
import { Customer } from '../types';
import DataTable, { Column } from '../components/DataTable';
import { useLanguage } from '../contexts/LanguageContext';
import { CustomerInfo } from '../components/CustomerInfo';
import Button from '../components/Button';
import Modal from '../components/Modal';

const MarkBookingModal: React.FC<{
    customer: Customer | null;
    actionType: 'mark' | 'unmark';
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ customer, actionType, isOpen, onClose, onSuccess }) => {
    const { t } = useLanguage();
    const [bookingDate, setBookingDate] = useState('');
    const [confirmInput, setConfirmInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConfirmInput('');
            const todayStr = new Date().toISOString().split('T')[0];
            setBookingDate(todayStr);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen || !customer) return null;

    const isMark = actionType === 'mark';
    const isConfirmValid = confirmInput.trim().toLowerCase() === 'confirm';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConfirmValid) return;

        setIsSubmitting(true);
        try {
            if (isMark) {
                const isoDate = bookingDate ? new Date(bookingDate).toISOString() : new Date().toISOString();
                await updateCustomer(customer.id, { lastBookingDate: isoDate });
                
                const { addDelivery } = await import('../services/api');
                try {
                    await addDelivery(customer.id);
                } catch (e) {
                    console.error("Failed to add delivery", e);
                }
            } else {
                await updateCustomer(customer.id, { lastBookingDate: null });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update booking", error);
            alert("Error updating booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isMark ? (t('bookingsPage.modal.titleMark') || 'Confirm Booking') : (t('bookingsPage.modal.titleUnmark') || 'Confirm Unmarking')}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{customer.name}</p>
                    <p className="text-gray-600 dark:text-gray-400">Consumer No: <span className="font-mono font-medium">{customer.consumerNo || 'N/A'}</span></p>
                    <p className="text-gray-600 dark:text-gray-400">Mobile: <span className="font-medium">{customer.mobileNo || 'N/A'}</span> | Agency: <span className="font-medium">{customer.agencyName}</span></p>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isMark 
                        ? (t('bookingsPage.modal.descriptionMark') || 'Are you sure you want to mark this customer as booked? This will also add them to pending deliveries.')
                        : (t('bookingsPage.modal.descriptionUnmark') || 'Are you sure you want to unmark this booking?')}
                </p>

                {isMark && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('bookingsPage.modal.bookingDateLabel') || 'Booking Date (Optional)'}
                        </label>
                        <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('bookingsPage.modal.confirmNotice') || 'Type "confirm" below to enable confirmation:'}
                    </label>
                    <input
                        type="text"
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        placeholder={t('bookingsPage.modal.confirmPlaceholder') || 'Type confirm here'}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none text-sm transition-colors ${
                            confirmInput.trim() !== '' 
                                ? (isConfirmValid ? 'border-green-500 focus:ring-2 focus:ring-green-500 bg-green-50/30 dark:bg-green-950/20' : 'border-red-400 focus:ring-2 focus:ring-red-400 bg-red-50/20 dark:bg-red-950/20')
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        } text-gray-900 dark:text-white`}
                    />
                    {!isConfirmValid && confirmInput.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">{t('bookingsPage.modal.typeConfirmHelp') || 'You must type "confirm" to proceed.'}</p>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        {t('buttons.cancel') || 'Cancel'}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!isConfirmValid || isSubmitting}
                        variant={isMark ? "primary" : "secondary"}
                        className={!isConfirmValid ? "opacity-50 cursor-not-allowed" : ""}
                    >
                        {isSubmitting 
                            ? "Processing..." 
                            : isMark 
                                ? (t('bookingsPage.modal.submitMark') || 'Confirm & Mark as Booked') 
                                : (t('bookingsPage.modal.submitUnmark') || 'Confirm & Unmark')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

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

    // Modal state for marking/unmarking booking
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        customer: Customer | null;
        actionType: 'mark' | 'unmark';
    }>({
        isOpen: false,
        customer: null,
        actionType: 'mark'
    });

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
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
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

    const openMarkModal = React.useCallback((customer: Customer, actionType: 'mark' | 'unmark') => {
        setModalState({
            isOpen: true,
            customer,
            actionType
        });
    }, []);

    const closeMarkModal = React.useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false }));
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
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {formatDate(c.lastBookingDate)}
                </span>
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
                        {isUnbooked ? (
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={() => openMarkModal(c, 'mark')}
                            >
                                {t('bookingsPage.mark') || 'Mark as Booked'}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openMarkModal(c, 'unmark')}
                            >
                                {t('bookingsPage.unmark') || 'Unmark Booking'}
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ], [t, locale, openMarkModal]);

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

            <MarkBookingModal
                isOpen={modalState.isOpen}
                customer={modalState.customer}
                actionType={modalState.actionType}
                onClose={closeMarkModal}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default BookingsPage;
