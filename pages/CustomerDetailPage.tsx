import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getCustomerById, getTransactionsByCustomerId, addTransaction, updateTransaction, uploadCustomerDocument, updateCustomer, getDocumentsByCustomerId } from '../services/api';
import { Customer, Transaction, NewTransaction, TransactionHistory, CustomerDocument, DocumentType } from '../types';
import { GAS_COMPANIES, PANCHAYATS, PANCHAYAT_VILLAGE_MAP, CONNECTION_TYPES, AGENCIES, RELATION_TYPES } from '../constants';
import DataTable, { Column } from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { ClockIcon, DocumentTextIcon } from '../components/icons/Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface CustomerDetailPageProps {
    id: string;
}

const CustomerInfo: React.FC<{ customer: Customer }> = ({ customer }) => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

    const isUnbooked = !customer.lastBookingDate || (new Date().getTime() - new Date(customer.lastBookingDate).getTime()) / (1000 * 3600 * 24) >= 45;
    let bookingStatusText = t('customerDetailPage.unbooked');
    if (!isUnbooked && customer.lastBookingDate) {
        const nextDate = new Date(customer.lastBookingDate);
        nextDate.setDate(nextDate.getDate() + 45);
        bookingStatusText = t('customerDetailPage.bookedUntil', nextDate.toLocaleDateString(locale));
    }

    const details = [
        { label: t('addCustomerPage.form.name'), value: customer.name },
        { label: t('addCustomerPage.form.customerId'), value: customer.customerId },
        { label: t('customerDetailPage.agencyName'), value: customer.agencyName ? t(`enums.agencies.${customer.agencyName}`) : 'N/A' },
        { label: t('addCustomerPage.form.consumerNo'), value: customer.consumerNo },
        { label: t('addCustomerPage.form.lpgId'), value: customer.lpgId },
        { label: t('addCustomerPage.form.relation'), value: `${t(`enums.relationType.${customer.relationType}` as any)} ${customer.relationName}` },
        { label: t('addCustomerPage.form.mobileNo'), value: customer.mobileNo },
        { label: t('addCustomerPage.form.village'), value: customer.village === 'Other' ? customer.otherVillage : t(`enums.villages.${customer.village}`) },
        { label: t('addCustomerPage.form.panchayat'), value: customer.panchayat === 'Other' ? customer.otherPanchayat : t(`enums.panchayats.${customer.panchayat}`) },
        { label: t('addCustomerPage.form.svNo'), value: customer.svNo },
        { label: t('addCustomerPage.form.aadhaarNo'), value: customer.aadhaarNo },
        { label: t('addCustomerPage.form.kyc'), value: customer.kyc ? t('customerListPage.kycCompleted') : t('customerListPage.kycPending') },
        { label: t('addCustomerPage.form.connectionType'), value: t(`enums.connectionType.${customer.connectionType}` as any) },
        { label: t('addCustomerPage.form.dueDate'), value: customer.dueDate ? new Date(customer.dueDate).toLocaleDateString(locale) : 'N/A' },
        { label: t('customerDetailPage.bookingStatus'), value: bookingStatusText },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('customerDetailPage.customerDetails')}</h3>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-right">{t('customerDetailPage.currentBalance')}</p>
                    <p className={`text-2xl font-bold text-right ${customer.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{customer.balance.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {details.map(item => (
                    <div key={item.label}>
                        <p className="font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                        <p className="text-gray-900 dark:text-white">{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CustomerEditForm: React.FC<{ customer: Customer; onSave: () => void; onCancel: () => void }> = ({ customer, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<Partial<Customer>>(customer);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    
    const formRefs = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        if (formData.panchayat) {
            setAvailableVillages(PANCHAYAT_VILLAGE_MAP[formData.panchayat as keyof typeof PANCHAYAT_VILLAGE_MAP] || []);
        }
    }, [formData.panchayat]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
             if (name === 'panchayat') {
                newState.village = '';
                if (value !== 'Other') {
                    newState.otherPanchayat = ''; 
                }
            }
            if (name === 'village' && value !== 'Other') {
                newState.otherVillage = '';
            }
            return newState;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, nextField: string | null) => {
        if (e.key === 'Enter' && nextField) {
            e.preventDefault();
            const nextElement = formRefs.current[nextField];
            if (nextElement) {
                nextElement.focus();
            }
        }
    };
    
    const getNextField = (currentField: string): string | null => {
        const fieldOrder = [
            'name', 'customerId', 'consumerNo', 'lpgId', 'relationType', 'relationName', 'mobileNo',
            'panchayat', formData.panchayat === 'Other' ? 'otherPanchayat' : null,
            'village', formData.village === 'Other' ? 'otherVillage' : null,
            'agencyName', 'svNo', 'aadhaarNo', 'connectionType', 'dueDate'
        ].filter(Boolean) as string[];

        const currentIndex = fieldOrder.indexOf(currentField);
        return fieldOrder[currentIndex + 1] || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateCustomer(customer.id, formData);
            onSave();
        } catch (error) {
            console.error("Failed to update customer", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t('customerDetailPage.editMode.title')}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['name'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('name'))} label={t('addCustomerPage.form.name')} name="name" value={formData.name} onChange={handleChange} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['customerId'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('customerId'))} label={t('addCustomerPage.form.customerId')} name="customerId" value={formData.customerId} onChange={handleChange} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['consumerNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('consumerNo'))} label={t('addCustomerPage.form.consumerNo')} name="consumerNo" value={formData.consumerNo} onChange={handleChange} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['lpgId'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('lpgId'))} label={t('addCustomerPage.form.lpgId')} name="lpgId" value={formData.lpgId} onChange={handleChange} />
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['relationType'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('relationType'))} label={t('addCustomerPage.form.relationType')} name="relationType" value={formData.relationType} onChange={handleChange}>
                    {RELATION_TYPES.map(rt => <option key={rt} value={rt}>{t(`enums.relationType.${rt}` as any)}</option>)}
                </Select>
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['relationName'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('relationName'))} label={t('addCustomerPage.form.relationName')} name="relationName" value={formData.relationName} onChange={handleChange} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['mobileNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('mobileNo'))} label={t('addCustomerPage.form.mobileNo')} name="mobileNo" value={formData.mobileNo} onChange={handleChange} required />
                
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['panchayat'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('panchayat'))} label={t('addCustomerPage.form.panchayat')} name="panchayat" value={formData.panchayat} onChange={handleChange}>
                    {PANCHAYATS.map(p => <option key={p} value={p}>{p === 'Other' ? t('enums.other') : t(`enums.panchayats.${p}`)}</option>)}
                </Select>
                {formData.panchayat === 'Other' && (
                    <Input ref={el => { formRefs.current['otherPanchayat'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('otherPanchayat'))} label={t('addCustomerPage.form.otherPanchayat')} name="otherPanchayat" value={formData.otherPanchayat || ''} onChange={handleChange} required />
                )}
                
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['village'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('village'))} label={t('addCustomerPage.form.village')} name="village" value={formData.village} onChange={handleChange}>
                    <option value="">{t('addCustomerPage.form.selectVillage')}</option>
                    {availableVillages.map(v => <option key={v} value={v}>{t(`enums.villages.${v}`)}</option>)}
                    <option value="Other">{t('enums.other')}</option>
                </Select>
                {formData.village === 'Other' && (
                    <Input ref={el => { formRefs.current['otherVillage'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('otherVillage'))} label={t('addCustomerPage.form.otherVillage')} name="otherVillage" value={formData.otherVillage || ''} onChange={handleChange} required />
                )}

                 {/* Fix: Changed ref callback to not return a value. */}
                 <Select ref={el => { formRefs.current['agencyName'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('agencyName'))} label={t('addCustomerPage.form.agencyName')} name="agencyName" value={formData.agencyName} onChange={handleChange}>
                    {AGENCIES.map(a => <option key={a} value={a}>{t(`enums.agencies.${a}`)}</option>)}
                </Select>
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['svNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('svNo'))} label={t('addCustomerPage.form.svNo')} name="svNo" value={formData.svNo} onChange={handleChange} />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['aadhaarNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('aadhaarNo'))} label={t('addCustomerPage.form.aadhaarNo')} name="aadhaarNo" value={formData.aadhaarNo} onChange={handleChange} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['connectionType'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('connectionType'))} label={t('addCustomerPage.form.connectionType')} name="connectionType" value={formData.connectionType} onChange={handleChange}>
                    {CONNECTION_TYPES.map(ct => <option key={ct} value={ct}>{t(`enums.connectionType.${ct}` as any)}</option>)}
                </Select>
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['dueDate'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('dueDate'))} label={t('addCustomerPage.form.dueDate')} name="dueDate" type="date" value={formData.dueDate || ''} onChange={handleChange} />
                
                <div className="flex items-center space-x-2 mt-4">
                    <input
                        type="checkbox"
                        id="kyc"
                        name="kyc"
                        checked={formData.kyc || false}
                        onChange={(e) => setFormData({ ...formData, kyc: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="kyc" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                        {t('addCustomerPage.form.kyc')}
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onCancel}>{t('buttons.cancel')}</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('buttons.saving') : t('buttons.saveChanges')}</Button>
            </div>
        </form>
    );
};


const SaleFormModal: React.FC<{
    customerId: string;
    saleToEdit?: Transaction | null;
    onClose: () => void;
    onSave: (transaction: Transaction) => void;
}> = ({ customerId, saleToEdit, onClose, onSave }) => {
    const { t } = useLanguage();
    const isEditMode = !!saleToEdit;
    
    const [formData, setFormData] = useState<NewTransaction>({
        price: 950,
        amountPaid: 950,
        description: '14.2kg Cylinder Refill',
        gasCompanyGiven: GAS_COMPANIES[0],
        gasCompanyReceived: GAS_COMPANIES[0],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (saleToEdit) {
            setFormData({
                price: saleToEdit.price,
                amountPaid: saleToEdit.amountPaid,
                description: saleToEdit.description,
                gasCompanyGiven: saleToEdit.gasCompanyGiven,
                gasCompanyReceived: saleToEdit.gasCompanyReceived || GAS_COMPANIES[0],
            });
        }
    }, [saleToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            let savedTransaction;
            if (isEditMode) {
                 savedTransaction = await updateTransaction(saleToEdit.id, { ...formData, date: saleToEdit.date });
            } else {
                 savedTransaction = await addTransaction(customerId, formData);
                 import('../services/api').then(api => api.getCustomerById(customerId).then(customer => {
                        if (customer) {
                            const isUnbooked = !customer.lastBookingDate || (new Date().getTime() - new Date(customer.lastBookingDate).getTime()) / (1000 * 3600 * 24) >= 45;
                            if (isUnbooked) {
                                if (window.confirm(t('dashboard.quickSell.unbookedAlert'))) {
                                    api.updateCustomer(customer.id, { lastBookingDate: new Date().toISOString() });
                                }
                            }
                        }
                 }));
            }
            onSave(savedTransaction);
            onClose();
        } catch (error) {
            console.error("Failed to save transaction", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t('customerDetailPage.saleModal.price')} name="price" type="number" value={formData.price} onChange={handleChange} required />
            <Input label={t('customerDetailPage.saleModal.amountPaid')} name="amountPaid" type="number" value={formData.amountPaid} onChange={handleChange} required />
            <Input label={t('customerDetailPage.saleModal.description')} name="description" value={formData.description} onChange={handleChange} required />
            
            <div className="grid grid-cols-2 gap-4">
                <Select label={t('customerDetailPage.saleModal.companyGiven')} name="gasCompanyGiven" value={formData.gasCompanyGiven} onChange={handleChange}>
                    {GAS_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                 <Select label={t('customerDetailPage.saleModal.companyReceived')} name="gasCompanyReceived" value={formData.gasCompanyReceived} onChange={handleChange}>
                    {GAS_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
            </div>


            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>{t('buttons.cancel')}</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('buttons.saving') : t('buttons.saveTransaction')}</Button>
            </div>
        </form>
    );
};

const ViewHistoryModal: React.FC<{ transaction: Transaction, onClose: () => void }> = ({ transaction, onClose }) => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    return (
        <Modal isOpen={true} onClose={onClose} title={t('customerDetailPage.historyModal.title', transaction.id)}>
            <div className="space-y-4">
                {transaction.history && transaction.history.length > 0 ? (
                    transaction.history.slice().reverse().map((change: TransactionHistory, index) => (
                        <div key={index} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {t('customerDetailPage.historyModal.changedOn', new Date(change.changedAt).toLocaleString(locale))}
                            </p>
                            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <p><strong>{t('customerDetailPage.historyModal.previousState')}</strong></p>
                                <ul className="list-disc list-inside">
                                    <li><strong>{t('customerDetailPage.historyModal.state.price')}:</strong> ₹{change.previousState.price.toLocaleString(locale, {minimumFractionDigits: 2})}</li>
                                    <li><strong>{t('customerDetailPage.historyModal.state.amountPaid')}:</strong> ₹{change.previousState.amountPaid.toLocaleString(locale, {minimumFractionDigits: 2})}</li>
                                    <li><strong>{t('customerDetailPage.historyModal.state.description')}:</strong> {change.previousState.description}</li>
                                    <li><strong>{t('customerDetailPage.historyModal.state.company')}:</strong> {change.previousState.gasCompanyGiven}</li>
                                    <li><strong>{t('customerDetailPage.historyModal.state.date')}:</strong> {new Date(change.previousState.date).toLocaleString(locale)}</li>
                                </ul>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>{t('customerDetailPage.historyModal.noHistory')}</p>
                )}
            </div>
        </Modal>
    );
};

import imageCompression from 'browser-image-compression';

const DocumentUploader: React.FC<{
    label: string;
    document?: CustomerDocument;
    onUpload: (file: File, onProgress: (progress: number) => void) => Promise<void>;
}> = ({ label, document, onUpload }) => {
    const { t } = useLanguage();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            let file = e.target.files[0];

            if (file.type.startsWith('image/')) {
                try {
                    const options = {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    };
                    file = await imageCompression(file, options) as File;
                } catch (compressionError) {
                    console.warn("Image compression failed, using original file", compressionError);
                }
            }

            if (file.size > MAX_SIZE_BYTES) {
                alert(t('customerDetailPage.documents.sizeError', 5));
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            if (!ALLOWED_TYPES.includes(file.type)) {
                alert(t('customerDetailPage.documents.typeError'));
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            
            setIsUploading(true);
            setUploadProgress(0);
            setError(null);
            try {
                await onUpload(file, (progress) => {
                    setUploadProgress(progress);
                });
            } catch (uploadError) {
                console.error("Upload failed in DocumentUploader", uploadError);
                setError(t('customerDetailPage.documents.uploadError'));
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    }, [onUpload, t]);
    
    const printImage = (url: string) => {
        const printWindow = window.open(url, '_blank');
        printWindow?.addEventListener('load', () => {
            printWindow?.print();
        });
    };

    const docUrl = document?.url;
    const isPdf = docUrl && (document.fileName.toLowerCase().endsWith('.pdf') || docUrl.toLowerCase().includes('application%2fpdf'));

    return (
        <div className="border p-4 rounded-lg text-center space-y-2 flex flex-col justify-between">
            <div>
                <h4 className="font-semibold">{label}</h4>
                {isUploading && (
                     <div className="my-4 space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                        <p className="text-sm text-center">{t('messages.uploading', Math.round(uploadProgress))}</p>
                    </div>
                )}
                {error && !isUploading && (
                    <div className="my-4 text-red-500 text-sm">{error}</div>
                )}
                {!isUploading && !error && docUrl && (
                    <div className="space-y-2 my-2">
                         {isPdf ? (
                            <div className="flex flex-col justify-center items-center h-24 text-gray-500 dark:text-gray-400">
                                <DocumentTextIcon className="w-12 h-12" />
                                <p className="text-sm mt-2">{document.fileName}</p>
                            </div>
                        ) : (
                            <img src={docUrl} alt={label} className="max-h-24 mx-auto rounded-md" />
                        )}
                        <div className="flex justify-center gap-2">
                            <a href={docUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="secondary">{t('customerDetailPage.documents.view')}</Button></a>
                            <Button size="sm" variant="secondary" onClick={() => printImage(docUrl)}>{t('customerDetailPage.documents.print')}</Button>
                        </div>
                    </div>
                )}
                 {!isUploading && !error && !docUrl && <div className="h-24 flex items-center justify-center text-gray-400">{t('customerDetailPage.documents.notUploaded')}</div>}
            </div>
            <div>
                <input type="file" accept="image/*,application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {docUrl ? t('customerDetailPage.documents.replace') : t('customerDetailPage.documents.upload')}
                </Button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('customerDetailPage.documents.uploadHelp')}</p>
            </div>
        </div>
    );
};

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ id }) => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [documents, setDocuments] = useState<CustomerDocument[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Transaction | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [viewingHistory, setViewingHistory] = useState<Transaction | null>(null);

    const fetchCustomerData = useCallback(async () => {
        if (!id) {
            setCustomer(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // First, get the primary customer data. If this fails or returns null, we show "not found".
            const customerData = await getCustomerById(id);
            setCustomer(customerData || null);

            if (customerData) {
                // If customer exists, fetch secondary data. Failures here will not hide the customer.
                try {
                    const transactionsData = await getTransactionsByCustomerId(id);
                    setTransactions(transactionsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                } catch (error) {
                    console.error("Failed to fetch transactions:", error);
                    setTransactions([]); // Reset on error
                }

                try {
                    const documentsData = await getDocumentsByCustomerId(id);
                    setDocuments(documentsData);
                } catch (error) {
                    console.error("Failed to fetch documents:", error);
                    setDocuments([]); // Reset on error
                }
            } else {
                // This handles the case where getCustomerById returned null (e.g., deleted customer)
                setTransactions([]);
                setDocuments([]);
            }
        } catch (error) {
            // This catch block will now mostly handle errors from getCustomerById
            console.error("Failed to fetch primary customer data:", error);
            setCustomer(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCustomerData();
    }, [fetchCustomerData]);

    const handleOpenAddSaleModal = () => {
        setEditingSale(null);
        setIsSaleModalOpen(true);
    };
    
    const handleOpenEditSaleModal = (transaction: Transaction) => {
        setEditingSale(transaction);
        setIsSaleModalOpen(true);
    };

    const handleSaveTransaction = () => {
        fetchCustomerData(); 
    };

    const handleDocumentUpload = useCallback(async (docType: DocumentType, file: File, onProgress: (progress: number) => void) => {
        if (!customer) return;
        try {
            await uploadCustomerDocument(customer.id, docType, file, onProgress);
            await fetchCustomerData(); // Refresh to show new doc
        } catch (error) {
            console.error("Failed to upload document", error);
            // Re-throw to be caught in DocumentUploader's catch block to display UI error
            throw error;
        }
    }, [customer, fetchCustomerData]);
    
    const handlePrintDetails = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !customer) return;

        const customerDetailsHtml = `
            <h2>${customer.name} - ${t('customerDetailPage.customerDetails')}</h2>
            <table border="1" style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
                <tbody>
                    <tr><td style="padding: 5px;">${t('addCustomerPage.form.customerId')}</td><td style="padding: 5px;">${customer.customerId}</td></tr>
                    <tr><td style="padding: 5px;">${t('addCustomerPage.form.consumerNo')}</td><td style="padding: 5px;">${customer.consumerNo}</td></tr>
                     <tr><td style="padding: 5px;">${t('addCustomerPage.form.relation')}</td><td style="padding: 5px;">${t(`enums.relationType.${customer.relationType}` as any)} ${customer.relationName}</td></tr>
                    <tr><td style="padding: 5px;">${t('addCustomerPage.form.mobileNo')}</td><td style="padding: 5px;">${customer.mobileNo}</td></tr>
                    <tr><td style="padding: 5px;">${t('addCustomerPage.form.village')}</td><td style="padding: 5px;">${customer.village === 'Other' ? customer.otherVillage : t(`enums.villages.${customer.village}`)}, ${customer.panchayat === 'Other' ? customer.otherPanchayat : t(`enums.panchayats.${customer.panchayat}`)}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">${t('customerDetailPage.dueAmount')}</td><td style="padding: 5px; font-weight: bold;">${customer.balance < 0 ? `₹${(-customer.balance).toFixed(2)}` : '₹0.00'}</td></tr>
                    <tr><td style="padding: 5px; font-weight: bold;">${t('customerDetailPage.currentBalance')}</td><td style="padding: 5px; font-weight: bold;">₹${customer.balance.toFixed(2)}</td></tr>
                </tbody>
            </table>
        `;
        
        const transactionsHtml = `
            <h3>${t('customerDetailPage.transactionHistory')}</h3>
            <table border="1" style="width:100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        ${transactionColumns.filter(c => c.header !== t('customerDetailPage.headers.actions')).map(c => `<th style="padding: 5px; text-align: left;">${c.header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => `
                        <tr>
                            <td style="padding: 5px;">${new Date(t.date).toLocaleDateString(locale)}</td>
                            <td style="padding: 5px;">${t.description}</td>
                            <td style="padding: 5px;">₹${t.price.toFixed(2)}</td>
                            <td style="padding: 5px;">₹${t.amountPaid.toFixed(2)}</td>
                            <td style="padding: 5px;">₹${(t.price - t.amountPaid).toFixed(2)}</td>
                            <td style="padding: 5px;">${t.gasCompanyGiven}</td>
                            <td style="padding: 5px;">${t.gasCompanyReceived}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        printWindow.document.write(`
            <html>
                <head><title>${customer.name} - Details</title></head>
                <body style="font-family: sans-serif;">
                    ${customerDetailsHtml}
                    ${transactionsHtml}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };
    
    const transactionColumns: Column<Transaction>[] = [
        { header: t('customerDetailPage.headers.date'), accessor: (item) => new Date(item.date).toLocaleDateString(locale) },
        { header: t('customerDetailPage.headers.description'), accessor: 'description' },
        { header: t('customerDetailPage.headers.price'), accessor: (item) => `₹${item.price.toLocaleString(locale, {minimumFractionDigits: 2})}` },
        { header: t('customerDetailPage.headers.amountPaid'), accessor: (item) => `₹${item.amountPaid.toLocaleString(locale, {minimumFractionDigits: 2})}` },
        { header: t('customerDetailPage.headers.amountDue'), accessor: (item) => {
            const due = item.price - item.amountPaid;
            const color = due > 0 ? 'text-red-600' : due < 0 ? 'text-green-600' : '';
            return <span className={color}>{`₹${due.toLocaleString(locale, {minimumFractionDigits: 2})}`}</span>
        }},
        { header: t('customerDetailPage.headers.companyGiven'), accessor: 'gasCompanyGiven' },
        { header: t('customerDetailPage.headers.companyReceived'), accessor: 'gasCompanyReceived' },
        {
            header: t('customerDetailPage.headers.actions'), accessor: (item) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleOpenEditSaleModal(item)}>{t('customerDetailPage.actions.edit')}</Button>
                    {item.history && item.history.length > 0 && (
                        <Button size="sm" variant="secondary" onClick={() => setViewingHistory(item)} leftIcon={<ClockIcon className="w-4 h-4" />}>
                           {t('customerDetailPage.actions.history')}
                        </Button>
                    )}
                </div>
            )
        }
    ];

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingCustomer')}</div>;
    }

    if (!customer) {
        return <div className="text-center p-8">{t('messages.customerNotFound')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{customer.name}</h2>
                <div className="flex items-center gap-2">
                    {!isEditMode && <Button variant="secondary" onClick={() => setIsEditMode(true)}>{t('customerDetailPage.editMode.editAction')}</Button>}
                     <Button variant="secondary" onClick={handlePrintDetails}>{t('customerDetailPage.printDetails')}</Button>
                    <a href="#/customers">
                        <Button variant="secondary">{t('customerDetailPage.backToList')}</Button>
                    </a>
                </div>
            </div>
            
            {isEditMode ? (
                <CustomerEditForm customer={customer} onSave={() => { setIsEditMode(false); fetchCustomerData(); }} onCancel={() => setIsEditMode(false)} />
            ) : (
                <CustomerInfo customer={customer} />
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                 <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('customerDetailPage.documents.title')}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DocumentUploader label={t('customerDetailPage.documents.aadhaar')} document={documents.find(d => d.documentType === 'aadhaarCard')} onUpload={(file, onProgress) => handleDocumentUpload('aadhaarCard', file, onProgress)} />
                    <DocumentUploader label={t('customerDetailPage.documents.passbook')} document={documents.find(d => d.documentType === 'bankPassbook')} onUpload={(file, onProgress) => handleDocumentUpload('bankPassbook', file, onProgress)} />
                    <DocumentUploader label={t('customerDetailPage.documents.consumerCard')} document={documents.find(d => d.documentType === 'consumerCard')} onUpload={(file, onProgress) => handleDocumentUpload('consumerCard', file, onProgress)} />
                    <DocumentUploader label={t('customerDetailPage.documents.sv')} document={documents.find(d => d.documentType === 'svDocument')} onUpload={(file, onProgress) => handleDocumentUpload('svDocument', file, onProgress)} />
                 </div>
            </div>

            <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{t('customerDetailPage.transactionHistory')}</h3>
                 <div className="flex items-center gap-2">
                    <Button onClick={handleOpenAddSaleModal}>{t('customerDetailPage.addSale')}</Button>
                 </div>
            </div>
            <DataTable columns={transactionColumns} data={transactions} />

            {isSaleModalOpen && (
                <Modal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} title={editingSale ? t('customerDetailPage.saleModal.editTitle') : t('customerDetailPage.saleModal.addTitle')}>
                    <SaleFormModal
                        customerId={customer.id}
                        saleToEdit={editingSale}
                        onClose={() => setIsSaleModalOpen(false)}
                        onSave={handleSaveTransaction}
                    />
                </Modal>
            )}

            {viewingHistory && (
                <ViewHistoryModal transaction={viewingHistory} onClose={() => setViewingHistory(null)} />
            )}
        </div>
    );
};

export default CustomerDetailPage;