import React, { useState, useEffect, useMemo } from 'react';
import { getDeliveries, listDeliveryBoys, listStockLocations, assignDelivery, cancelDelivery } from '../services/api';
import { Delivery, AppUser, StockLocation, CylinderType, CYLINDER_TYPES, CYLINDER_TYPE_LABELS } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { CustomerInfo } from '../components/CustomerInfo';
import { useLanguage } from '../contexts/LanguageContext';
import { TruckIcon, UsersIcon, CheckCircleIcon, XMarkIcon } from '../components/icons/Icons';

export const AssignDeliveryPage: React.FC = () => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [deliveryBoys, setDeliveryBoys] = useState<AppUser[]>([]);
    const [vehicles, setVehicles] = useState<StockLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'out_for_delivery'>('pending');

    const [assignments, setAssignments] = useState<Record<string, {
        boyUid?: string;
        vehicleId?: string;
        cylinderType?: CylinderType;
    }>>({});
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [delList, boysList, locList] = await Promise.all([
                getDeliveries(),
                listDeliveryBoys(),
                listStockLocations(),
            ]);
            setDeliveries(delList);
            setDeliveryBoys(boysList);
            setVehicles(locList.filter(l => l.type === 'vehicle'));
        } catch (err) {
            console.error("Failed loading assignment data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(d => {
            // Status filter
            if (filterStatus === 'pending') {
                if (d.completedAt || d.status === 'completed' || d.status === 'cancelled') return false;
            } else if (filterStatus === 'out_for_delivery') {
                if (d.status !== 'out_for_delivery' || d.completedAt) return false;
            }

            // Search filter
            if (!searchTerm.trim()) return true;
            const term = searchTerm.trim().toLowerCase();
            return (
                d.customerName?.toLowerCase().includes(term) ||
                d.customerRelationName?.toLowerCase().includes(term) ||
                d.customerMobileNo?.toLowerCase().includes(term) ||
                d.customerAddress?.toLowerCase().includes(term)
            );
        });
    }, [deliveries, filterStatus, searchTerm]);

    const handleAssign = async (deliveryId: string) => {
        const sel = assignments[deliveryId];
        if (!sel?.boyUid || !sel?.vehicleId || !sel?.cylinderType) {
            alert("Please select a Delivery Boy, a Vehicle, and a Cylinder Type before assigning.");
            return;
        }

        setSubmittingId(deliveryId);
        try {
            await assignDelivery({
                deliveryId,
                assignedTo: sel.boyUid,
                assignedVehicleId: sel.vehicleId,
                cylinderType: sel.cylinderType,
            });
            alert("Delivery assigned successfully!");
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Failed to assign delivery.");
        } finally {
            setSubmittingId(null);
        }
    };

    const handleCancelDelivery = async (deliveryId: string) => {
        if (!window.confirm("Are you sure you want to cancel this delivery request?")) return;
        try {
            await cancelDelivery(deliveryId);
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Failed to cancel delivery");
        }
    };

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingDeliveries')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Delivery Assignment (Admin)</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Assign pending customer deliveries to active delivery boys and vehicles.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant={filterStatus === 'pending' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterStatus('pending')}>
                        Unassigned / Pending ({deliveries.filter(d => !d.completedAt && d.status !== 'out_for_delivery' && d.status !== 'cancelled').length})
                    </Button>
                    <Button variant={filterStatus === 'out_for_delivery' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterStatus('out_for_delivery')}>
                        Out for Delivery ({deliveries.filter(d => d.status === 'out_for_delivery' && !d.completedAt).length})
                    </Button>
                    <Button variant={filterStatus === 'all' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterStatus('all')}>
                        All ({deliveries.length})
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <Input
                    label="Search Delivery Requests"
                    placeholder="Search by customer name, relation name, mobile number, or village..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredDeliveries.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 text-center rounded-lg shadow text-gray-500 dark:text-gray-400">
                    No delivery requests match the current selection.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredDeliveries.map((delivery) => {
                        const sel = assignments[delivery.id] || {
                            boyUid: delivery.assignedTo || undefined,
                            vehicleId: delivery.assignedVehicleId || undefined,
                            cylinderType: delivery.cylinderType || '14KG_HP',
                        };

                        const assignedBoy = deliveryBoys.find(b => b.uid === delivery.assignedTo);
                        const assignedVeh = vehicles.find(v => v.id === delivery.assignedVehicleId);

                        return (
                            <div key={delivery.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                            {delivery.customerName}
                                        </h3>
                                        <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
                                            {delivery.customerRelationType || 'S/O'} {delivery.customerRelationName || 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Phone: {delivery.customerMobileNo || 'N/A'} | Address: {delivery.customerAddress}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Requested: {new Date(delivery.requestedAt).toLocaleString(locale)}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                        delivery.status === 'out_for_delivery'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                            : delivery.status === 'completed'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                    }`}>
                                        {delivery.status === 'out_for_delivery' ? 'Out For Delivery' : delivery.status === 'completed' ? 'Completed' : 'Pending'}
                                    </span>
                                </div>

                                {delivery.status !== 'completed' && (
                                    <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Cylinder Type (14.2kg / Commercial / 5kg)
                                            </label>
                                            <select
                                                value={sel.cylinderType || '14KG_HP'}
                                                onChange={(e) => setAssignments({
                                                    ...assignments,
                                                    [delivery.id]: { ...sel, cylinderType: e.target.value as CylinderType }
                                                })}
                                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                {CYLINDER_TYPES.map((type) => (
                                                    <option key={type} value={type}>
                                                        {CYLINDER_TYPE_LABELS[type]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Select Delivery Boy
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {deliveryBoys.map((boy) => (
                                                    <button
                                                        key={boy.uid}
                                                        type="button"
                                                        onClick={() => setAssignments({
                                                            ...assignments,
                                                            [delivery.id]: { ...sel, boyUid: boy.uid }
                                                        })}
                                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                                            sel.boyUid === boy.uid
                                                                ? 'bg-primary-600 text-white border-primary-600'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {boy.name}
                                                    </button>
                                                ))}
                                                {deliveryBoys.length === 0 && (
                                                    <p className="text-xs text-red-500">No active delivery boys registered in database.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                                Select Vehicle
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {vehicles.map((v) => (
                                                    <button
                                                        key={v.id}
                                                        type="button"
                                                        onClick={() => setAssignments({
                                                            ...assignments,
                                                            [delivery.id]: { ...sel, vehicleId: v.id }
                                                        })}
                                                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                                            sel.vehicleId === v.id
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {v.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleCancelDelivery(delivery.id)}
                                            >
                                                Cancel Request
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAssign(delivery.id)}
                                                disabled={submittingId === delivery.id}
                                            >
                                                {submittingId === delivery.id ? 'Assigning...' : 'Assign Delivery'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AssignDeliveryPage;
