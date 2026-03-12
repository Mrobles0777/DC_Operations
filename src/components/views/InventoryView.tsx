import { useState } from 'react'
import { Database, Trash2, Box, Plus, ChevronRight, Layout } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { RackLayout } from '../RackLayout'
import { RackAsset } from '../../utils/excelUtils'

interface InventoryViewProps {
    assets: RackAsset[]
    selectedRack: RackAsset | null
    setSelectedRack: (rack: RackAsset | null) => void
    setShowClearAllConfirm: (show: boolean) => void
    setAssetToDelete: (asset: RackAsset | null) => void
    setShowDeleteConfirm: (show: boolean) => void
    setActiveTab: (tab: string) => void
}

export const InventoryView = ({
    assets,
    selectedRack,
    setSelectedRack,
    setShowClearAllConfirm,
    setAssetToDelete,
    setShowDeleteConfirm,
    setActiveTab
}: InventoryViewProps) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(true);

    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1 relative">
                {/* List Panel */}
                <motion.section 
                    animate={{ width: isDetailsOpen ? '35%' : '100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="glass-card bg-white border-slate-200/60 p-5 overflow-hidden flex flex-col shadow-sm min-h-[400px] z-10"
                >
                    <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <Database size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Activos</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{assets.length} Racks Registrados</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                            <button
                                onClick={() => setActiveTab('assetentry')}
                                className="flex-1 xl:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-black shadow-lg shadow-blue-200 active:scale-95"
                            >
                                <Plus size={16} />
                                NUEVO
                            </button>
                            
                            {!isDetailsOpen && selectedRack && (
                                <button
                                    onClick={() => setIsDetailsOpen(true)}
                                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-black shadow-lg active:scale-95"
                                >
                                    <Layout size={16} />
                                    DETALLES
                                </button>
                            )}

                            {assets.length > 0 && (
                                <button
                                    onClick={() => setShowClearAllConfirm(true)}
                                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl border border-red-100 transition-all active:scale-95"
                                    title="Borrar Todo"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1 w-full custom-scrollbar">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] sticky top-0">
                                <tr>
                                    <th className="py-3 px-4">Identificador</th>
                                    <th className="py-3 px-4">Localización</th>
                                    <th className="py-3 px-4 text-center">Carga</th>
                                    <th className="py-3 px-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {assets.map((asset) => {
                                    const isSelected = selectedRack?.id === asset.id;
                                    return (
                                        <tr
                                            key={asset.id}
                                            onClick={() => {
                                                setSelectedRack(asset);
                                                if (!isDetailsOpen) setIsDetailsOpen(true);
                                            }}
                                            className={`transition-all group cursor-pointer border-l-4 ${isSelected ? 'bg-blue-50/40 border-l-blue-600' : 'hover:bg-slate-50/80 border-l-transparent'}`}
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col">
                                                    <span className={`font-black font-mono text-sm ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{asset.tag_id}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{asset.type || 'RACK'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-600 font-black uppercase">{asset.sitio || 'GENERAL'}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold">{asset.sala || 'SALA N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {asset.devices.length} EQ
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setShowDeleteConfirm(true); }}
                                                    className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.section>

                {/* Details Panel */}
                <AnimatePresence mode="wait">
                    {isDetailsOpen && (
                        <motion.div 
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1, width: '65%' }}
                            exit={{ x: 300, opacity: 0, width: '0%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="flex flex-col h-full overflow-hidden bg-slate-50/30 rounded-3xl border border-slate-200/50 relative"
                        >
                            {/* Collapse Button */}
                            <button 
                                onClick={() => setIsDetailsOpen(false)}
                                className="absolute top-6 -left-3 z-20 w-8 h-8 bg-white border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90"
                            >
                                <ChevronRight size={18} />
                            </button>

                            {selectedRack ? (
                                <div className="h-full overflow-hidden">
                                    <RackLayout rack={selectedRack} hideHeader={true} />
                                </div>
                            ) : (
                                <div className="flex-1 glass-card bg-white border-slate-200/60 flex flex-col items-center justify-center text-slate-300 m-4 border-dashed border-2 rounded-[2rem]">
                                    <Box size={64} className="mb-6 opacity-10" />
                                    <p className="font-black text-xs uppercase tracking-[0.4em] text-slate-400">Seleccione un Rack</p>
                                    <p className="text-[10px] text-slate-400 uppercase mt-4 tracking-widest font-bold opacity-60">Para visualizar el digital twin y sensores</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
