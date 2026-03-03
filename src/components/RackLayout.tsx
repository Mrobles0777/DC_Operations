import { motion } from 'framer-motion'
import { Server, Zap, Activity } from 'lucide-react'
import { RackAsset, U_TOTAL } from '../utils/excelUtils'

interface RackLayoutProps {
    rack: RackAsset
    onClose?: () => void
    hideHeader?: boolean
}

export const RackLayout = ({ rack, hideHeader = false }: RackLayoutProps) => {
    // Sort devices by U position (descending for display)
    const sortedDevices = [...rack.devices].sort((a, b) => (b.u_position || 0) - (a.u_position || 0))

    return (
        <div className={`flex flex-col gap-6 h-full ${!hideHeader ? 'p-6 glass-card bg-slate-900/40 border-white/5' : ''}`}>
            {!hideHeader && (
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm shadow-lg shadow-blue-900/40">RK</div>
                            {rack.tag_id}
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">{rack.fabricante} {rack.modelo} | {rack.sala}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            {rack.estado || 'Operativo'}
                        </div>
                        {rack.consumo !== undefined && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Consumo</span>
                                <span className="text-xs font-bold text-blue-400">
                                    {rack.consumo} KW
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 flex gap-8 overflow-hidden">
                {/* Rack Visualizer */}
                <div className="relative w-64 bg-slate-800 rounded-lg border-x-4 border-slate-700 shadow-2xl flex flex-col p-1 overflow-y-auto max-h-[700px]">
                    {/* U units rendering */}
                    {Array.from({ length: U_TOTAL }).map((_, i) => {
                        const uNumber = U_TOTAL - i
                        const deviceAtU = rack.devices.find(d => d.u_position === uNumber)

                        return (
                            <div
                                key={uNumber}
                                className={`h-6 w-full border-b border-white/5 flex items-center px-2 relative transition-all ${deviceAtU ? 'bg-blue-600/20 z-10' : 'hover:bg-white/5'
                                    }`}
                            >
                                <span className="text-[8px] text-slate-600 font-mono absolute left-0.5">{uNumber}</span>
                                {deviceAtU && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="w-full h-full bg-blue-500/40 border border-blue-400/30 rounded flex items-center px-2 gap-2 overflow-hidden"
                                    >
                                        <Server size={10} className="text-blue-300" />
                                        <span className="text-[10px] font-bold text-white truncate">{deviceAtU.type} - {deviceAtU.modelo}</span>
                                    </motion.div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Details Panel */}
                <div className="flex-1 space-y-4 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={16} /> Dispositivos
                    </h4>
                    <div className="space-y-3">
                        {sortedDevices.map((dev) => (
                            <div key={dev.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-white font-bold flex items-center gap-2">
                                            <span className="text-xs font-mono bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded">U{dev.u_position}</span>
                                            {dev.type.toUpperCase()}
                                        </p>
                                        <p className="text-slate-400 text-sm font-medium">{dev.fabricante} {dev.modelo}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                            <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                <Activity size={10} className="text-slate-600" /> {dev.serie || 'S/N N/A'}
                                            </p>
                                            {dev.ip_gestion && (
                                                <p className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                                                    <Zap size={10} /> {dev.ip_gestion}
                                                </p>
                                            )}
                                            {dev.watts && (
                                                <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                                                    {dev.watts} W
                                                </p>
                                            )}
                                        </div>
                                        {(dev.owner || dev.contrato) && (
                                            <div className="mt-2 flex gap-3">
                                                {dev.owner && (
                                                    <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-400 uppercase tracking-tighter">
                                                        {dev.owner}
                                                    </span>
                                                )}
                                                {dev.contrato && (
                                                    <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-300 uppercase tracking-tighter">
                                                        {dev.contrato}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <Zap size={14} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {sortedDevices.length === 0 && (
                            <div className="py-20 text-center text-slate-600 border-2 border-dashed border-white/5 rounded-2xl">
                                <p>Rack vacío</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
