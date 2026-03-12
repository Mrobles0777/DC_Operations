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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 30 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 rounded-[2.5rem]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase">
                                <Box className="text-blue-600" />
                                Revisar Estructura
                                <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-widest">
                                    {items.length} Racks
                                </span>
                            </h3>
                            <p className="text-slate-500 text-sm font-medium mt-1">Se han vinculado dispositivos a sus respectivos racks automáticamente.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto p-8 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.map((item, idx) => (
                                <motion.div
                                    layout
                                    key={item.id}
                                    className="p-5 bg-white border border-slate-100 rounded-3xl flex flex-col gap-3 group relative hover:border-blue-500 hover:shadow-xl hover:shadow-blue-50 transition-all duration-300"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                                <Box size={24} />
                                            </div>
                                            <div>
                                                <p className="text-slate-900 font-black font-mono">{item.tag_id}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.fabricante} {item.modelo}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(idx)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    <div className="flex gap-4 mt-2">
                                        <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-3 flex items-center gap-2 tracking-widest">
                                                <Server size={12} className="text-blue-400" /> Equipo ({item.devices.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {item.devices.slice(0, 8).map((_d, i) => (
                                                    <div key={i} className="w-2 h-2 bg-blue-500/30 rounded-full" />
                                                ))}
                                                {item.devices.length > 8 && <span className="text-[9px] text-slate-400 font-black">+{item.devices.length - 8}</span>}
                                            </div>
                                        </div>
                                        <div className="w-28 bg-slate-900 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg shadow-slate-200">
                                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Sala</p>
                                            <p className="text-xs font-black text-white">{item.sala || 'N/A'}</p>
                                            <p className="text-[8px] text-blue-400 font-black uppercase tracking-tighter mt-1">{item.piso || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    {item.propietario && (
                                        <div className="mt-1 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 inline-block self-start">
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Owner: <span className="text-slate-900 font-black">{item.propietario}</span></p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4 items-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-900 hover:bg-slate-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(items)}
                            className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center gap-3 active:scale-95"
                        >
                            <CheckCircle2 size={18} />
                            Confirmar {items.length} Racks
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
