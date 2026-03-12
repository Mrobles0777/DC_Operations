import { motion } from 'framer-motion'
import { Database, Box, Activity, Zap, Search, AlertTriangle } from 'lucide-react'
import { RackLayout } from '../RackLayout'
import { RackAsset, U_TOTAL } from '../../utils/excelUtils'

interface DashboardViewProps {
    stats: any
    assets: RackAsset[]
    selectedSite: string
    setSelectedSite: (site: string) => void
    availableSites: string[]
    dashboardSearch: string
    setDashboardSearch: (search: string) => void
    dashboardSort: 'id' | 'usage' | 'power'
    setDashboardSort: (sort: 'id' | 'usage' | 'power') => void
    dashboardSelectedRack: RackAsset | null
    setDashboardSelectedRack: (rack: RackAsset | null) => void
    openRackDetail: (rack: RackAsset) => void
}

export const DashboardView = ({
    stats,
    assets,
    selectedSite,
    setSelectedSite,
    availableSites,
    dashboardSearch,
    setDashboardSearch,
    dashboardSort,
    setDashboardSort,
    dashboardSelectedRack,
    setDashboardSelectedRack,
    openRackDetail
}: DashboardViewProps) => {
    return (
        <>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Filtrar por Sitio:</span>
                    <select
                        value={selectedSite}
                        onChange={(e) => setSelectedSite(e.target.value)}
                        className="bg-slate-50 border-none rounded-lg px-4 py-2 text-sm text-blue-600 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                        <option value="all">Todos los Sitios</option>
                        {availableSites.map(site => (
                            <option key={site} value={site}>{site}</option>
                        ))}
                    </select>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                    Mostrando <span className="text-blue-600 font-bold">{stats.totalRacks}</span> de <span className="text-slate-900">{assets.length}</span> racks
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Racks', value: stats.totalRacks.toString(), icon: Box, color: 'blue' },
                    { label: 'Consumo Total', value: `${stats.totalConsumptionKW.toFixed(2)} KW`, icon: Zap, color: 'blue' },
                    { label: 'Ocupación Global', value: `${stats.usagePercent}%`, icon: Activity, color: 'blue' },
                    { label: 'UR Libres Site', value: `${(stats.totalRacks * U_TOTAL - stats.filteredAssets.reduce((a: any, r: any) => a + r.devices.reduce((d: any, dv: any) => d + (dv.u_height || 1), 0), 0))} UR`, icon: Database, color: 'emerald' },
                ].map((stat) => (
                    <div key={stat.label} className="p-6 glass-card bg-white border-slate-200/60 flex items-center gap-4">
                        <div className={`w-12 h-12 ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} rounded-xl flex items-center justify-center`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                <div className="glass-card p-6 bg-white border-slate-200/60 flex-[3] flex flex-col min-h-0 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-3 uppercase tracking-[0.3em]">
                                    <Activity className="text-blue-600" size={18} />
                                    Inventory Analytics
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest opacity-60">Real-time status monitor per unit</p>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-56">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Quick Search..."
                                        value={dashboardSearch}
                                        onChange={(e) => setDashboardSearch(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500/50 outline-none transition-all font-mono"
                                    />
                                </div>
                                <select
                                    value={dashboardSort}
                                    onChange={(e) => setDashboardSort(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] text-blue-600 font-black outline-none cursor-pointer hover:border-blue-400/50 transition-all uppercase tracking-tighter font-mono shadow-sm"
                                >
                                    <option value="id">SORT: ID</option>
                                    <option value="usage">SORT: USAGE</option>
                                    <option value="power">SORT: LOAD</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-auto pr-2 custom-scrollbar pb-4 min-h-0 flex-1">
                            {stats.filteredAssets
                                .filter((r: any) =>
                                    r.tag_id.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                                    (r.sala || '').toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                                    (r.sitio || '').toLowerCase().includes(dashboardSearch.toLowerCase())
                                )
                                .sort((a: any, b: any) => {
                                    if (dashboardSort === 'usage') {
                                        const useA = a.devices.reduce((acc: any, d: any) => acc + (d.u_height || 1), 0);
                                        const useB = b.devices.reduce((acc: any, d: any) => acc + (d.u_height || 1), 0);
                                        return useB - useA;
                                    }
                                    if (dashboardSort === 'power') return (b.consumo || 0) - (a.consumo || 0);
                                    return a.tag_id.localeCompare(b.tag_id);
                                })
                                .map((rack: any) => {
                                    const usedU = rack.devices.reduce((acc: any, d: any) => acc + (d.u_height || 1), 0);
                                    const uPercent = (usedU / U_TOTAL) * 100;
                                    const statusColor = rack.estado?.toUpperCase() === 'OPERATIVO' ? 'from-emerald-500 to-emerald-600' :
                                        rack.estado?.toUpperCase() === 'VACIO' ? 'from-slate-200 to-slate-300' : 'from-yellow-400 to-orange-400';

                                    const isAlert = uPercent > 90 || rack.alarm_hardware === 1;
                                    const isSelected = dashboardSelectedRack?.id === rack.id;

                                    return (
                                        <motion.div
                                            key={rack.id}
                                            whileHover={{ y: -4, scale: 1.02 }}
                                            onClick={() => setDashboardSelectedRack(rack)}
                                            className={`group relative flex flex-col ${isSelected ? 'bg-slate-900 border-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.2)]' : 'bg-slate-950 border-slate-800'} hover:border-blue-400/50 rounded-xl p-3 transition-all cursor-pointer overflow-hidden shadow-sm`}
                                        >
                                            {isAlert && <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/10 rounded-bl-3xl flex items-start justify-end p-1"><AlertTriangle size={12} className="text-red-500 animate-pulse" /></div>}

                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <span className={`text-[11px] font-black font-mono tracking-tighter ${isSelected ? 'text-blue-400' : 'text-slate-100'} group-hover:text-blue-400 transition-colors`}>{rack.tag_id}</span>
                                                    <span className="text-[7px] text-slate-500 font-black uppercase tracking-tight">{rack.sala}</span>
                                                </div>
                                                <span className={`w-1.5 h-1.5 rounded-full ${rack.estado?.toUpperCase() === 'OPERATIVO' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]'}`}></span>
                                            </div>

                                            <div className="flex-1 flex gap-2 items-end">
                                                <div className="w-2.5 h-16 bg-black/40 rounded-full border border-slate-800 p-0.5 overflow-hidden flex flex-col-reverse relative shadow-inner">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${uPercent}%` }}
                                                        className={`w-full rounded-full bg-gradient-to-t ${statusColor} shadow-sm`}
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col justify-end">
                                                    <p className="text-[14px] font-black text-slate-100 leading-none font-mono">
                                                        {uPercent.toFixed(0)}<span className="text-[8px] text-blue-400 ml-0.5">%</span>
                                                    </p>
                                                    <p className="text-[7px] text-slate-500 font-black uppercase mt-1">OCCUPANCY</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-white border-slate-200/60 w-full lg:flex-[1.5] flex flex-col min-h-0 shadow-2xl relative overflow-hidden group/preview">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent pointer-events-none"></div>

                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                <Box size={16} className="text-blue-600" />
                                Visual Digital Twin
                            </h4>
                            {dashboardSelectedRack && (
                                <button
                                    onClick={() => openRackDetail(dashboardSelectedRack)}
                                    className="p-2 hover:bg-slate-50 rounded-lg text-blue-600 hover:text-blue-700 transition-colors border border-slate-100"
                                    title="Open Detailed View"
                                >
                                    <Activity size={16} />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
                            {dashboardSelectedRack ? (
                                <div className="h-full flex flex-col mt-2">
                                    <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                                        <div>
                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Active Selector</p>
                                            <p className="text-lg font-black text-slate-900 tracking-tighter uppercase font-mono">{dashboardSelectedRack.tag_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest text-right">Site</p>
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{dashboardSelectedRack.sitio}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <RackLayout rack={dashboardSelectedRack} hideHeader={true} isCompact={true} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4 opacity-30 group-hover/preview:opacity-50 transition-opacity">
                                    <div className="w-16 h-16 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                                        <Box size={32} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">No Selection</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-loose">Select a rack from the capacity monitor to initialize the digital twin projection</p>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
            </div>
        </>
    )
}
