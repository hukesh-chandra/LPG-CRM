import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getCustomers, getTransactions, addTransaction } from '../services/api';
import { Customer, Transaction } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import DataTable, { Column } from '../components/DataTable';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { GAS_COMPANIES } from '../constants';

const GasTransactionsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerType, setCustomerType] = useState<'registered' | 'manual'>('registered');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'consumerNo' | 'name' | 'mobileNo' | 'customerId'>('consumerNo');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [walkInName, setWalkInName] = useState('');
  const [walkInMobile, setWalkInMobile] = useState('');
  const [walkInConsumerNo, setWalkInConsumerNo] = useState('');
  
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [description, setDescription] = useState('14.2kg Refill');
  const [gasCompanyGiven, setGasCompanyGiven] = useState('HP');
  const [gasCompanyReceived, setGasCompanyReceived] = useState('HP');

  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table Filters State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tableSearch, setTableSearch] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedCustomers, fetchedTransactions] = await Promise.all([
        getCustomers(),
        getTransactions()
      ]);
      setCustomers(fetchedCustomers);
      setTransactions(fetchedTransactions);
    } catch (err) {
      console.error('Error loading transactions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers for suggestions dropdown
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase().trim();
    return customers.filter(customer => {
      if (searchBy === 'consumerNo') {
        return customer.consumerNo?.toLowerCase().includes(lowerQuery);
      } else if (searchBy === 'name') {
        return customer.name?.toLowerCase().includes(lowerQuery);
      } else if (searchBy === 'mobileNo') {
        return customer.mobileNo?.toLowerCase().includes(lowerQuery);
      } else if (searchBy === 'customerId') {
        return customer.customerId?.toLowerCase().includes(lowerQuery);
      }
      return false;
    });
  }, [customers, searchQuery, searchBy]);

  // Handle Quick Switch to Manual Entry if customer not found
  const handleSwitchToManual = () => {
    setCustomerType('manual');
    setWalkInName(searchQuery);
    setSearchQuery('');
    setShowDropdown(false);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');

    if (customerType === 'registered' && !selectedCustomer) {
      setFormError(language === 'hi' ? 'कृपया एक पंजीकृत ग्राहक चुनें' : 'Please select a registered customer');
      return;
    }

    if (customerType === 'manual' && !walkInName.trim()) {
      setFormError(language === 'hi' ? 'ग्राहक का नाम आवश्यक है' : 'Customer Name is required');
      return;
    }

    const priceNum = parseFloat(price);
    const amountPaidNum = parseFloat(amountPaid);

    if (isNaN(priceNum) || priceNum < 0) {
      setFormError(language === 'hi' ? 'कृपया मान्य कीमत दर्ज करें' : 'Please enter a valid price');
      return;
    }

    if (isNaN(amountPaidNum) || amountPaidNum < 0) {
      setFormError(language === 'hi' ? 'कृपया मान्य भुगतान राशि दर्ज करें' : 'Please enter a valid amount paid');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format transaction date to include time details so order is correct
      let finalDateStr = new Date().toISOString();
      if (transactionDate) {
        const currentDate = new Date();
        const [year, month, day] = transactionDate.split('-').map(Number);
        const selectedDateTime = new Date(year, month - 1, day, currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
        finalDateStr = selectedDateTime.toISOString();
      }

      const transactionPayload = {
        price: priceNum,
        amountPaid: amountPaidNum,
        description,
        gasCompanyGiven,
        gasCompanyReceived,
        source: 'manual' as const,
        date: finalDateStr,
        ...(customerType === 'manual' ? {
          walkInName: walkInName.trim(),
          walkInMobile: walkInMobile.trim() || undefined,
          walkInConsumerNo: walkInConsumerNo.trim() || undefined
        } : {})
      };

      const customerId = customerType === 'registered' && selectedCustomer ? selectedCustomer.id : undefined;

      await addTransaction(customerId, transactionPayload);
      
      setSuccessMessage(t('gasTransactionsPage.successMsg'));
      
      // Reset Form
      setPrice('');
      setAmountPaid('');
      setDescription('14.2kg Refill');
      setSelectedCustomer(null);
      setWalkInName('');
      setWalkInMobile('');
      setWalkInConsumerNo('');
      setSearchQuery('');
      setTransactionDate(new Date().toISOString().split('T')[0]);

      // Refetch
      await loadData();
    } catch (err: any) {
      console.error(err);
      setFormError(t('gasTransactionsPage.errorMsg'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enriched & Filtered Transactions for Table
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  const displayedTransactions = useMemo(() => {
    let list = transactions.map(tx => {
      const customer = tx.customerId ? customerMap.get(tx.customerId) : null;
      return {
        ...tx,
        customerName: customer ? customer.name : (tx.walkInName || t('gasTransactionsPage.manualLabel')),
        consumerNo: customer ? customer.consumerNo : (tx.walkInConsumerNo || '-'),
        mobileNo: customer ? customer.mobileNo : (tx.walkInMobile || '-'),
        isRegistered: !!customer,
        amountDue: tx.price - tx.amountPaid
      };
    });

    // Filter by Date Range
    if (startDate) {
      list = list.filter(tx => tx.date.slice(0, 10) >= startDate);
    }
    if (endDate) {
      list = list.filter(tx => tx.date.slice(0, 10) <= endDate);
    }

    // Filter by search query
    if (tableSearch.trim()) {
      const query = tableSearch.toLowerCase().trim();
      list = list.filter(tx => 
        tx.customerName?.toLowerCase().includes(query) ||
        tx.consumerNo?.toLowerCase().includes(query) ||
        tx.mobileNo?.toLowerCase().includes(query) ||
        tx.description?.toLowerCase().includes(query)
      );
    }

    return list;
  }, [transactions, customerMap, startDate, endDate, tableSearch, t]);

  // Table Columns
  const columns: Column<any>[] = [
    {
      header: t('dashboard.table.date'),
      accessor: (item) => {
        try {
          return new Date(item.date).toLocaleDateString(language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        } catch {
          return item.date;
        }
      }
    },
    {
      header: t('dashboard.table.customer'),
      accessor: (item) => (
        <div>
          {item.isRegistered ? (
            <a 
              href={`#customers/${item.customerId}`} 
              className="text-primary-600 dark:text-primary-400 hover:underline font-semibold"
            >
              {item.customerName}
            </a>
          ) : (
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {item.customerName}
            </span>
          )}
          {!item.isRegistered && (
            <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
              {language === 'hi' ? 'गैर-पंजीकृत' : 'Manual'}
            </span>
          )}
        </div>
      )
    },
    {
      header: t('addCustomerPage.form.consumerNo'),
      accessor: 'consumerNo'
    },
    {
      header: t('addCustomerPage.form.mobileNo'),
      accessor: 'mobileNo'
    },
    {
      header: t('dashboard.table.price'),
      accessor: (item) => `₹${item.price.toLocaleString(locale)}`
    },
    {
      header: t('dashboard.table.amountPaid'),
      accessor: (item) => `₹${item.amountPaid.toLocaleString(locale)}`
    },
    {
      header: t('dashboard.table.amountDue'),
      accessor: (item) => {
        const due = item.price - item.amountPaid;
        return (
          <span className={due > 0 ? 'text-red-600 font-semibold' : due < 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            ₹{due.toLocaleString(locale)}
          </span>
        );
      }
    },
    {
      header: `${t('gasTransactionsPage.gasCompanyGiven')} / ${t('gasTransactionsPage.gasCompanyReceived')}`,
      accessor: (item) => `${item.gasCompanyGiven || '-'} / ${item.gasCompanyReceived || '-'}`
    },
    {
      header: t('dashboard.table.description'),
      accessor: 'description'
    }
  ];

  return (
    <div className="space-y-8" id="gas-transactions-page">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('gasTransactionsPage.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {language === 'hi' ? 'गैस लेनदेन को दिनांक-वार प्रबंधित और रिकॉर्ड करें' : 'Manage and record gas transactions date-wise'}
          </p>
        </div>
      </div>

      {/* Form Container (Full Width Stacked) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          {t('gasTransactionsPage.addEntry')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Fields Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Customer Type Selector */}
            <div className="flex flex-col justify-end">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('gasTransactionsPage.customerType')}
              </label>
              <div className="grid grid-cols-2 gap-2 h-10">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType('registered');
                    setSelectedCustomer(null);
                  }}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg border transition-colors ${
                    customerType === 'registered'
                      ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('gasTransactionsPage.registeredCustomer')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerType('manual');
                    setSelectedCustomer(null);
                  }}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg border transition-colors ${
                    customerType === 'manual'
                      ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('gasTransactionsPage.manualEntry')}
                </button>
              </div>
            </div>

            {/* Customer Lookup or Entry */}
            {customerType === 'registered' ? (
              <div className="md:col-span-2 relative flex flex-col justify-end" ref={dropdownRef}>
                {!selectedCustomer ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gasTransactionsPage.searchCustomer')}
                    </label>
                    <div className="flex gap-2 h-10">
                      <select
                        value={searchBy}
                        onChange={(e) => setSearchBy(e.target.value as any)}
                        className="py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="consumerNo">{t('addCustomerPage.form.consumerNo')}</option>
                        <option value="name">{t('addCustomerPage.form.name')}</option>
                        <option value="mobileNo">{t('addCustomerPage.form.mobileNo')}</option>
                        <option value="customerId">{t('addCustomerPage.form.customerId')}</option>
                      </select>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder={t('gasTransactionsPage.searchCustomer')}
                        className="flex-1 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && searchQuery.trim() !== '' && (
                      <div className="absolute left-0 right-0 z-10 top-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg divide-y divide-gray-100 dark:divide-gray-600">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowDropdown(false);
                                setSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 transition-colors"
                            >
                              <div className="font-semibold text-sm">{customer.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Mob: {customer.mobileNo} &bull; {customer.village === 'Other' ? customer.otherVillage : t(`enums.villages.${customer.village}`)} &bull; {t('addCustomerPage.form.consumerNo')}: {customer.consumerNo}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                            <p className="mb-2">
                              {language === 'hi' ? 'कोई ग्राहक नहीं मिला' : 'No customers found'}
                            </p>
                            <Button 
                              type="button" 
                              variant="secondary" 
                              size="sm"
                              onClick={handleSwitchToManual}
                            >
                              {language === 'hi' ? 'मैनुअल प्रविष्टि के रूप में जोड़ें' : 'Add as Manual Entry'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Selected Customer Card */
                  <>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gasTransactionsPage.selectCustomer')}
                    </label>
                    <div className="p-2 h-10 flex items-center justify-between bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900 rounded-lg relative">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-primary-900 dark:text-primary-300">
                          {selectedCustomer.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({t('addCustomerPage.form.consumerNo')}: {selectedCustomer.consumerNo} | {language === 'hi' ? 'बकाया' : 'Due'}: <span className={selectedCustomer.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>₹{selectedCustomer.balance.toLocaleString(locale)}</span>)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold leading-none px-1"
                      >
                        &times;
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Manual Input Fields side by side */
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label={t('gasTransactionsPage.name')}
                  name="walkInName"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder={language === 'hi' ? 'जैसे: राहुल कुमार' : 'e.g. Rahul Kumar'}
                  required
                />
                <Input
                  label={t('addCustomerPage.form.consumerNo') + ` (${language === 'hi' ? 'वैकल्पिक' : 'Optional'})`}
                  name="walkInConsumerNo"
                  value={walkInConsumerNo}
                  onChange={(e) => setWalkInConsumerNo(e.target.value)}
                  placeholder="Consumer No (optional)"
                />
                <div className="relative">
                  <Input
                    label={t('gasTransactionsPage.mobileNo')}
                    name="walkInMobile"
                    value={walkInMobile}
                    onChange={(e) => setWalkInMobile(e.target.value)}
                    placeholder="10-digit mobile number (optional)"
                    maxLength={10}
                  />
                  <p className="absolute text-[10px] text-yellow-600 dark:text-yellow-400 font-medium mt-0.5 right-0">
                    {language === 'hi' ? '* ग्राहक सूची में नहीं जुड़ेगा' : '* Won\'t add to main list'}
                  </p>
                </div>
              </div>
            )}

            {/* Date field */}
            <Input
              label={t('gasTransactionsPage.date')}
              name="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />

            {/* Price field */}
            <Input
              label={t('gasTransactionsPage.price')}
              name="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="₹"
              min="0"
              required
            />

            {/* Amount Paid field */}
            <Input
              label={t('gasTransactionsPage.amountPaid')}
              name="amountPaid"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="₹"
              min="0"
              required
            />

            {/* Gas Company Given selector */}
            <Select
              label={t('gasTransactionsPage.gasCompanyGiven')}
              name="gasCompanyGiven"
              value={gasCompanyGiven}
              onChange={(e) => setGasCompanyGiven(e.target.value)}
              required
            >
              {GAS_COMPANIES.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </Select>

            {/* Gas Company Received selector */}
            <Select
              label={t('gasTransactionsPage.gasCompanyReceived')}
              name="gasCompanyReceived"
              value={gasCompanyReceived}
              onChange={(e) => setGasCompanyReceived(e.target.value)}
              required
            >
              {GAS_COMPANIES.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </Select>

            {/* Description field */}
            <Input
              label={t('gasTransactionsPage.description')}
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 14.2kg Refill, Double Bottle, etc."
              required
            />
          </div>

          {/* Form Actions (Submit & Alerts in one container) */}
          <div className="flex flex-col gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
            {formError && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-md font-medium">
                {formError}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-md font-medium">
                {successMessage}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                className="w-full md:w-64"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (language === 'hi' ? 'दर्ज किया जा रहा है...' : 'Recording...')
                  : t('gasTransactionsPage.addEntry')}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Transactions Table Container (Full Width Stacked) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('gasTransactionsPage.datewiseTransactions')}
          </h2>

          {/* Custom Date Range Filter */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('gasTransactionsPage.filterLabel') || 'Date Range'}:</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
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

        {/* Search Table */}
        <div className="mb-6">
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder={t('customerListPage.searchPlaceholder')}
            className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-primary-500 focus:border-primary-500 shadow-sm"
          />
        </div>

        {/* Data List */}
        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            {language === 'hi' ? 'लेनदेन लोड हो रहे हैं...' : 'Loading transactions...'}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={displayedTransactions}
            emptyMessage={t('gasTransactionsPage.noTransactions')}
            pagination={true}
            itemsPerPage={15}
          />
        )}
      </div>
    </div>
  );
};

export default GasTransactionsPage;
