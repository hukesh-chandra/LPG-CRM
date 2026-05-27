import React, { useState, useEffect, useMemo } from 'react';
import { getCustomers } from '../services/api';
import { Customer } from '../types';
import DataTable, { Column } from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { TEMPLATE_HEADERS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { CustomerInfo } from '../components/CustomerInfo';

const PRINTABLE_COLUMNS = [
    { key: 'name', header: 'Name' },
    { key: 'relation', header: 'Relation Name' },
    { key: 'mobileNo', header: 'Mobile No' },
    { key: 'village', header: 'Village' },
    { key: 'customerId', header: 'Customer ID' },
    { key: 'consumerNo', header: 'Consumer No' },
];

const PrintModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onPrint: (selectedColumns: string[]) => void;
    printableColumns: {key: string, header: string}[];
}> = ({ isOpen, onClose, onPrint, printableColumns }) => {
    const { t } = useLanguage();
    const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
        printableColumns
            .map(c => c.key)
            .filter(key => !['agencyName', 'lpgId'].includes(key))
    );

    const handleToggleColumn = (key: string) => {
        setSelectedColumns(prev =>
            prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('customerListPage.printModal.title')}>
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('customerListPage.printModal.description')}</p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                    {printableColumns.map(col => (
                        <label key={col.key} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={selectedColumns.includes(col.key)}
                                onChange={() => handleToggleColumn(col.key)}
                                className="form-checkbox rounded text-primary-600"
                            />
                            <span>{col.header}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>{t('buttons.cancel')}</Button>
                    <Button onClick={() => onPrint(selectedColumns)}>{t('customerListPage.printModal.printAction')}</Button>
                </div>
            </div>
        </Modal>
    );
};

const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    panchayat: '',
    village: '',
    connectionType: '',
    agencyName: '',
  });
  const uniquePanchayats = useMemo(() => Array.from(new Set(customers.map(c => c.panchayat === 'Other' ? c.otherPanchayat || 'Other' : c.panchayat).filter(Boolean))), [customers]);
  const uniqueVillages = useMemo(() => {
    let filtered = customers;
    if (filters.panchayat) {
        filtered = customers.filter(c => (c.panchayat === 'Other' ? c.otherPanchayat || 'Other' : c.panchayat) === filters.panchayat);
    }
    return Array.from(new Set(filtered.map(c => c.village === 'Other' ? c.otherVillage || 'Other' : c.village).filter(Boolean)));
  }, [customers, filters.panchayat]);
  const uniqueAgencies = useMemo(() => Array.from(new Set(customers.map(c => c.agencyName).filter(Boolean))), [customers]);
  const uniqueConnectionTypes = useMemo(() => Array.from(new Set(customers.map(c => c.connectionType).filter(Boolean))), [customers]);

  const { t } = useLanguage();

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const data = await getCustomers();
        setCustomers(data);
      } catch (error) {
        console.error("Failed to fetch customers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => {
        const newFilters = { ...prev, [name]: value };
        if (name === 'panchayat') {
            newFilters.village = ''; // Reset village filter when panchayat changes
        }
        return newFilters;
    });
  };
  
  const handleExport = () => {
    if (typeof (window as any).XLSX === 'undefined') {
        alert(t('addCustomerPage.import.alerts.unavailable'));
        return;
    }
    const XLSX = (window as any).XLSX;
    
    const dataToExport = filteredCustomers.map(customer => [
        customer.name, customer.customerId, customer.consumerNo, customer.lpgId,
        customer.relationType, customer.relationName, customer.mobileNo, 
        customer.village, customer.otherVillage || '',
        customer.panchayat, customer.otherPanchayat || '',
        customer.svNo, customer.aadhaarNo, customer.connectionType, customer.agencyName || '',
        customer.dueDate || '', customer.remark || '', customer.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending')
    ]);

    const worksheetData = [[...TEMPLATE_HEADERS], ...dataToExport];
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "Customer_Data.xlsx");
  };
  
  const handlePrint = (selectedColumns: string[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups for this website');
        return;
    }

    const headers = selectedColumns.map(key => PRINTABLE_COLUMNS.find(c => c.key === key)?.header || key);
    
    let tableHtml = `<table border="1" style="width:100%; border-collapse: collapse; font-family: sans-serif;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                ${headers.map(h => `<th style="padding: 8px; text-align: left;">${h}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${filteredCustomers.map(customer => `
                <tr>
                    ${selectedColumns.map(key => {
                        let value;
                        if (key === 'relation') {
                            value = `${t(`enums.relationType.${customer.relationType}` as any)} ${customer.relationName}`;
                        } else if (key === 'village') {
                            value = customer.village === 'Other' ? customer.otherVillage : t(`enums.villages.${customer.village}`);
                        } else if (key === 'panchayat') {
                            value = customer.panchayat === 'Other' ? customer.otherPanchayat : t(`enums.panchayats.${customer.panchayat}`);
                        } else if (key === 'connectionType') {
                            value = t(`enums.connectionType.${customer.connectionType}` as any);
                        } else if (key === 'agencyName') {
                            value = customer.agencyName ? t(`enums.agencies.${customer.agencyName}`) : '';
                        } else if (key === 'balance') {
                            value = customer.balance < 0 ? `₹${(-customer.balance).toFixed(2)}` : '₹0.00';
                        } else if (key === 'kyc') {
                            value = customer.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending');
                        }
                        else {
                            value = (customer as any)[key] || '';
                        }
                        return `<td style="padding: 8px;">${value}</td>`;
                    }).join('')}
                </tr>
            `).join('')}
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
                    <title>${t('customerListPage.printModal.printTitle')}</title>
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
                            <h1>${t('customerListPage.printModal.printTitle')}</h1>
                            <p>${t('customerListPage.printModal.totalCustomers', filteredCustomers.length)}</p>
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
    setIsPrintModalOpen(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c =>
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
         c.mobileNo.includes(searchTerm) ||
         c.village.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(c => filters.panchayat ? c.panchayat === filters.panchayat : true)
      .filter(c => filters.village ? c.village === filters.village : true)
      .filter(c => filters.connectionType ? c.connectionType === filters.connectionType : true)
      .filter(c => filters.agencyName ? c.agencyName === filters.agencyName : true);
  }, [customers, searchTerm, filters]);

  const columns: Column<Customer>[] = [
    { header: t('customerListPage.headers.name'), accessor: (c) => <CustomerInfo customer={c} /> },
    { header: t('customerListPage.headers.agency'), accessor: (c) => c.agencyName ? t(`enums.agencies.${c.agencyName}`) : '' },
    { header: t('customerListPage.headers.connectionType'), accessor: (c) => t(`enums.connectionType.${c.connectionType}` as any) },
    { header: t('addCustomerPage.form.kyc'), accessor: (c) => c.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending') },
    {
      header: t('customerListPage.headers.actions'),
      accessor: (customer) => (
        <a href={`#/customers/${customer.id}`}>
          <Button size="sm">{t('customerListPage.viewAction')}</Button>
        </a>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center p-8">{t('messages.loadingCustomers')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('customerListPage.title')}</h2>
        <div className="flex items-center gap-2">
            <Button onClick={() => setIsPrintModalOpen(true)} variant="secondary">{t('customerListPage.print')}</Button>
            <Button onClick={handleExport} variant="secondary">{t('customerListPage.export')}</Button>
        </div>
      </div>
      
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow space-y-4">
        <input
            type="text"
            placeholder={t('customerListPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <select name="panchayat" value={filters.panchayat} onChange={handleFilterChange} className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">{t('customerListPage.all')}</option>
                {uniquePanchayats.map(p => <option key={p} value={p}>{p === 'Other' ? t('enums.other') : (t(`enums.panchayats.${p}`) || p)}</option>)}
            </select>
            <select name="village" value={filters.village} onChange={handleFilterChange} className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">{t('customerListPage.allVillages')}</option>
                {uniqueVillages.map(v => <option key={v} value={v}>{t(`enums.villages.${v}`) || v}</option>)}
            </select>
             <select name="agencyName" value={filters.agencyName} onChange={handleFilterChange} className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">{t('customerListPage.allAgencies')}</option>
                {uniqueAgencies.map(a => <option key={a} value={a}>{t(`enums.agencies.${a}`) || a}</option>)}
            </select>
            <select name="connectionType" value={filters.connectionType} onChange={handleFilterChange} className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">{t('customerListPage.allConnectionTypes')}</option>
                {uniqueConnectionTypes.map(ct => <option key={ct} value={ct}>{t(`enums.connectionType.${ct}` as any) || ct}</option>)}
            </select>
        </div>
      </div>

      <DataTable columns={columns} data={filteredCustomers} emptyMessage={t('customerListPage.emptyMessage')} />
      <PrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} onPrint={handlePrint} printableColumns={PRINTABLE_COLUMNS} />
    </div>
  );
};

export default CustomerListPage;