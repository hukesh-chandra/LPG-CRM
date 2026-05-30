import React, { useState } from 'react';
import { Customer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { updateCustomer } from '../services/api';

const Check = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const Edit2 = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);

const X = ({ size = 24 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export const CustomerInfo: React.FC<{ customer: Customer }> = ({ customer }) => {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [remark, setRemark] = useState(customer.remark || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateCustomer(customer.id, { remark });
            customer.remark = remark; // Optimistic update
            setIsEditing(false);
        } catch (e) {
            console.error('Failed to update remark', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCardStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        try {
            await updateCustomer(customer.id, { cardStatus: newStatus as any });
            customer.cardStatus = newStatus as any; // Optimistic update
        } catch (error) {
            console.error('Failed to update card status', error);
        }
    };

    return (
        <div>
            <div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {t(`enums.relationType.${customer.relationType}` as any) || customer.relationType} {customer.relationName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
                Mob: {customer.mobileNo} &bull; {customer.village === 'Other' ? customer.otherVillage : t(`enums.villages.${customer.village}`)}, {customer.panchayat === 'Other' ? customer.otherPanchayat : t(`enums.panchayats.${customer.panchayat}`)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {t('addCustomerPage.form.customerId')}: {customer.customerId} &bull; {t('addCustomerPage.form.consumerNo')}: {customer.consumerNo}
            </div>
            <div className="text-xs mt-1 text-gray-600 dark:text-gray-300 flex items-center flex-wrap gap-1">
                <span className="font-medium">{t('addCustomerPage.form.remark')}:</span>
                {isEditing ? (
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded shadow-sm border border-gray-200 dark:border-gray-700">
                        <input 
                            type="text" 
                            className="text-xs border-none focus:ring-0 p-0 m-0 w-32 bg-transparent dark:text-white"
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            disabled={isSaving}
                            autoFocus
                        />
                        <button onClick={handleSave} disabled={isSaving} className="text-green-600 hover:bg-green-50 rounded p-0.5">
                            <Check size={14} />
                        </button>
                        <button onClick={() => { setRemark(customer.remark || ''); setIsEditing(false); }} disabled={isSaving} className="text-red-600 hover:bg-red-50 rounded p-0.5">
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 group">
                        <span>{customer.remark || <span className="text-gray-400 italic">N/A</span>}</span>
                        <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity">
                            <Edit2 size={12} />
                        </button>
                    </div>
                )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                <span className="font-medium">{t('addCustomerPage.form.cardStatus')}:</span> 
                <select 
                    value={customer.cardStatus || ''} 
                    onChange={handleCardStatusChange}
                    className="text-xs border-gray-300 dark:border-gray-600 rounded bg-transparent dark:bg-gray-700 text-gray-900 dark:text-gray-100 py-0 pl-1 pr-6"
                >
                    <option value="">{t('enums.other')}</option>
                    <option value="weHave">{t('enums.cardStatus.weHave')}</option>
                    <option value="customerHas">{t('enums.cardStatus.customerHas')}</option>
                    <option value="notClear">{t('enums.cardStatus.notClear')}</option>
                </select>
            </div>
        </div>
    );
};
