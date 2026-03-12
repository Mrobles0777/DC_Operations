import { Database, Trash2, Box, Plus } from 'lucide-react'
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
    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
                <section className="glass-card bg-white border-slate-200/60 w-full lg:w-[35%] p-4 overflow-hidden flex flex-col shadow-sm min-h-[400px]">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <Database className="text-blue-600" />
                            Lista de Activos
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('assetentry')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-200"
                            >
                                <Plus size={16} />
                                Carga Manual
                            </button>
                            {assets.length > 0 && (
                                <button
                                    onClick={() => setShowClearAllConfirm(true)}
                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all flex items-center gap-2 text-sm font-bold"
                                >
                                    <Trash2 size={16} />
                                    Borrar Todo
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto flex-1 w-full">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest sticky top-0">
                                <tr>
                                    <th className="py-2 px-3">Tag ID</th>
                                    <th className="py-2 px-3">Sitio</th>
                                    <th className="py-2 px-3">Dispositivos</th>
                                    <th className="py-2 px-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {assets.map((asset) => {
                                    const isSelected = selectedRack?.id === asset.id;
                                    return (
                                        <tr
                                            key={asset.id}
                                            onClick={() => setSelectedRack(asset)}
                                            className={`transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                        >
                                            <td className={`py-3 px-3 font-bold font-mono text-xs ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{asset.tag_id}</td>
                                            <td className="py-3 px-3 text-slate-500 font-bold text-[10px]">{asset.sitio || 'N/A'}</td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {asset.devices.length} Units
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setShowDeleteConfirm(true); }}
                                                        className="p-1 hover:bg-red-600/20 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="lg:w-[65%] flex flex-col h-full overflow-hidden bg-slate-50/30 rounded-2xl border border-slate-200/50">
                    {selectedRack ? (
                        <div className="h-full overflow-hidden">
                            <RackLayout rack={selectedRack} hideHeader={true} />
                        </div>
                    ) : (
                        <div className="flex-1 glass-card bg-white border-slate-200/60 flex flex-col items-center justify-center text-slate-300 border-dashed border-2">
                            <Box size={48} className="mb-4 opacity-20" />
                            <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">Select a rack unit</p>
                            <p className="text-[9px] text-slate-400 uppercase mt-2 tracking-widest font-bold">To initialize the hardware registry map</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
