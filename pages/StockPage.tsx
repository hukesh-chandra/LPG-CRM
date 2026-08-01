import React, { useState, useEffect } from 'react';
import { listStockLocations, listStockTransactions, transferStock, adjustStock } from '../services/api';
import { StockLocation, StockTransaction, CylinderType, CYLINDER_TYPES, CYLINDER_TYPE_LABELS, DOMESTIC_14KG_CYLINDERS } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { useLanguage } from '../contexts/LanguageContext';

export const StockPage: React.FC = () => {
    const { t, language } = useLanguage();
    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

    const [locations, setLocations] = useState<StockLocation[]>([]);
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterBrand, setFilterBrand] = useState<string>('all_14kg');

    // Transfer modal state
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferCylinderType, setTransferCylinderType] = useState<CylinderType>('14KG_HP');
    const [fromLocId, setFromLocId] = useState<string>('main_godown');
    const [toLocId, setToLocId] = useState<string>('vehicle_1');
    const [filledCount, setFilledCount] = useState<number>(10);
    const [emptyCount, setEmptyCount] = useState<number>(0);
    const [transferNote, setTransferNote] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState(false);

    // Adjustment modal state
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustLocId, setAdjustLocId] = useState<string>('main_godown');
    const [adjustCylinderType, setAdjustCylinderType] = useState<CylinderType>('14KG_HP');
    const [adjustFilledDelta, setAdjustFilledDelta] = useState<number>(0);
    const [adjustEmptyDelta, setAdjustEmptyDelta] = useState<number>(0);
    const [adjustNote, setAdjustNote] = useState<string>('');
    const [isAdjusting, setIsAdjusting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [locs, txs] = await Promise.all([
                listStockLocations(),
                listStockTransactions(100),
            ]);
            setLocations(locs);
            setTransactions(txs);
        } catch (err) {
            console.error("Failed loading stock data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fromLocId === toLocId) {
            alert("Source and destination locations cannot be the same.");
            return;
        }
        if (filledCount <= 0 && emptyCount <= 0) {
            alert("Please enter a valid count for filled or empty cylinders to transfer.");
            return;
        }

        setIsTransferring(true);
        try {
            await transferStock({
                cylinderType: transferCylinderType,
                fromLocationId: fromLocId,
                toLocationId: toLocId,
                filledCount: Number(filledCount),
                emptyCount: Number(emptyCount),
                note: transferNote,
            });
            alert("Stock transferred successfully!");
            setIsTransferModalOpen(false);
            setTransferNote('');
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Failed to transfer stock.");
        } finally {
            setIsTransferring(false);
        }
    };

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adjustFilledDelta === 0 && adjustEmptyDelta === 0) {
            alert("Please enter a non-zero delta for filled or empty cylinders.");
            return;
        }

        setIsAdjusting(true);
        try {
            await adjustStock({
                locationId: adjustLocId,
                cylinderType: adjustCylinderType,
                filledDelta: Number(adjustFilledDelta),
                emptyDelta: Number(adjustEmptyDelta),
                note: adjustNote,
            });
            alert("Stock adjustment recorded!");
            setIsAdjustModalOpen(false);
            setAdjustNote('');
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Failed to adjust stock.");
        } finally {
            setIsAdjusting(false);
        }
    };

    // Total 14.2kg stock calculation
    const total14kgStock = locations.reduce((acc, loc) => {
        DOMESTIC_14KG_CYLINDERS.forEach(type => {
            const s = loc.stock?.[type] || { filled: 0, empty: 0 };
            acc.filled += s.filled || 0;
            acc.empty += s.empty || 0;
        });
        return acc;
    }, { filled: 0, empty: 0 });

    if (loading) {
        return <div className="text-center p-8">{t('messages.loadingTransactions')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Stock & Inventory Ledger</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Real-time tracking of filled and empty cylinders across Godowns, Counters, and Delivery Vehicles.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsTransferModalOpen(true)}>
                        Transfer Stock
                    </Button>
                    <Button variant="secondary" onClick={() => setIsAdjustModalOpen(true)}>
                        Audit Adjustment
                    </Button>
                </div>
            </div>

            {/* 14.2kg Summary Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Total 14.2kg Stock Overview</span>
                        <h3 className="text-2xl font-extrabold mt-1">14.2kg Refill Ledger</h3>
                    </div>
                    <div className="flex gap-6 bg-white/10 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
                        <div>
                            <span className="block text-xs text-blue-200">Total Filled</span>
                            <span className="text-2xl font-bold text-green-300">{total14kgStock.filled} units</span>
                        </div>
                        <div className="border-r border-white/20 h-10 my-auto"></div>
                        <div>
                            <span className="block text-xs text-blue-200">Total Empties</span>
                            <span className="text-2xl font-bold text-yellow-300">{total14kgStock.empty} units</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {locations.map((loc) => (
                    <div key={loc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${loc.type === 'vehicle' ? 'bg-orange-500' : 'bg-blue-500'}`}></span>
                                {loc.name}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase font-semibold">
                                {loc.type}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                                14.2kg Cylinders
                            </span>
                            {DOMESTIC_14KG_CYLINDERS.map((type) => {
                                const st = loc.stock?.[type] || { filled: 0, empty: 0 };
                                return (
                                    <div key={type} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 dark:border-gray-700/50">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{CYLINDER_TYPE_LABELS[type]}</span>
                                        <div className="flex gap-3">
                                            <span className="text-green-600 dark:text-green-400 font-semibold">{st.filled} F</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{st.empty} E</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Stock Log Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Stock Movement Log</h3>
                    <div className="flex gap-2">
                        <select
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        >
                            <option value="all">All Brands & Types</option>
                            <option value="all_14kg">14.2kg Cylinders Only</option>
                            {CYLINDER_TYPES.map(t => (
                                <option key={t} value={t}>{CYLINDER_TYPE_LABELS[t]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Date & Time</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Cylinder Brand</th>
                                <th className="px-4 py-3 text-right">Filled Delta</th>
                                <th className="px-4 py-3 text-right">Empty Delta</th>
                                <th className="px-4 py-3">Note / Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {transactions
                                .filter(tx => {
                                    if (filterBrand === 'all_14kg') return DOMESTIC_14KG_CYLINDERS.includes(tx.cylinderType);
                                    if (filterBrand !== 'all') return tx.cylinderType === filterBrand;
                                    return true;
                                })
                                .slice(0, 30)
                                .map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                                            {new Date(tx.createdAt).toLocaleString(locale)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                                tx.type === 'transfer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                                tx.type === 'delivery' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                                                'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                            }`}>
                                                {tx.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {CYLINDER_TYPE_LABELS[tx.cylinderType] || tx.cylinderType}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${tx.filledDelta > 0 ? 'text-green-600' : tx.filledDelta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {tx.filledDelta > 0 ? `+${tx.filledDelta}` : tx.filledDelta}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${tx.emptyDelta > 0 ? 'text-amber-600' : tx.emptyDelta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                            {tx.emptyDelta > 0 ? `+${tx.emptyDelta}` : tx.emptyDelta}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                                            {tx.note || 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-6 text-gray-400">
                                        No stock movements logged yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transfer Stock Modal */}
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transfer Stock Between Locations">
                <form onSubmit={handleTransfer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cylinder Type
                        </label>
                        <select
                            value={transferCylinderType}
                            onChange={(e) => setTransferCylinderType(e.target.value as CylinderType)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                        >
                            {CYLINDER_TYPES.map(type => (
                                <option key={type} value={type}>{CYLINDER_TYPE_LABELS[type]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                From Location
                            </label>
                            <select
                                value={fromLocId}
                                onChange={(e) => setFromLocId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                            >
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                To Location
                            </label>
                            <select
                                value={toLocId}
                                onChange={(e) => setToLocId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                            >
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Filled Cylinders Count"
                            type="number"
                            min="0"
                            value={filledCount}
                            onChange={(e) => setFilledCount(Number(e.target.value))}
                            required
                        />
                        <Input
                            label="Empty Cylinders Count"
                            type="number"
                            min="0"
                            value={emptyCount}
                            onChange={(e) => setEmptyCount(Number(e.target.value))}
                            required
                        />
                    </div>

                    <Input
                        label="Transfer Remark / Note (Optional)"
                        placeholder="e.g. Loaded onto delivery vehicle"
                        value={transferNote}
                        onChange={(e) => setTransferNote(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsTransferModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isTransferring}>
                            {isTransferring ? 'Transferring...' : 'Execute Transfer'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Audit Adjustment Modal */}
            <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Audit Stock Adjustment">
                <form onSubmit={handleAdjust} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Target Location
                        </label>
                        <select
                            value={adjustLocId}
                            onChange={(e) => setAdjustLocId(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                        >
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cylinder Type
                        </label>
                        <select
                            value={adjustCylinderType}
                            onChange={(e) => setAdjustCylinderType(e.target.value as CylinderType)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                        >
                            {CYLINDER_TYPES.map(type => (
                                <option key={type} value={type}>{CYLINDER_TYPE_LABELS[type]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Filled Delta (+ or -)"
                            type="number"
                            placeholder="e.g. +5 or -2"
                            value={adjustFilledDelta}
                            onChange={(e) => setAdjustFilledDelta(Number(e.target.value))}
                        />
                        <Input
                            label="Empty Delta (+ or -)"
                            type="number"
                            placeholder="e.g. +10 or -3"
                            value={adjustEmptyDelta}
                            onChange={(e) => setAdjustEmptyDelta(Number(e.target.value))}
                        />
                    </div>

                    <Input
                        label="Adjustment Reason / Audit Note"
                        placeholder="e.g. Physical stock count verification"
                        value={adjustNote}
                        onChange={(e) => setAdjustNote(e.target.value)}
                        required
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isAdjusting}>
                            {isAdjusting ? 'Saving...' : 'Apply Adjustment'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default StockPage;
