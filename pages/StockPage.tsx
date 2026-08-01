import React, { useState, useEffect } from 'react';
import { listStockLocations, listStockTransactions, transferStock, adjustStock, recordAgencyStockSupply } from '../services/api';
import { StockLocation, StockTransaction, CylinderType, CYLINDER_TYPES, CYLINDER_TYPE_LABELS, DOMESTIC_14KG_CYLINDERS } from '../types';
import { AGENCIES } from '../constants';
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
    const [filterBrand, setFilterBrand] = useState<string>('all');

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

    // Agency Stock Supply modal state
    const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
    const [agencyName, setAgencyName] = useState<string>(AGENCIES[0] || 'Agency');
    const [agencyToLocId, setAgencyToLocId] = useState<string>('main_godown');
    const [agencyCylinderType, setAgencyCylinderType] = useState<CylinderType>('14KG_HP');
    const [agencyFilledCount, setAgencyFilledCount] = useState<number>(100);
    const [agencyEmptyCount, setAgencyEmptyCount] = useState<number>(0);
    const [agencyNote, setAgencyNote] = useState<string>('');
    const [isAgencySubmitting, setIsAgencySubmitting] = useState(false);

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

    const handleAgencySupply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (agencyFilledCount <= 0 && agencyEmptyCount <= 0) {
            alert("Please enter a valid count for cylinders received.");
            return;
        }

        setIsAgencySubmitting(true);
        try {
            await recordAgencyStockSupply({
                toLocationId: agencyToLocId,
                agencyName,
                cylinderType: agencyCylinderType,
                filledCount: Number(agencyFilledCount),
                emptyCount: Number(agencyEmptyCount),
                note: agencyNote,
            });
            alert("Agency stock supply recorded successfully!");
            setIsAgencyModalOpen(false);
            setAgencyNote('');
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Failed to record agency stock supply.");
        } finally {
            setIsAgencySubmitting(false);
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
        return (
            <div className="flex items-center justify-center p-12 text-gray-500 dark:text-gray-400 font-medium">
                {t('messages.loadingTransactions')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stock & Inventory Ledger</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Real-time tracking of filled and empty cylinders across Godowns, Counters, Vehicles, and Agency Inflow.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setIsAgencyModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        + Agency Supply
                    </Button>
                    <Button onClick={() => setIsTransferModalOpen(true)}>
                        Transfer Stock
                    </Button>
                    <Button variant="secondary" onClick={() => setIsAdjustModalOpen(true)}>
                        Audit Adjustment
                    </Button>
                </div>
            </div>

            {/* Total Stock Banner */}
            <div className="bg-slate-900 text-white p-6 rounded-lg border border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Domestic Inventory Overview</span>
                        <h3 className="text-xl font-bold mt-0.5">14.2kg Refill Ledger</h3>
                    </div>
                    <div className="flex gap-6 bg-slate-800/80 px-5 py-3 rounded-md border border-slate-700">
                        <div>
                            <span className="block text-xs text-slate-400 font-medium">Total Filled</span>
                            <span className="text-xl font-bold text-emerald-400">{total14kgStock.filled} units</span>
                        </div>
                        <div className="border-r border-slate-700 h-8 my-auto"></div>
                        <div>
                            <span className="block text-xs text-slate-400 font-medium">Total Empties</span>
                            <span className="text-xl font-bold text-amber-400">{total14kgStock.empty} units</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {locations.map((loc) => (
                    <div key={loc.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
                        <div className="flex justify-between items-center border-b pb-2 border-gray-100 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                                <span className={`w-2 h-2 rounded-full ${loc.type === 'vehicle' ? 'bg-amber-500' : 'bg-blue-600'}`}></span>
                                {loc.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase font-semibold">
                                {loc.type}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                Cylinder Stock Breakdown
                            </span>
                            {CYLINDER_TYPES.map((type) => {
                                const st = loc.stock?.[type] || { filled: 0, empty: 0 };
                                if (st.filled === 0 && st.empty === 0) return null;
                                return (
                                    <div key={type} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 dark:border-gray-700/50">
                                        <span className="font-medium text-gray-700 dark:text-gray-300">{CYLINDER_TYPE_LABELS[type]}</span>
                                        <div className="flex gap-2">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{st.filled} F</span>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stock Movement Log</h3>
                    <div className="flex gap-2">
                        <select
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All Brands & Types</option>
                            <option value="all_14kg">14.2kg Domestic Only</option>
                            {CYLINDER_TYPES.map(t => (
                                <option key={t} value={t}>{CYLINDER_TYPE_LABELS[t]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3">Date & Time</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Cylinder Type</th>
                                <th className="px-4 py-3 text-right">Filled Delta</th>
                                <th className="px-4 py-3 text-right">Empty Delta</th>
                                <th className="px-4 py-3">Note / Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {transactions
                                .filter(tx => {
                                    if (filterBrand === 'all_14kg') return DOMESTIC_14KG_CYLINDERS.includes(tx.cylinderType);
                                    if (filterBrand !== 'all') return tx.cylinderType === filterBrand;
                                    return true;
                                })
                                .slice(0, 40)
                                .map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                                            {new Date(tx.createdAt).toLocaleString(locale)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                                tx.type === 'agency_supply' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                                tx.type === 'transfer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                                tx.type === 'delivery' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' :
                                                'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                                            }`}>
                                                {tx.type === 'agency_supply' ? 'AGENCY SUPPLY' : tx.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {CYLINDER_TYPE_LABELS[tx.cylinderType] || tx.cylinderType}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${tx.filledDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : tx.filledDelta < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                                            {tx.filledDelta > 0 ? `+${tx.filledDelta}` : tx.filledDelta}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${tx.emptyDelta > 0 ? 'text-amber-600 dark:text-amber-400' : tx.emptyDelta < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                                            {tx.emptyDelta > 0 ? `+${tx.emptyDelta}` : tx.emptyDelta}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                                            {tx.agencyName && <span className="font-semibold text-gray-800 dark:text-gray-200 block">{tx.agencyName}</span>}
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

            {/* Receive Agency Stock Modal */}
            <Modal isOpen={isAgencyModalOpen} onClose={() => setIsAgencyModalOpen(false)} title="Receive Stock from Agency / Supplier">
                <form onSubmit={handleAgencySupply} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Supplier / Agency Name
                        </label>
                        <select
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                        >
                            {AGENCIES.map(agency => (
                                <option key={agency} value={agency}>{agency}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Receiving Destination
                            </label>
                            <select
                                value={agencyToLocId}
                                onChange={(e) => setAgencyToLocId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
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
                                value={agencyCylinderType}
                                onChange={(e) => setAgencyCylinderType(e.target.value as CylinderType)}
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
                            >
                                {CYLINDER_TYPES.map(type => (
                                    <option key={type} value={type}>{CYLINDER_TYPE_LABELS[type]}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Filled Cylinders Received"
                            type="number"
                            min="0"
                            value={agencyFilledCount}
                            onChange={(e) => setAgencyFilledCount(Number(e.target.value))}
                            required
                        />
                        <Input
                            label="Empty Cylinders Received (Optional)"
                            type="number"
                            min="0"
                            value={agencyEmptyCount}
                            onChange={(e) => setAgencyEmptyCount(Number(e.target.value))}
                        />
                    </div>

                    <Input
                        label="Challan No / Invoice / Note (Optional)"
                        placeholder="e.g. Invoice #10423 from Parvati HP Gas"
                        value={agencyNote}
                        onChange={(e) => setAgencyNote(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsAgencyModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isAgencySubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isAgencySubmitting ? 'Saving...' : 'Record Agency Supply'}
                        </Button>
                    </div>
                </form>
            </Modal>

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
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
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
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
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
                                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
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
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
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
                            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white text-sm"
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
