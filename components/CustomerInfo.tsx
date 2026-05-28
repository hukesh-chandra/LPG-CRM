import React from 'react';
import { Customer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const CustomerInfo: React.FC<{ customer: Customer }> = ({ customer }) => {
    const { t } = useLanguage();
    
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
        </div>
    );
};
