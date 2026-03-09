import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, Maximize2, X, Trash2, Save } from 'lucide-react'
import { RackAsset, Device, U_TOTAL } from '../utils/excelUtils'

interface Room {
    width: number
    height: number
    name: string
}

interface FloorPlanProps {
    assets: RackAsset[]
    room: Room
    onSelectRack?: (rack: RackAsset) => void
    selectedRackId?: string | null
    onSaveChanges?: (rackId: string, devices: Device[]) => void
}

export const FloorPlan = ({ assets, room, onSelectRack, selectedRackId, onSaveChanges }: FloorPlanProps) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const [zoom, setZoom] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [hoveredAsset, setHoveredAsset] = useState<RackAsset | null>(null)
    const [draggedDevice, setDraggedDevice] = useState<Device | null>(null)
    const [rackDevices, setRackDevices] = useState<Device[]>([])
    const [hasChanges, setHasChanges] = useState(false)

    // System: 1 unit = 20 pixels for better visibility
    const SCALE = 24 // Increased scale for labels
    const AXIS_OFFSET = SCALE * 1.5

    // Helper to convert number to letter (1=A, 2=B...)
    const getLetter = (num: number) => {
        let letter = ''
        while (num > 0) {
            let mod = (num - 1) % 26
            letter = String.fromCharCode(65 + mod) + letter
            num = Math.floor((num - mod) / 26)
        }
        return letter
    }

    // Get selected rack
    const selectedRack = assets.find(a => a.id === selectedRackId)

    // Update rack devices when selection changes
    useEffect(() => {
        if (selectedRack) {
            const occupied = new Set<number>();
            const devices = [...selectedRack.devices];

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
            const positionedDevices = devices.map(dev => {
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

            setRackDevices(positionedDevices)
            setHasChanges(false)
        } else {
            setRackDevices([])
            setHasChanges(false)
        }
    }, [selectedRack])

    const handleDeviceDragStart = (device: Device) => {
        setDraggedDevice(device)
    }

    const handleDeviceDrop = (targetU: number) => {
        if (!draggedDevice || !selectedRack) return

        // Remove device from old position
        const updatedDevices = rackDevices.filter(d => d !== draggedDevice)

        // Add device to new position
        const movedDevice = { ...draggedDevice, u_position: targetU }
        updatedDevices.push(movedDevice)

        setRackDevices(updatedDevices)
        setDraggedDevice(null)
        setHasChanges(true)
    }

    const handleDeleteDevice = (device: Device) => {
        if (!selectedRack) return

        const updatedDevices = rackDevices.filter(d => d !== device)
        setRackDevices(updatedDevices)
        setHasChanges(true)
    }

    const handleSaveChanges = () => {
        if (!selectedRack || !onSaveChanges) return

        // Update the original rack's devices
        selectedRack.devices = [...rackDevices]

        // Call the parent callback
        onSaveChanges(selectedRack.id, rackDevices)

        setHasChanges(false)
    }

    return (
        <div className="relative w-full flex flex-col xl:flex-row gap-4 min-h-[600px] xl:h-[600px]">
            {/* Floor Plan View */}
            <div className={`relative ${selectedRack ? 'w-full xl:w-2/3' : 'w-full'} h-[500px] xl:h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all duration-300`}>
                {/* Controls */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    <button
                        onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                        className="p-2 bg-white/80 backdrop-blur-md border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm"
                        title="Zoom In"
                    >
                        <ZoomIn size={20} />
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                        className="p-2 bg-white/80 backdrop-blur-md border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm"
                        title="Zoom Out"
                    >
                        <ZoomOut size={20} />
                    </button>
                    <button
                        onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }}
                        className="p-2 bg-white/80 backdrop-blur-md border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors shadow-sm"
                        title="Reset View"
                    >
                        <Maximize2 size={20} />
                    </button>
                </div>

                {/* Map Container */}
                <div className="w-full h-full flex items-center justify-center">
                    <motion.svg
                        ref={svgRef}
                        viewBox={`0 0 ${room.width * SCALE + AXIS_OFFSET} ${room.height * SCALE + AXIS_OFFSET}`}
                        style={{
                            width: '95%',
                            height: '95%',
                            scale: zoom,
                            translateX: offset.x,
                            translateY: offset.y
                        }}
                        className="drop-shadow-2xl"
                    >
                        <g transform={`translate(${AXIS_OFFSET}, 0)`}>
                            {/* Room Base */}
                            <rect
                                width={room.width * SCALE}
                                height={room.height * SCALE}
                                fill="#f8fafc"
                                stroke="#e2e8f0"
                                strokeWidth="2"
                            />

                            {/* Grid Lines & Labels */}
                            {Array.from({ length: room.width + 1 }).map((_, i) => (
                                <g key={`x-${i}`}>
                                    <line
                                        x1={i * SCALE} y1={0} x2={i * SCALE} y2={room.height * SCALE}
                                        stroke="#334155" strokeWidth="0.5" opacity="0.2"
                                    />
                                    {i < room.width && (
                                        <text
                                            x={i * SCALE + SCALE / 2} y={room.height * SCALE + 12}
                                            textAnchor="middle" fill="#64748b" fontSize="6.5" fontWeight="bold"
                                            className="font-mono"
                                        >
                                            {i + 1}
                                        </text>
                                    )}
                                </g>
                            ))}
                            {Array.from({ length: room.height + 1 }).map((_, i) => (
                                <g key={`z-${i}`}>
                                    <line
                                        x1={0} y1={i * SCALE} x2={room.width * SCALE} y2={i * SCALE}
                                        stroke="#334155" strokeWidth="0.5" opacity="0.2"
                                    />
                                    {i < room.height && (
                                        <text
                                            x={-10} y={i * SCALE + SCALE / 2}
                                            textAnchor="end" fill="#64748b" fontSize="6.5" fontWeight="bold"
                                            dominantBaseline="middle"
                                            className="font-mono"
                                        >
                                            {getLetter(room.height - i)}
                                        </text>
                                    )}
                                </g>
                            ))}

                            {/* Assets (Racks) */}
                            {assets.map((asset) => {
                                const isSelected = selectedRackId === asset.id;
                                // pos_z in data matches the letter index (1=A, etc)
                                // In our SVG, y=0 is top (last letter), y=height is bottom (A)
                                // So Z=1 should be at row index room.height-1
                                const gridY = (room.height - asset.pos_z) * SCALE;

                                return (
                                    <g
                                        key={asset.id}
                                        onMouseEnter={() => setHoveredAsset(asset)}
                                        onMouseLeave={() => setHoveredAsset(null)}
                                        onClick={() => onSelectRack?.(asset)}
                                        className="cursor-pointer group"
                                    >
                                        <motion.rect
                                            initial={false}
                                            animate={{
                                                scale: isSelected ? 1.1 : 1,
                                                strokeWidth: isSelected ? 2 : 1
                                            }}
                                            x={(asset.pos_x - 1) * SCALE + (SCALE * 0.1)}
                                            y={gridY + (SCALE * 0.1)}
                                            width={SCALE * 0.8}
                                            height={SCALE * 0.8}
                                            fill={isSelected ? '#2563eb' : '#0f172a'}
                                            stroke={isSelected ? '#3b82f6' : '#1e293b'}
                                            className="transition-colors duration-300 shadow-sm"
                                            rx="2"
                                        />
                                        <text
                                            x={(asset.pos_x - 1) * SCALE + (SCALE * 0.4)}
                                            y={gridY + (SCALE * 0.55)}
                                            textAnchor="middle"
                                            fill={isSelected ? "white" : "#94a3b8"}
                                            fontSize="5"
                                            className="font-mono font-bold pointer-events-none"
                                        >
                                            {asset.tag_id}
                                        </text>
                                    </g>
                                )
                            })}
                        </g>
                    </motion.svg>
                </div>

                {/* Selection/Hover Details Overlay */}
                {(hoveredAsset || selectedRackId) && (
                    <div className="absolute bottom-4 right-4 glass-card p-4 min-w-[200px] pointer-events-none">
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Activo Seleccionado</p>
                        <p className="text-slate-900 font-bold">{(hoveredAsset || assets.find(a => a.id === selectedRackId))?.tag_id}</p>
                        <p className="text-slate-500 text-xs mt-1">
                            Posición: {(hoveredAsset || assets.find(a => a.id === selectedRackId))?.pos_x}, {(hoveredAsset || assets.find(a => a.id === selectedRackId))?.pos_z}
                        </p>
                        <p className="text-blue-600 text-xs mt-2 font-medium">
                            {(hoveredAsset || assets.find(a => a.id === selectedRackId))?.devices.length} dispositivos montados
                        </p>
                        {((hoveredAsset || assets.find(a => a.id === selectedRackId))?.consumo !== undefined) && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-slate-400 uppercase">Consumo</span>
                                    <span className="text-[10px] font-bold text-blue-600">{((hoveredAsset || assets.find(a => a.id === selectedRackId))!.consumo! / 1000).toFixed(2)} KW</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 glass-card p-4 text-[10px] flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-sm"></div>
                        <span className="text-slate-500 uppercase tracking-wider">Rack Seleccionado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#0f172a] border border-slate-700 rounded-sm"></div>
                        <span className="text-slate-500 uppercase tracking-wider">Rack Standby</span>
                    </div>
                </div>
            </div>

            {/* Editable Rack Layout Panel */}
            {selectedRack && (
                <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    className="w-full xl:w-1/3 bg-white border border-slate-200 rounded-2xl p-6 overflow-hidden shadow-sm h-[650px]"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                Layout Frontal: {selectedRack.tag_id}
                            </h3>
                            <p className="text-slate-500 text-xs mt-1">Arrastra para mover • Click para eliminar</p>
                        </div>
                        <button
                            onClick={() => onSelectRack?.(selectedRack)}
                            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Rack Visual */}
                    <div className="relative bg-[#0a0a0a] rounded-xl p-4 border border-slate-800 shadow-inner">
                        {(() => {
                            const maxPos = rackDevices.reduce((max, d) => Math.max(max, (d.u_position || 1) + (d.u_height || 1) - 1), U_TOTAL);
                            const dynamicU = Math.max(U_TOTAL, maxPos);

                            return (
                                <div className="flex gap-2">
                                    {/* U Labels */}
                                    <div className="flex flex-col-reverse gap-0.5">
                                        {Array.from({ length: dynamicU }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-[14px] flex items-center justify-center text-[7px] text-slate-400 font-mono w-6 font-bold"
                                            >
                                                U{i + 1}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rack Slots */}
                                    <div className="flex-1 flex flex-col-reverse gap-0.5 relative">
                                        {Array.from({ length: dynamicU }).map((_, uIndex) => {
                                            const uPosition = uIndex + 1
                                            const deviceAtU = rackDevices.find(d => d.u_position === uPosition)

                                            return (
                                                <div
                                                    key={uIndex}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => handleDeviceDrop(uPosition)}
                                                    className={`h-[14px] rounded-xs border transition-all ${deviceAtU
                                                        ? 'bg-blue-600/20 border-blue-500/30'
                                                        : 'bg-slate-900 border-slate-800 hover:border-blue-500/30 shadow-xs'
                                                        }`}
                                                >
                                                    {deviceAtU && (
                                                        <div
                                                            draggable
                                                            onDragStart={() => handleDeviceDragStart(deviceAtU)}
                                                            className="h-full px-1.5 flex items-center justify-between group relative"
                                                        >
                                                            <span className="text-[7px] text-blue-700 font-mono font-bold truncate flex-1 cursor-move">
                                                                {deviceAtU.type || 'Device'}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteDevice(deviceAtU);
                                                                }}
                                                                onMouseDown={(e) => e.stopPropagation()}
                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 bg-red-50 rounded transition-all cursor-pointer z-10"
                                                                title="Eliminar dispositivo"
                                                            >
                                                                <Trash2 size={12} className="text-red-500" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    {/* Stats */}
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Dispositivos</p>
                            <p className="text-sm font-bold text-slate-900">{rackDevices.length}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">UR Usados</p>
                            <p className="text-sm font-bold text-blue-600">
                                {rackDevices.reduce((acc, d) => acc + (d.u_height || 1), 0)} / {Math.max(U_TOTAL, rackDevices.reduce((max, d) => Math.max(max, (d.u_position || 1) + (d.u_height || 1) - 1), U_TOTAL))}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Estado</p>
                            <p className="text-sm font-bold text-emerald-600">{selectedRack.estado || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold">Consumo</p>
                            <p className="text-sm font-bold text-amber-600">{selectedRack.consumo ? (selectedRack.consumo / 1000).toFixed(2) : '0.00'} KW</p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveChanges}
                        disabled={!hasChanges}
                        className={`mt-4 w-full py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${hasChanges
                            ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-lg shadow-blue-500/10'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Save size={16} />
                        {hasChanges ? 'Guardar Cambios' : 'Sin Cambios'}
                    </button>
                </motion.div>
            )}
        </div>
    )
}
