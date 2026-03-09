import { Database, Trash2, Box } from 'lucide-react'
import { RackLayout } from '../RackLayout'
import { RackAsset } from '../../utils/excelUtils'

interface InventoryViewProps {
    assets: RackAsset[]
    selectedRack: RackAsset | null
    setSelectedRack: (rack: RackAsset | null) => void
    setShowClearAllConfirm: (show: boolean) => void
    setAssetToDelete: (asset: RackAsset | null) => void
    setShowDeleteConfirm: (show: boolean) => void
}

export const InventoryView = ({
    assets,
    selectedRack,
    setSelectedRack,
    setShowClearAllConfirm,
    setAssetToDelete,
    setShowDeleteConfirm
}: InventoryViewProps) => {
    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row gap-6 min-h-0 flex-1">
                <section className="glass-card bg-white border-slate-200/60 flex-1 p-4 md:p-8 overflow-hidden flex flex-col shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            <Database className="text-blue-600" />
                            Lista de Activos
                        </h3>
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
                    <div className="overflow-x-auto flex-1 w-full">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-widest sticky top-0">
                                <tr>
                                    <th className="pb-4 px-4">Tag ID</th>
                                    <th className="pb-4 px-4">Sitio</th>
                                    <th className="pb-4 px-4">Fabricante</th>
                                    <th className="pb-4 px-4">Modelo</th>
                                    <th className="pb-4 px-4">Dispositivos</th>
                                    <th className="pb-4 px-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {assets.map((asset) => {
                                    const isSelected = selectedRack?.id === asset.id;
                                    return (
                                        <tr
                                            key={asset.id}
                                            onClick={() => setSelectedRack(asset)}
                                            className={`transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                        >
                                            <td className={`py-5 px-4 font-bold font-mono ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{asset.tag_id}</td>
                                            <td className="py-5 px-4 text-slate-500 font-bold text-xs">{asset.sitio || 'N/A'}</td>
                                            <td className="py-5 px-4 text-slate-500">{asset.fabricante}</td>
                                            <td className="py-5 px-4 text-slate-500">{asset.modelo}</td>
                                            <td className="py-5 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                                                    {asset.devices.length} Units
                                                </span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setAssetToDelete(asset); setShowDeleteConfirm(true); }}
                                                        className="p-2 hover:bg-red-600/20 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={18} />
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

                <div className="flex-1 flex flex-col h-full overflow-hidden">
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
