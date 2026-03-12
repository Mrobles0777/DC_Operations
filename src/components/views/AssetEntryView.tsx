import React, { useState } from 'react';
import { Database, Zap, ShieldAlert, Save, X, Box, Layers } from 'lucide-react';
import { RackAsset, Device } from '../../utils/excelUtils';

interface AssetEntryViewProps {
    onSave: (asset: Partial<RackAsset> | Partial<Device>, targetRackId?: string) => void;
    onCancel: () => void;
    assets: RackAsset[];
}

interface EntryFormData {
    tag_id: string;
    sitio: string;
    sala: string;
    piso: string;
    fabricante: string;
    modelo: string;
    serie: string;
    propietario: string;
    estado: string;
    consumo: number;
    pos_x: number;
    pos_z: number;
    type: 'rack' | 'device';
    devices: any[];
    alarm_hardware: number;
    alarm_ventilador: number;
    alarm_fuente: number;
    alarm_hdd: number;
    targetRackId: string;
    ur_start: number;
    ur_height: number;
}

export const AssetEntryView = ({ onSave, onCancel, assets }: AssetEntryViewProps) => {
    const [entryType, setEntryType] = useState<'none' | 'rack' | 'device'>('none');
    const [activeFormTab, setActiveFormTab] = useState<'general' | 'tech' | 'alarms'>('general');
    
    const [formData, setFormData] = useState<EntryFormData>({
        tag_id: '',
        sitio: '',
        sala: '',
        piso: '',
        fabricante: '',
        modelo: '',
        serie: '',
        propietario: '',
        estado: 'OPERATIVO',
        consumo: 0,
        pos_x: 1,
        pos_z: 1,
        type: 'rack',
        devices: [],
        alarm_hardware: 0,
        alarm_ventilador: 0,
        alarm_fuente: 0,
        alarm_hdd: 0,
        targetRackId: '',
        ur_start: 1,
        ur_height: 1
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: e.target.type === 'number' ? parseFloat(value) : value 
        } as EntryFormData));
    };

    const handleAlarmToggle = (field: 'alarm_hardware' | 'alarm_ventilador' | 'alarm_fuente' | 'alarm_hdd') => {
        setFormData(prev => ({ 
            ...prev, 
            [field]: prev[field] === 1 ? 0 : 1 
        } as EntryFormData));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (entryType === 'rack') {
            if (!formData.tag_id || !formData.sitio || !formData.sala) {
                alert('Por favor complete los campos obligatorios: Tag ID, Sitio y Sala.');
                return;
            }
            onSave(formData);
        } else {
            if (!formData.targetRackId || !formData.modelo) {
                alert('Por favor complete los campos obligatorios: Rack de destino y Modelo/Nombre dispositivo.');
                return;
            }
            onSave(formData, formData.targetRackId);
        }
    };

    if (entryType === 'none') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-4">
                    <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">¿Qué desea cargar hoy?</h3>
                    <p className="text-slate-500 font-medium">Seleccione el tipo de activo para iniciar el formulario técnico</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-6">
                    <button 
                        onClick={() => { setEntryType('rack'); setFormData(prev => ({ ...prev, type: 'rack' })); }}
                        className="group relative bg-white border-2 border-slate-100 p-10 rounded-[3rem] hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 flex flex-col items-center gap-6 text-center overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                            <Box size={140} />
                        </div>
                        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                            <Box size={40} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-2xl font-black text-slate-900 uppercase">Rack Nuevo</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Cargue una nueva estructura de rack completa con coordenadas de sala.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => { setEntryType('device'); setFormData(prev => ({ ...prev, type: 'device' })); }}
                        className="group relative bg-white border-2 border-slate-100 p-10 rounded-[3rem] hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-100 transition-all duration-500 flex flex-col items-center gap-6 text-center overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all">
                            <Layers size={140} />
                        </div>
                        <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-inner">
                            <Layers size={40} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-2xl font-black text-slate-900 uppercase">Dispositivo</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Agregue servidores, switches o equipos dentro de un rack existente.</p>
                        </div>
                    </button>
                </div>

                <button 
                    onClick={onCancel}
                    className="mt-8 px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-900 transition-colors"
                >
                    Volver al inventario
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setEntryType('none')}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {entryType === 'rack' ? 'Nueva Estructura de Rack' : 'Nuevo Equipo de Hardware'}
                        </h3>
                        <p className="text-slate-500 text-sm">Ingrese los datos técnicos siguiendo el estándar de base de datos DC</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                <aside className="lg:w-64 flex flex-col gap-2">
                    {[
                        { id: 'general', label: 'Datos Generales', icon: Database },
                        { id: 'tech', label: 'Especificaciones', icon: Zap },
                        { id: 'alarms', label: 'Estado y Alarmas', icon: ShieldAlert },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveFormTab(tab.id as any)}
                            className={`flex items-center gap-3 px-4 py-4 rounded-2xl transition-all border ${
                                activeFormTab === tab.id 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200' 
                                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                            }`}
                        >
                            <tab.icon size={20} />
                            <span className="font-bold text-sm uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}

                    <div className="mt-auto p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <p className="text-[10px] uppercase font-black text-blue-600 tracking-widest mb-1">Prioridad Alta</p>
                        <p className="text-[10px] text-blue-800 leading-relaxed font-bold">Campos A, B, C, D, E, F, H, I, P, AD son obligatorios para integridad de datos.</p>
                    </div>
                </aside>

                <form onSubmit={handleSubmit} className="flex-1 glass-card bg-white border-slate-200/60 p-8 overflow-y-auto flex flex-col gap-8 shadow-sm rounded-3xl">
                    {activeFormTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                            {entryType === 'device' && (
                                <div className="md:col-span-2 space-y-2 bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-purple-400 px-1">Seleccionar Rack de Destino *</label>
                                    <select 
                                        name="targetRackId"
                                        value={formData.targetRackId}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-white border-2 border-purple-100 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all font-black text-purple-700"
                                    >
                                        <option value="">Seleccione un Rack...</option>
                                        {assets.map(a => (
                                            <option key={a.id} value={a.id}>[{a.sitio}] {a.tag_id} - {a.sala}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {entryType === 'rack' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Sitio (Col A) *</label>
                                        <input 
                                            name="sitio"
                                            value={formData.sitio}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-900"
                                            placeholder="Ej: APOQUINDO"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Sala (Col B) *</label>
                                        <input 
                                            name="sala"
                                            value={formData.sala}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-900"
                                            placeholder="Ej: MAINFRAME"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tag ID / Coordenada (Col I) *</label>
                                        <input 
                                            name="tag_id"
                                            value={formData.tag_id}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-900 border-transparent rounded-xl focus:ring-4 focus:ring-slate-200 transition-all font-mono font-black text-white"
                                            placeholder="Ej: D7"
                                        />
                                    </div>
                                </>
                            )}

                            {entryType === 'device' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">UR Inicial (Posición base) *</label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="ur_start"
                                                min="1"
                                                max="45"
                                                value={formData.ur_start}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-black"
                                            />
                                            <Layers className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Cantidad de UR (Altura) *</label>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="ur_height"
                                                min="1"
                                                max="10"
                                                value={formData.ur_height}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-black"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">U</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Cliente / Propietario (Col H)</label>
                                <input 
                                    name="propietario"
                                    value={formData.propietario}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                                    placeholder="Ej: TELEFONICA"
                                />
                            </div>
                        </div>
                    )}

                    {activeFormTab === 'tech' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Marca (Col D)</label>
                                <input 
                                    name="fabricante"
                                    value={formData.fabricante}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                                    placeholder="Ej: HP / CISCO"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Modelo / Nombre (Col E) *</label>
                                <input 
                                    name="modelo"
                                    value={formData.modelo}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                                    placeholder="Ej: Proliant DL380"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Número de Serie (Col F)</label>
                                <input 
                                    name="serie"
                                    value={formData.serie}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Potencia Consumida Watts (Col AD)</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        name="consumo"
                                        value={formData.consumo}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-blue-50/50 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-black text-blue-600 pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-blue-300">W</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeFormTab === 'alarms' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Estado (Col P)</label>
                                <select 
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-900 border-transparent rounded-xl text-white font-black uppercase tracking-widest text-xs focus:ring-4 focus:ring-slate-200 transition-all"
                                >
                                    <option value="OPERATIVO">OPERATIVO</option>
                                    <option value="ALARMADO">ALARMADO</option>
                                    <option value="CRITICO">CRITICO</option>
                                    <option value="SIN DATOS">SIN DATOS</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {([
                                    { label: 'Alarma Hardware (Col R)', field: 'alarm_hardware' },
                                    { label: 'Alarma Ventilador (Col S)', field: 'alarm_ventilador' },
                                    { label: 'Alarma Fuente (Col T)', field: 'alarm_fuente' },
                                    { label: 'Alarma HDD (Col U)', field: 'alarm_hdd' },
                                ] as const).map(alarm => (
                                    <button
                                        key={alarm.field}
                                        type="button"
                                        onClick={() => handleAlarmToggle(alarm.field)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                            formData[alarm.field] === 1
                                            ? 'bg-red-50 border-red-500 text-red-900 shadow-lg shadow-red-100'
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                        }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">{alarm.label}</span>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData[alarm.field] === 1 ? 'bg-red-500 text-white' : 'bg-slate-100'}`}>
                                            <ShieldAlert size={16} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-8 border-t border-slate-100 flex justify-end gap-4">
                        <button 
                            type="button"
                            onClick={onCancel}
                            className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="px-10 py-4 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Save size={18} />
                            Guardar {entryType === 'rack' ? 'Rack' : 'Equipo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
