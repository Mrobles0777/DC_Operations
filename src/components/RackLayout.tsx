import { motion } from 'framer-motion'
import { Server, Zap, Activity, Shield, Box, User, Hash, HardDrive, AlertCircle } from 'lucide-react'
import { useState, useMemo } from 'react'
import { RackAsset } from '../utils/excelUtils'

interface RackLayoutProps {
    rack: RackAsset
    onClose?: () => void
    hideHeader?: boolean
    isCompact?: boolean
}

export const RackLayout = ({ rack, hideHeader = false, isCompact = false }: RackLayoutProps) => {
    const [hoveredDeviceId, setHoveredDeviceId] = useState<string | null>(null)

    // Auto-Positioning Engine: Ensures ALL devices render even if Excel lacks U-positions
    const positionedDevices = useMemo(() => {
        const occupied = new Set<number>();
        const devices = [...rack.devices];

        // 1. Register explicitly positioned devices
        devices.forEach(d => {
            if (d.u_position) {
                for (let i = 0; i < (d.u_height || 1); i++) {
                    occupied.add(d.u_position + i);
                }
            }
        });

        // 2. Auto-assign positions to floating devices
        let availableU = 1;
        return devices.map(dev => {
            if (!dev.u_position) {
                while (occupied.has(availableU)) {
                    availableU++;
                }
                const assignedU = availableU;
                for (let i = 0; i < (dev.u_height || 1); i++) {
                    occupied.add(assignedU + i);
                }
                return { ...dev, u_position: assignedU };
            }
            return dev;
        });
    }, [rack.devices]);

    // Sort devices by U position (descending for display)
    const sortedDevices = [...positionedDevices].sort((a, b) => (b.u_position || 0) - (a.u_position || 0))

    const getStatusColor = () => {
        const hasAlarms = (rack.alarm_hardware === 1) || (rack.alarm_ventilador === 1) || (rack.alarm_fuente === 1) || (rack.alarm_hdd === 1);
        if (hasAlarms) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    };

    const getDeviceIcon = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('servidor') || t.includes('server')) return Server;
        if (t.includes('switch') || t.includes('sw') || t.includes('red') || t.includes('net')) return Activity;
        if (t.includes('pdu') || t.includes('ups') || t.includes('energia') || t.includes('power') || t.includes('zap')) return Zap;
        if (t.includes('disco') || t.includes('storage') || t.includes('san') || t.includes('nas')) return HardDrive;
        if (t.includes('firewall') || t.includes('seguridad') || t.includes('forti') || t.includes('cisco')) return Shield;
        return Server;
    };

    return (
        <div className={`flex flex-col gap-6 h-full ${!hideHeader ? 'p-8 bg-white border border-slate-200 rounded-2xl shadow-sm' : ''} max-w-7xl mx-auto overflow-hidden`}>
            {!hideHeader && (
                <div className="flex justify-between items-end pb-6 border-b border-slate-100">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-blue-600 rounded text-[10px] font-black tracking-widest text-white shadow-lg shadow-blue-500/10 uppercase font-mono">Rack Unit</div>
                            <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
                                {rack.tag_id}
                            </h3>
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-wider font-mono">
                            <span className="flex items-center gap-1.5"><Box size={14} className="text-blue-600" /> {rack.sitio}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span className="flex items-center gap-1.5"><Activity size={14} className="text-emerald-600" /> {rack.sala}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span className="text-slate-400">{rack.fabricante} {rack.modelo}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Health Status</p>
                            <div className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${rack.estado?.toUpperCase() === 'OPERATIVO' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                {rack.estado || 'Operativo'}
                            </div>
                        </div>
                        {rack.consumo !== undefined && (
                            <div className="text-right bg-blue-50 border border-blue-100 p-4 rounded-2xl min-w-[140px] shadow-sm">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">Total Load</p>
                                <p className="text-2xl font-black text-blue-600 font-mono tracking-tighter">
                                    {(rack.consumo).toFixed(2)} <span className="text-xs text-blue-400 uppercase">KW</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`flex-1 flex ${isCompact ? 'flex-col items-center' : 'flex-col lg:flex-row gap-8 lg:gap-12'} overflow-hidden pt-4`}>
                {/* Digital Twin Rack Engine with Isometric Perspective */}
                <div className="flex flex-col items-center gap-6 group/rack perspective-[2000px] flex-shrink-0">
                    {!isCompact && <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em] opacity-60 group-hover/rack:opacity-100 transition-opacity">Digital Twin Engine [Isometric]</p>}

                    {/* 3D Isometric Container */}
                    <div
                        className={`${isCompact ? 'w-56 scale-90' : 'w-80'} relative bg-[#0a0a0a] rounded-xl border-[16px] border-[#1a1a1a] shadow-[0_40px_80px_rgba(0,0,0,0.2)] flex flex-col p-1 overflow-visible ring-4 ring-slate-900/10 transition-all duration-700
                            [transform:rotateX(15deg)_rotateY(-15deg)_skewX(0deg)] hover:[transform:rotateX(5deg)_rotateY(-5deg)] shadow-inner`}
                    >
                        {/* 3D Depth Sides */}
                        <div className="absolute -left-[30px] top-[10px] bottom-[10px] w-[20px] bg-slate-200 [transform:rotateY(-90deg)] origin-right opacity-30"></div>

                        {/* Dynamic Height Calculator */}
                        {(() => {
                            const maxPos = positionedDevices.reduce((max: number, d: any) => Math.max(max, (d.u_position || 0) + (d.u_height || 1) - 1), 42);
                            const totalU = Math.max(42, maxPos);

                            return (
                                <div className="flex flex-col overflow-y-auto custom-scrollbar max-h-[750px] relative">
                                    {/* Realistic Industrial Rails with 3D Depth */}
                                    <div className="absolute left-8 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-x border-slate-800/50 z-0 flex flex-col py-2 space-y-2 shadow-sm">
                                        {Array.from({ length: totalU }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center gap-1 opacity-20">
                                                <div className="w-1.5 h-1.5 bg-slate-600 rounded-sm border border-slate-700 shadow-inner"></div>
                                                <div className="w-1.5 h-1.5 bg-slate-600 rounded-sm border border-slate-700 shadow-inner"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute right-8 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-x border-slate-800/50 z-0 flex flex-col py-2 space-y-2 shadow-sm">
                                        {Array.from({ length: totalU }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center gap-1 opacity-20">
                                                <div className="w-1.5 h-1.5 bg-slate-600 rounded-sm border border-slate-700 shadow-inner"></div>
                                                <div className="w-1.5 h-1.5 bg-slate-600 rounded-sm border border-slate-700 shadow-inner"></div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* U units rendering engine */}
                                    {Array.from({ length: totalU }).map((_, i) => {
                                        const uNumber = totalU - i;
                                        const occupiesU = (dev: any) => {
                                            const start = dev.u_position || 1;
                                            const end = start + (dev.u_height || 1) - 1;
                                            return uNumber >= start && uNumber <= end;
                                        };
                                        const deviceAtU = positionedDevices.find(occupiesU);
                                        const isTopMostUnit = deviceAtU && (deviceAtU.u_position! + (deviceAtU.u_height || 1) - 1) === uNumber;
                                        const isHovered = deviceAtU && hoveredDeviceId === deviceAtU.id;

                                        return (
                                            <div
                                                key={uNumber}
                                                onMouseEnter={() => deviceAtU && setHoveredDeviceId(deviceAtU.id)}
                                                onMouseLeave={() => setHoveredDeviceId(null)}
                                                className={`h-[22px] w-full border-b border-white/5 flex items-center px-2 relative transition-all ${deviceAtU ? 'bg-blue-500/5' : 'hover:bg-white/5'}`}
                                            >
                                                <span className="text-[7px] text-slate-600 font-black absolute left-2 select-none font-mono">{uNumber}</span>

                                                {deviceAtU && isTopMostUnit && (
                                                    <motion.div
                                                        layoutId={deviceAtU.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        style={{ height: `${(deviceAtU.u_height || 1) * 22 - 1}px` }}
                                                        className={`absolute left-8 right-8 top-[0px] z-20 transition-all duration-300 ${isHovered ? 'ring-2 ring-blue-500 z-30 scale-[1.01] shadow-2xl' : 'shadow-lg'}
                                                bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-sm flex flex-col justify-center px-4 overflow-hidden`}
                                                    >
                                                        {/* Brushed Metal Texture Overlay */}
                                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]"></div>

                                                        {/* Technical Faceplate details */}
                                                        <div className="flex items-center justify-between relative z-10">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[8px] font-black text-slate-900 truncate uppercase tracking-tighter leading-none">
                                                                        {deviceAtU.fabricante}
                                                                    </span>
                                                                    <span className="text-[7px] text-blue-600 font-black truncate uppercase tracking-widest leading-none mt-0.5">
                                                                        {deviceAtU.modelo}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {!isCompact && (
                                                                <div className="flex gap-1 opacity-10">
                                                                    <div className="w-3 h-3 border border-slate-900 rounded-sm"></div>
                                                                    <div className="w-3 h-3 border border-slate-900 rounded-sm"></div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Interactive Highlights */}
                                                        {isHovered && (
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                className="absolute inset-0 bg-blue-600/10 pointer-events-none border-t border-blue-400/30"
                                                            />
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>
                </div>

                {/* Hardware Inventory Details */}
                {!isCompact && (
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                <HardDrive size={18} className="text-blue-600" />
                                Hardware Map Registry
                                <span className="ml-2 px-3 py-1 bg-blue-600 text-[9px] text-white rounded-full font-bold">{sortedDevices.length} ACTIVE UNITS</span>
                            </h4>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto pr-4 custom-scrollbar pb-10">
                            {sortedDevices.map((dev) => {
                                const isHovered = hoveredDeviceId === dev.id;
                                const DevIcon = getDeviceIcon(dev.type || '');
                                return (
                                    <motion.div
                                        key={dev.id}
                                        onMouseEnter={() => setHoveredDeviceId(dev.id)}
                                        onMouseLeave={() => setHoveredDeviceId(null)}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`p-6 transition-all duration-300 relative overflow-hidden rounded-2xl border ${isHovered ? 'bg-blue-50 border-blue-200 scale-[1.01] shadow-lg' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}
                                    >
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex-1 space-y-6">
                                                <div className="flex items-center gap-5">
                                                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border shadow-sm transition-all ${isHovered ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                        <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">Pos</span>
                                                        <span className="text-xl font-black font-mono leading-none">{dev.u_position}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">{dev.type}</span>
                                                            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                            <span className="px-2 py-0.5 bg-slate-100 text-[8px] text-slate-500 font-black rounded uppercase border border-slate-200">{dev.u_height}U SIZE</span>
                                                        </div>
                                                        <h5 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                                                            {dev.fabricante} <span className="text-slate-400 uppercase font-medium">{dev.modelo}</span>
                                                        </h5>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                                                    {[
                                                        { icon: Hash, label: 'Serial / P.N.', value: dev.serie || 'SECURED_ID', color: 'text-slate-600' },
                                                        { icon: Activity, label: 'Management IP', value: dev.ip_gestion || 'ISOLATED', color: 'text-emerald-600' },
                                                        { icon: Zap, label: 'Power Draw', value: dev.watts ? `${dev.watts} W` : '0W', color: 'text-amber-600' }
                                                    ].map((item, idx) => (
                                                        <div key={idx} className="space-y-2">
                                                            <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] flex items-center gap-1.5 opacity-80">
                                                                <item.icon size={10} strokeWidth={3} /> {item.label}
                                                            </p>
                                                            <p className={`text-xs font-black font-mono tracking-tighter ${item.color}`}>{item.value}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-4">
                                                    {dev.owner && (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                                            <User size={12} className="text-blue-600" />
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{dev.owner}</span>
                                                        </div>
                                                    )}
                                                    {dev.contrato && (
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                                            <Shield size={12} className="text-emerald-600" />
                                                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">{dev.contrato}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={`p-4 rounded-3xl border transition-all duration-500 ${isHovered ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                                <DevIcon size={32} strokeWidth={2.5} />
                                            </div>
                                        </div>

                                        {dev.comentarios && (
                                            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border-l-4 border-blue-500/50 text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">
                                                <AlertCircle size={10} className="inline mr-2 text-blue-600" />
                                                "{dev.comentarios}"
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
