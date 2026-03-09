import { Map as MapIcon, X } from 'lucide-react'
import { FloorPlan } from '../FloorPlan'
import { RackAsset } from '../../utils/excelUtils'

interface FloorPlanViewProps {
    viewingSite: string | null
    setViewingSite: (site: string | null) => void
    viewingSala: string | null
    setViewingSala: (sala: string | null) => void
    availableSites: string[]
    assets: RackAsset[]
    selectedRack: RackAsset | null
    setSelectedRack: (rack: RackAsset | null) => void
    dynamicRoom: any
    updateAssetDevices: (rackId: string, devices: any[]) => void
}

export const FloorPlanView = ({
    viewingSite,
    setViewingSite,
    viewingSala,
    setViewingSala,
    availableSites,
    assets,
    selectedRack,
    setSelectedRack,
    dynamicRoom,
    updateAssetDevices
}: FloorPlanViewProps) => {
    return (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
            {/* Breadcrumbs / Navigation Header */}
            <div className="flex items-center gap-3 mb-2">
                <button
                    onClick={() => { setViewingSite(null); setViewingSala(null); setSelectedRack(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!viewingSite ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'} `}
                >
                    SITIOS
                </button>
                {viewingSite && (
                    <>
                        <span className="text-slate-300">/</span>
                        <button
                            onClick={() => { setViewingSala(null); setSelectedRack(null); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewingSite && !viewingSala ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'} `}
                        >
                            {viewingSite}
                        </button>
                    </>
                )}
                {viewingSala && (
                    <>
                        <span className="text-slate-300">/</span>
                        <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold uppercase">
                            {viewingSala}
                        </span>
                    </>
                )}
            </div>

            {!viewingSite ? (
                /* Site Selection Grid */
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {availableSites.length > 0 ? (
                        availableSites.map(site => (
                            <button
                                key={site}
                                onClick={() => setViewingSite(site)}
                                className="glass-card p-8 bg-white border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 group shadow-sm"
                            >
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                    <MapIcon size={32} />
                                </div>
                                <div className="text-center">
                                    <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-widest">{site}</h4>
                                    <p className="text-slate-500 text-xs mt-2 font-mono">
                                        {assets.filter(a => a.sitio === site).length} RACKS
                                    </p>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <MapIcon size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest">No hay sitios registrados</p>
                            <p className="text-slate-400 text-xs mt-2">Importa datos para comenzar</p>
                        </div>
                    )}
                </div>
            ) : !viewingSala ? (
                /* Sala Selection Grid */
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from(new Set(assets.filter(a => a.sitio === viewingSite).map(a => a.sala))).map(sala => (
                        <button
                            key={sala}
                            onClick={() => setViewingSala(sala || 'Desconocida')}
                            className="glass-card p-8 bg-white border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 group shadow-sm"
                        >
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <Box size={32} />
                            </div>
                            <div className="text-center">
                                <h4 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors uppercase tracking-widest">{sala || 'Desconocida'}</h4>
                                <p className="text-slate-500 text-xs mt-2 font-mono">
                                    {assets.filter(a => a.sitio === viewingSite && a.sala === (sala || 'Desconocida')).length} RACKS
                                </p>
                            </div>
                        </button>
                    ))}
                    <button
                        onClick={() => setViewingSite(null)}
                        className="glass-card p-8 bg-slate-50/50 border-dashed border-2 border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-all flex flex-col items-center justify-center gap-2 group"
                    >
                        <X size={24} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Atrás a Sitios</span>
                    </button>
                </div>
            ) : (
                /* Interactive Floor Plan */
                <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <MapIcon size={20} className="text-blue-600" />
                                {dynamicRoom.name}
                            </h3>
                            <p className="text-[9px] text-slate-400 font-black uppercase mt-1 tracking-widest">Visualización interactiva de activos en tiempo real</p>
                        </div>
                        <button
                            onClick={() => { setViewingSala(null); setSelectedRack(null); }}
                            className="px-4 py-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                            <X size={16} />
                            Salir del Plano
                        </button>
                    </div>
                    <div className="flex-1 p-6 overflow-hidden">
                        <FloorPlan
                            assets={assets.filter(a => a.sitio === viewingSite && a.sala === viewingSala)}
                            room={dynamicRoom}
                            onSelectRack={setSelectedRack}
                            selectedRackId={selectedRack?.id}
                            onSaveChanges={updateAssetDevices}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

const Box = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </svg>
)
