import React, { useState, useEffect, useMemo } from 'react';
import { getDeliveries, getCustomers, addDelivery, completeDelivery } from '../services/api';
import { Delivery, Customer, NewTransaction } from '../types';
import { GAS_COMPANIES } from '../constants';
import DataTable, { Column } from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { useLanguage } from '../contexts/LanguageContext';

const AddDeliveryModal: React.FC<{
    customers: Customer[];
    onClose: () => void;
    onSave: () => void;
}> = ({ customers, onClose, onSave }) => {
    const { t } = useLanguage();
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return [];
        return customers
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.customerId.includes(searchTerm))
            .slice(0, 10);
    }, [searchTerm, customers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId) {
            alert(t('deliveryPage.addModal.selectCustomerError'));
            return;
        }
        setIsSubmitting(true);
        try {
            await addDelivery(selectedCustomerId);
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to add delivery request", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Input 
                    label={t('deliveryPage.addModal.searchCustomer')}
                    placeholder={t('deliveryPage.addModal.searchPlaceholder')}
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setSelectedCustomerId('');
                    }}
                />
                {searchTerm && (
                    <div className="mt-2 border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                                <button
                                    type="button"
                                    key={c.id}
                                    onClick={() => {
                                        setSelectedCustomerId(c.id);
                                        setSearchTerm(c.name);
                                    }}
                                    className={`w-full text-left p-2 hover:bg-primary-100 dark:hover:bg-gray-700 ${selectedCustomerId === c.id ? 'bg-primary-100 dark:bg-gray-700' : ''}`}
                                >
                                    {c.name} ({c.customerId})
                                </button>
                            ))
                        ) : (
                            <div className="p-2 text-gray-500">{t('deliveryPage.addModal.noCustomerFound')}</div>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>{t('buttons.cancel')}</Button>
                <Button type="submit" disabled={isSubmitting || !selectedCustomerId}>{isSubmitting ? t('deliveryPage.addModal.adding') : t('deliveryPage.addModal.addAction')}</Button>
            </div>
        </form>
    );
};

const CompleteDeliveryModal: React.FC<{
    delivery: Delivery;
    onClose: () => void;
    onSave: () => void;
}> = ({ delivery, onClose, onSave }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<NewTransaction>({
        price: 950,
        amountPaid: 950,
        description: '14.2kg Cylinder Refill',
        gasCompanyGiven: GAS_COMPANIES[0],
        gasCompanyReceived: GAS_COMPANIES[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await completeDelivery(delivery.id, formData);
            onSave();
            onClose();
        } catch(error) {
            console.error("Failed to complete delivery", error);
            alert("An error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <p dangerouslySetInnerHTML={{ __html: t('deliveryPage.completeModal.completingFor', `<strong>${delivery.customerName}</strong>`) }} />
            
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
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('deliveryPage.completeModal.completing') : t('deliveryPage.completeModal.completeAction')}</Button>
            </div>
        </form>
    )
}


const DeliveryPage: React.FC = () => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deliveryToComplete, setDeliveryToComplete] = useState<Delivery | null>(null);
    const [deliverySearch, setDeliverySearch] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deliveriesData, customersData] = await Promise.all([getDeliveries(), getCustomers()]);
            setDeliveries(deliveriesData);
            setCustomers(customersData);
        } catch (error) {
            console.error("Failed to fetch delivery data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getBookingCycleDays = (agencyName?: string) => {
        if (agencyName === 'M/S VINDHYAWASHNI BHARAT GAS' || agencyName === 'BINDHYABASINI BHARAT GAS (BIHAR SHARIF)') return 25;
        return 45;
    };

    const { requested, completed } = useMemo(() => {
        let sorted = deliveries.sort((a,b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        
        if (deliverySearch.trim()) {
            const term = deliverySearch.toLowerCase();
            sorted = sorted.filter(d => 
                d.customerName?.toLowerCase().includes(term) ||
                d.customerMobileNo?.toLowerCase().includes(term) ||
                d.customerAddress?.toLowerCase().includes(term)
            );
        }

        return {
            requested: sorted.filter(d => {
                if (d.completedAt) return false;
                const customer = customers.find(c => c.id === d.customerId);
                const cycleDays = getBookingCycleDays(customer?.agencyName);
                return (new Date().getTime() - new Date(d.requestedAt).getTime()) / (1000 * 3600 * 24) < cycleDays;
            }),
            completed: sorted.filter(d => d.completedAt),
        }
    }, [deliveries, deliverySearch, customers]);

    const customerInfoAccessor = (d: Delivery) => (
        <div>
            <p className="font-semibold">{d.customerName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{d.customerRelationType} {d.customerRelationName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mob: {d.customerMobileNo}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{d.customerAddress}</p>
        </div>
    );

    const requestedColumns: Column<Delivery>[] = [
        { header: t('deliveryPage.headers.customer'), accessor: customerInfoAccessor },
        { header: t('deliveryPage.headers.requestedAt'), accessor: d => new Date(d.requestedAt).toLocaleString(locale) },
        { header: t('deliveryPage.headers.actions'), accessor: d => <Button size="sm" onClick={() => setDeliveryToComplete(d)}>{t('deliveryPage.actions.markComplete')}</Button> }
    ];

    const completedColumns: Column<Delivery>[] = [
        { header: t('deliveryPage.headers.customer'), accessor: customerInfoAccessor },
        { header: t('deliveryPage.headers.requestedAt'), accessor: d => new Date(d.requestedAt).toLocaleString(locale) },
        { header: t('deliveryPage.headers.completedAt'), accessor: d => d.completedAt ? new Date(d.completedAt).toLocaleString(locale) : '' },
    ];

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingDeliveries')}</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('deliveryPage.title')}</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder={t('deliveryPage.searchPlaceholder') || "Search deliveries..."}
                        value={deliverySearch}
                        onChange={(e) => setDeliverySearch(e.target.value)}
                        className="w-full sm:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto whitespace-nowrap">{t('deliveryPage.requestDelivery')}</Button>
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('deliveryPage.requestedDeliveries', requested.length)}</h3>
                <DataTable columns={requestedColumns} data={requested} emptyMessage={t('deliveryPage.emptyRequested')}/>
            </div>

            <div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('deliveryPage.completedDeliveries')}</h3>
                <DataTable columns={completedColumns} data={completed} />
            </div>

            {isAddModalOpen && (
                <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('deliveryPage.addModal.title')}>
                   <AddDeliveryModal 
                    customers={customers}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={fetchData}
                   />
                </Modal>
            )}

            {deliveryToComplete && (
                 <Modal isOpen={!!deliveryToComplete} onClose={() => setDeliveryToComplete(null)} title={t('deliveryPage.completeModal.title')}>
                    <CompleteDeliveryModal
                        delivery={deliveryToComplete}
                        onClose={() => setDeliveryToComplete(null)}
                        onSave={fetchData}
                    />
                 </Modal>
            )}
        </div>
    );
};

export default DeliveryPage;