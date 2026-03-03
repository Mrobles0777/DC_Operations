import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Trash2, Box, Server } from 'lucide-react'
import { useState, useEffect } from 'react'
import { RackAsset } from '../utils/excelUtils'

interface ImportPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (assets: RackAsset[]) => void
    data: RackAsset[]
}

export const ImportPreviewModal = ({ isOpen, onClose, onConfirm, data }: ImportPreviewModalProps) => {
    const [items, setItems] = useState<RackAsset[]>([])

    useEffect(() => {
        if (data) setItems(data)
    }, [data])

    if (!isOpen) return null

    const handleDelete = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="glass-card w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-white/10"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div>
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Box className="text-blue-500" />
                                Revisar Estructura de Datos
                                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                                    {items.length} Racks Identificados
                                </span>
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">Se han vinculado dispositivos a sus respectivos racks automáticamente.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map((item, idx) => (
                                <motion.div
                                    layout
                                    key={item.id}
                                    className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 group relative hover:border-blue-500/30 transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400">
                                                <Box size={20} />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold font-mono">{item.tag_id}</p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.fabricante} {item.modelo}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(idx)}
                                            className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="flex gap-4 mt-2">
                                        <div className="flex-1 bg-black/20 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                                <Server size={10} /> Dispositivos ({item.devices.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {item.devices.slice(0, 5).map((_d, i) => (
                                                    <div key={i} className="w-1.5 h-1.5 bg-blue-500/40 rounded-full" />
                                                ))}
                                                {item.devices.length > 5 && <span className="text-[8px] text-slate-600">+{item.devices.length - 5}</span>}
                                            </div>
                                        </div>
                                        <div className="w-24 bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                            <p className="text-[10px] text-slate-500 uppercase mb-1">Ubicación</p>
                                            <p className="text-sm font-mono text-white">{item.sala || 'N/A'}</p>
                                            <p className="text-[8px] text-slate-500 uppercase">{item.piso || 'N/A'}</p>
                                        </div>
                                        {item.consumo !== undefined && (
                                            <div className="w-24 bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                                <p className="text-[10px] text-slate-500 uppercase mb-1">Consumo</p>
                                                <p className="text-sm font-bold text-blue-400">{item.consumo.toFixed(2)} KW</p>
                                            </div>
                                        )}
                                    </div>
                                    {item.propietario && (
                                        <div className="mt-1 px-3 py-1 bg-white/5 rounded-lg border border-white/5 inline-block self-start">
                                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Propietario: <span className="text-slate-300">{item.propietario}</span></p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/10 bg-white/5 flex justify-end gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-semibold"
                        >
                            Volver
                        </button>
                        <button
                            onClick={() => onConfirm(items)}
                            className="px-10 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-900/40 transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 size={20} />
                            Cargar {items.length} Racks
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
