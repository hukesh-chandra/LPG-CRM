import React, { useState, useCallback, useEffect, useRef } from 'react';
import Tabs from '../components/Tabs';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import { addCustomer, upsertCustomersBulk, getCustomers } from '../services/api';
import { NewCustomer, ConnectionType, Customer, RelationType } from '../types';
import { PANCHAYATS, CONNECTION_TYPES, TEMPLATE_HEADERS, AGENCIES, PANCHAYAT_VILLAGE_MAP, RELATION_TYPES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

type FormErrors = Partial<Record<keyof NewCustomer, string>>;

const ManualEntryForm: React.FC = () => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<NewCustomer>({
        name: '', customerId: '', consumerNo: '', lpgId: '', relationType: 'S/O', relationName: '',
        mobileNo: '', panchayat: PANCHAYATS[0], village: '', svNo: '', aadhaarNo: '',
        connectionType: ConnectionType.BPL,
        balance: 0,
        agencyName: AGENCIES[0],
        otherPanchayat: '',
        otherVillage: '',
        dueDate: '',
        remark: '',
        cardStatus: '',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableVillages, setAvailableVillages] = useState<string[]>([]);
    
    const formRefs = useRef<Record<string, HTMLElement | null>>({});

    useEffect(() => {
        const initialPanchayat = PANCHAYATS[0];
        if (initialPanchayat) {
            setAvailableVillages(PANCHAYAT_VILLAGE_MAP[initialPanchayat as keyof typeof PANCHAYAT_VILLAGE_MAP] || []);
        }
    }, []);

    useEffect(() => {
        if (formData.panchayat && formData.panchayat !== 'Other') {
            setAvailableVillages(PANCHAYAT_VILLAGE_MAP[formData.panchayat as keyof typeof PANCHAYAT_VILLAGE_MAP] || []);
        } else {
            setAvailableVillages([]);
        }
    }, [formData.panchayat]);


    const validate = (): FormErrors => {
        const newErrors: FormErrors = {};
        if (!formData.name) newErrors.name = t('addCustomerPage.errors.nameRequired');
        if (!formData.customerId) newErrors.customerId = t('addCustomerPage.errors.customerIdRequired');
        if (!formData.consumerNo) newErrors.consumerNo = t('addCustomerPage.errors.consumerNoRequired');
        if (!formData.mobileNo) newErrors.mobileNo = t('addCustomerPage.errors.mobileNoRequired');
        else if (!/^\d{10}$/.test(formData.mobileNo)) newErrors.mobileNo = t('addCustomerPage.errors.mobileNoInvalid');
        if (!formData.aadhaarNo) newErrors.aadhaarNo = t('addCustomerPage.errors.aadhaarNoRequired');
        else if (!/^\d{12}$/.test(formData.aadhaarNo)) newErrors.aadhaarNo = t('addCustomerPage.errors.aadhaarNoInvalid');
        if (!formData.relationName) newErrors.relationName = t('addCustomerPage.errors.relationNameRequired');
        return newErrors;
    };

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
            'agencyName', 'svNo', 'aadhaarNo', 'connectionType', 'dueDate', 'cardStatus', 'remark'
        ].filter(Boolean) as string[];

        const currentIndex = fieldOrder.indexOf(currentField);
        return fieldOrder[currentIndex + 1] || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;
        
        setIsSubmitting(true);
        try {
            await addCustomer(formData);
            window.location.hash = '/customers';
        } catch (error: any) {
            console.error('Failed to add customer', error);
            if (error.message.includes("Consumer No")) {
                setErrors(prev => ({ ...prev, consumerNo: error.message }));
            } else {
                alert(t('addCustomerPage.errors.genericError'));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['name'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('name'))} label={t('addCustomerPage.form.name')} name="name" value={formData.name} onChange={handleChange} error={errors.name} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['customerId'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('customerId'))} label={t('addCustomerPage.form.customerId')} name="customerId" value={formData.customerId} onChange={handleChange} error={errors.customerId} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['consumerNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('consumerNo'))} label={t('addCustomerPage.form.consumerNo')} name="consumerNo" value={formData.consumerNo} onChange={handleChange} error={errors.consumerNo} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['lpgId'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('lpgId'))} label={t('addCustomerPage.form.lpgId')} name="lpgId" value={formData.lpgId} onChange={handleChange} error={errors.lpgId} />
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['relationType'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('relationType'))} label={t('addCustomerPage.form.relationType')} name="relationType" value={formData.relationType} onChange={handleChange}>
                    {RELATION_TYPES.map(rt => <option key={rt} value={rt}>{t(`enums.relationType.${rt}` as any)}</option>)}
                </Select>
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['relationName'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('relationName'))} label={t('addCustomerPage.form.relationName')} name="relationName" value={formData.relationName} onChange={handleChange} error={errors.relationName} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['mobileNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('mobileNo'))} label={t('addCustomerPage.form.mobileNo')} name="mobileNo" value={formData.mobileNo} onChange={handleChange} error={errors.mobileNo} required />
                
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['panchayat'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('panchayat'))} label={t('addCustomerPage.form.panchayat')} name="panchayat" value={formData.panchayat} onChange={handleChange} error={errors.panchayat}>
                    {PANCHAYATS.map(p => <option key={p} value={p}>{p === 'Other' ? t('enums.other') : t(`enums.panchayats.${p}`)}</option>)}
                </Select>
                {formData.panchayat === 'Other' && (
                    <Input ref={el => { formRefs.current['otherPanchayat'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('otherPanchayat'))} label={t('addCustomerPage.form.otherPanchayat')} name="otherPanchayat" value={formData.otherPanchayat || ''} onChange={handleChange} required />
                )}
                
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['village'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('village'))} label={t('addCustomerPage.form.village')} name="village" value={formData.village} onChange={handleChange} error={errors.village}>
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
                <Input ref={el => { formRefs.current['svNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('svNo'))} label={t('addCustomerPage.form.svNo')} name="svNo" value={formData.svNo} onChange={handleChange} error={errors.svNo} />
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['aadhaarNo'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('aadhaarNo'))} label={t('addCustomerPage.form.aadhaarNo')} name="aadhaarNo" value={formData.aadhaarNo} onChange={handleChange} error={errors.aadhaarNo} required />
                {/* Fix: Changed ref callback to not return a value. */}
                <Select ref={el => { formRefs.current['connectionType'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('connectionType'))} label={t('addCustomerPage.form.connectionType')} name="connectionType" value={formData.connectionType} onChange={handleChange} error={errors.connectionType}>
                    {CONNECTION_TYPES.map(ct => <option key={ct} value={ct}>{t(`enums.connectionType.${ct}` as any)}</option>)}
                </Select>
                {/* Fix: Changed ref callback to not return a value. */}
                <Input ref={el => { formRefs.current['dueDate'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('dueDate'))} label={t('addCustomerPage.form.dueDate')} name="dueDate" type="date" value={formData.dueDate || ''} onChange={handleChange} />
                <Select ref={el => { formRefs.current['cardStatus'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('cardStatus'))} label={t('addCustomerPage.form.cardStatus')} name="cardStatus" value={formData.cardStatus || ''} onChange={handleChange}>
                    <option value="">{t('enums.other')}</option>
                    <option value="weHave">{t('enums.cardStatus.weHave')}</option>
                    <option value="customerHas">{t('enums.cardStatus.customerHas')}</option>
                    <option value="notClear">{t('enums.cardStatus.notClear')}</option>
                </Select>
                <Input ref={el => { formRefs.current['remark'] = el; }} onKeyDown={e => handleKeyDown(e, getNextField('remark'))} label={t('addCustomerPage.form.remark')} name="remark" value={formData.remark || ''} onChange={handleChange} />
                
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
            <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('buttons.saving') : t('buttons.saveCustomer')}</Button>
            </div>
        </form>
    );
};

const ExcelImport: React.FC = () => {
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<{toCreate: NewCustomer[], toUpdate: (NewCustomer & { existingId?: string })[], invalid: any[]}>({toCreate: [], toUpdate: [], invalid: []});
    const [isProcessing, setIsProcessing] = useState(false);
    const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);

    useEffect(() => {
        getCustomers().then(setExistingCustomers);
    }, []);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setParsedData({toCreate: [], toUpdate: [], invalid: []});
        }
    };
    
    const processFile = useCallback(() => {
        if (!file) return;
        if (typeof (window as any).XLSX === 'undefined') {
            alert(t('addCustomerPage.import.alerts.unavailable'));
            return;
        }

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = (window as any).XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = (window as any).XLSX.utils.sheet_to_json(worksheet, {header: 1});

            if (json.length === 0) {
                alert("The file appears to be empty.");
                setIsProcessing(false);
                return;
            }

            const headers = (json[0] as string[]).map(h => h ? h.trim() : '');
            
            // Flexible column mapping
            const findColIndex = (patterns: RegExp[]) => {
                return headers.findIndex(h => patterns.some(p => p.test(h)));
            };

            const colIndices = {
                name: findColIndex([/^name$/i, /^customer\s*name$/i]),
                customerId: findColIndex([/^customer\s*id$/i, /^customer\s*no$/i, /^customer$/i]),
                consumerNo: findColIndex([/^consumer\s*no$/i, /^consumer\s*id$/i]),
                lpgId: findColIndex([/^lpg\s*id$/i]),
                relationType: findColIndex([/^relation\s*type$/i, /^relation$/i]),
                relationName: findColIndex([/^relation\s*name$/i, /^father.*name$/i, /^husband.*name$/i]),
                mobileNo: findColIndex([/^mobile\s*no$/i, /^mobile$/i, /^phone$/i]),
                village: findColIndex([/^village$/i]),
                panchayat: findColIndex([/^panchayat$/i]),
                svNo: findColIndex([/^sv\s*no$/i, /^sv\s*number$/i]),
                aadhaarNo: findColIndex([/^aadhaar\s*no$/i, /^aadhaar$/i]),
                connectionType: findColIndex([/^connection\s*type$/i, /^connection$/i]),
                agencyName: findColIndex([/^agency\s*name$/i, /^agency$/i]),
                dueDate: findColIndex([/^due\s*date$/i]),
                remark: findColIndex([/^remark(s)?$/i]),
                kyc: findColIndex([/kyc/i]),
            };

            // Handle "Other" columns based on proximity to Village/Panchayat
            let otherVillageIndex = findColIndex([/^other\s*village$/i]);
            let otherPanchayatIndex = findColIndex([/^other\s*panchayat$/i]);

            if (otherVillageIndex === -1 && colIndices.village !== -1) {
                // Look for "Other" immediately after Village
                if (headers[colIndices.village + 1]?.match(/^other$/i)) {
                    otherVillageIndex = colIndices.village + 1;
                }
            }

            if (otherPanchayatIndex === -1 && colIndices.panchayat !== -1) {
                // Look for "Other" immediately after Panchayat
                if (headers[colIndices.panchayat + 1]?.match(/^other$/i)) {
                    otherPanchayatIndex = colIndices.panchayat + 1;
                }
            }

            // Check for missing required columns
            const missingCols = [];
            if (colIndices.name === -1) missingCols.push('Name');
            
            if (missingCols.length > 0) {
                alert(`Missing required columns: ${missingCols.join(', ')}. Please check your file headers.`);
                setIsProcessing(false);
                return;
            }

            const rows = json.slice(1);
            const customersToCreate: NewCustomer[] = [];
            const customersToUpdate: (NewCustomer & { existingId?: string })[] = [];
            const invalidRows: any[] = [];
            const existingConsumerMap = new Map<string, string>(
                existingCustomers.filter(c => c.consumerNo).map(c => [String(c.consumerNo).trim(), c.id])
            );

            rows.forEach((row, index) => {
                // Helper to safely get value
                const getVal = (idx: number) => idx !== -1 && row[idx] !== undefined ? String(row[idx]).trim() : '';

                const name = getVal(colIndices.name);
                const customerId = getVal(colIndices.customerId);
                const consumerNo = getVal(colIndices.consumerNo);
                const lpgId = getVal(colIndices.lpgId);
                const relationType = getVal(colIndices.relationType);
                const relationName = getVal(colIndices.relationName);
                
                // Clean numbers
                let mobileNo = getVal(colIndices.mobileNo).replace(/\D/g, ''); // Remove non-digits
                // Handle scientific notation or Excel oddities if possible, but regex replace is a good start for spaces/dashes.
                // If Excel exports as 9.123E+09, this might be tricky. String(row[idx]) usually handles it okay if it's parsed as number, 
                // but if it's a string in Excel, it's fine.
                // If it's a number in Excel, XLSX.utils.sheet_to_json might output it as a number.
                // The `getVal` converts to String.
                
                let aadhaarNo = getVal(colIndices.aadhaarNo).replace(/\D/g, '');

                const village = getVal(colIndices.village);
                const otherVillage = getVal(otherVillageIndex);
                const panchayat = getVal(colIndices.panchayat);
                const otherPanchayat = getVal(otherPanchayatIndex);
                const svNo = getVal(colIndices.svNo);
                const connectionType = getVal(colIndices.connectionType);
                const agencyName = getVal(colIndices.agencyName);
                const dueDate = getVal(colIndices.dueDate);
                const remark = getVal(colIndices.remark);
                const kycRaw = getVal(colIndices.kyc);
                const kycStr = (kycRaw || '').trim().toLowerCase();
                const kyc = ['yes', 'y', 'true', 'completed', '1', 'ok', 'done', 'yes kyc', 'kyc ok'].includes(kycStr) || kycStr.includes('ok') || kycStr.includes('yes') || kycStr === 'done';

                // Skip empty rows or rows with "a lot" of missing data
                // We define "a lot" as missing BOTH Name and Consumer No.
                // If either is present, we try to import it, but if BOTH are missing, it's definitely junk.
                if (!name && !consumerNo && !mobileNo && !aadhaarNo) return;

                let errors: string[] = [];
                
                // Non-critical fields: Mobile, Aadhaar, etc.
                // If they are missing or invalid, we just import them as is (or empty) and let the user edit later.
                // We do NOT add them to 'errors' array, so they don't block import.
                
                // Normalize Connection Type
                let normalizedConnectionType = ConnectionType.BPL;
                if (connectionType) {
                    const ct = connectionType.toUpperCase();
                    if (ct.includes('BPL')) normalizedConnectionType = ConnectionType.BPL;
                    else if (ct.includes('APL')) normalizedConnectionType = ConnectionType.APL;
                    else if (ct.includes('UJJWALA')) normalizedConnectionType = ConnectionType.UJJWALA;
                    else if (ct.includes('COMMERCIAL')) normalizedConnectionType = ConnectionType.Commercial;
                }

                // Normalize Relation Type
                let normalizedRelationType: RelationType = 'S/O';
                if (relationType) {
                    if (relationType.toUpperCase().includes('W')) normalizedRelationType = 'W/O';
                }

                const customerData: NewCustomer = {
                    name: name || 'Unknown Name', 
                    customerId: customerId || consumerNo || '', 
                    consumerNo: consumerNo || '', 
                    lpgId: lpgId || '', 
                    relationType: normalizedRelationType, 
                    relationName: relationName || '', 
                    mobileNo: mobileNo || '',
                    panchayat: panchayat || '', 
                    otherPanchayat: otherPanchayat || '', 
                    village: village || '', 
                    otherVillage: otherVillage || '', 
                    svNo: svNo || '', 
                    aadhaarNo: aadhaarNo || '', 
                    connectionType: normalizedConnectionType,
                    balance: 0,
                    agencyName: agencyName || '',
                    dueDate: dueDate || undefined,
                    remark: remark || '',
                    kyc: kyc,
                };
                
                if (errors.length > 0) {
                    invalidRows.push({ ...customerData, rowNum: index + 2, errors: errors.join(' ') });
                } else {
                    const consumerNoKey = customerData.consumerNo ? String(customerData.consumerNo).trim() : null;
                    const existingId = consumerNoKey ? existingConsumerMap.get(consumerNoKey) : undefined;
                    
                    if (existingId) {
                        customersToUpdate.push({ ...customerData, existingId });
                    } else {
                        customersToCreate.push(customerData);
                    }
                }
            });
            setParsedData({ toCreate: customersToCreate, toUpdate: customersToUpdate, invalid: invalidRows });
            setIsProcessing(false);
        };
        reader.readAsBinaryString(file);
    }, [file, existingCustomers, t]);
    
    const handleImport = async () => {
        const allValidCustomers = [...parsedData.toCreate, ...parsedData.toUpdate];
        if (allValidCustomers.length === 0) {
            alert(t('addCustomerPage.import.alerts.noValidCustomers'));
            return;
        }
        setIsProcessing(true);
        try {
            const result = await upsertCustomersBulk(allValidCustomers);
            alert(t('addCustomerPage.import.alerts.importSuccess', result.created, result.updated));
            window.location.hash = '/customers';
        } catch (error: any) {
            console.error("Import failed:", error);
            if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
                alert(t('addCustomerPage.import.alerts.permissionError'));
            } else {
                alert(t('addCustomerPage.import.alerts.importError') + " Check console for details.");
            }
        } finally {
            setIsProcessing(false);
        }
    }

    const downloadTemplate = () => {
        if (typeof (window as any).XLSX === 'undefined') {
            alert(t('addCustomerPage.import.alerts.unavailable'));
            return;
        }
        const ws = (window as any).XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
        const wb = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(wb, ws, "Customers");
        (window as any).XLSX.writeFile(wb, "Customer_Import_Template.xlsx");
    };

    const totalValid = parsedData.toCreate.length + parsedData.toUpdate.length;

    return (
        <div className="space-y-6">
            <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/30 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">{t('addCustomerPage.import.instructionsTitle')}</h4>
                <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                    <li>{t('addCustomerPage.import.instruction1')}</li>
                    <li>{t('addCustomerPage.import.instruction2')}</li>
                    <li>{t('addCustomerPage.import.instruction3')}</li>
                    <li>{t('addCustomerPage.import.instruction4')}</li>
                    <li>{t('addCustomerPage.import.instruction5')}</li>
                </ol>
            </div>
            <div className="flex items-center space-x-4">
                <Button onClick={downloadTemplate} variant="secondary">{t('addCustomerPage.import.downloadTemplate')}</Button>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
                <Button onClick={processFile} disabled={!file || isProcessing}>{isProcessing ? t('addCustomerPage.import.processing') : t('addCustomerPage.import.processFile')}</Button>
            </div>
            {(totalValid > 0 || parsedData.invalid.length > 0) && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold">{t('addCustomerPage.import.validationResults')}</h3>
                        <Button onClick={handleImport} disabled={isProcessing || totalValid === 0}>{t('addCustomerPage.import.importAndSync', totalValid)}</Button>
                    </div>
                     {parsedData.invalid.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-red-600">{t('addCustomerPage.import.invalidRows', parsedData.invalid.length)}</h4>
                            <div className="mt-2 max-h-40 overflow-y-auto border border-red-300 rounded-lg">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0"><tr>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.row')}</th>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.name')}</th>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.errors')}</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-red-200 dark:divide-red-800">
                                        {parsedData.invalid.slice(0, 50).map(row => (<tr key={row.rowNum}>
                                            <td className="p-2">{row.rowNum}</td><td className="p-2">{row.name}</td><td className="p-2 text-red-500">{row.errors}</td>
                                        </tr>))}
                                        {parsedData.invalid.length > 50 && (
                                            <tr><td colSpan={3} className="p-2 text-center text-gray-500">...and {parsedData.invalid.length - 50} more</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {(parsedData.toCreate.length > 0 || parsedData.toUpdate.length > 0) && (
                         <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                                <span className="text-green-600">{t('addCustomerPage.import.readyToCreate', parsedData.toCreate.length)}</span> / <span className="text-blue-600">{t('addCustomerPage.import.readyToUpdate', parsedData.toUpdate.length)}</span>
                            </h4>
                            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white dark:bg-gray-800">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.action')}</th>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.name')}</th>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.consumerNo')}</th>
                                        <th className="p-2 text-left">{t('addCustomerPage.import.headers.mobileNo')}</th>
                                        <th className="p-2 text-left">{t('addCustomerPage.form.kyc')}</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {parsedData.toUpdate.slice(0, 50).map((row, i) => (<tr key={`u-${i}`} className="bg-blue-50 dark:bg-blue-900/20">
                                            <td className="p-2 font-semibold text-blue-600">{t('addCustomerPage.import.actionUpdate')}</td><td className="p-2">{row.name}</td><td className="p-2">{row.consumerNo}</td><td className="p-2">{row.mobileNo}</td><td className="p-2">{row.kyc ? 'Completed' : 'Pending'}</td>
                                        </tr>))}
                                        {parsedData.toCreate.slice(0, 50 - Math.min(50, parsedData.toUpdate.length)).map((row, i) => (<tr key={`c-${i}`} className="bg-green-50 dark:bg-green-900/20">
                                            <td className="p-2 font-semibold text-green-600">{t('addCustomerPage.import.actionCreate')}</td><td className="p-2">{row.name}</td><td className="p-2">{row.consumerNo}</td><td className="p-2">{row.mobileNo}</td><td className="p-2">{row.kyc ? 'Completed' : 'Pending'}</td>
                                        </tr>))}
                                        {(parsedData.toUpdate.length + parsedData.toCreate.length) > 50 && (
                                            <tr><td colSpan={5} className="p-2 text-center text-gray-500">...and {(parsedData.toUpdate.length + parsedData.toCreate.length) - 50} more</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const AddCustomerPage: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState(0);

    const tabs = [
        { name: t('addCustomerPage.manualEntryTab'), content: <ManualEntryForm /> },
        { name: t('addCustomerPage.importTab'), content: <ExcelImport /> },
    ];
    
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('addCustomerPage.title')}</h2>
            <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
               <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        </div>
    );
};

export default AddCustomerPage;