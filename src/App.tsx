import { LayoutDashboard, Database, Map as MapIcon, Users, Settings, FileSpreadsheet, Plus, Trash2, Download, Box, Activity, Zap, X, Save, Check, AlertTriangle } from 'lucide-react'
import { useState, useRef, useMemo, useEffect } from 'react'
import { FloorPlan } from './components/FloorPlan'
import { ImportPreviewModal } from './components/ImportPreviewModal'
import { RackLayout } from './components/RackLayout'
import { UserManagement } from './components/UserManagement'
import { parseAssetExcel, downloadTemplate, RackAsset, U_TOTAL } from './utils/excelUtils'

const INITIAL_ASSETS: RackAsset[] = [
    {
        id: 'rack-1',
        tag_id: 'O-17',
        type: 'rack',
        pos_x: 17,
        pos_z: 15,
        fabricante: 'APC',
        modelo: 'NetShelter',
        sitio: 'SITE-01',
        sala: 'GSM',
        estado: 'Operativo',
        consumo: 12.5,
        devices: [
            { id: 'dev-1', type: 'server', modelo: 'R740', fabricante: 'Dell', serie: 'SN-X1', u_position: 42, u_height: 1 },
            { id: 'dev-2', type: 'switch', modelo: '2960', fabricante: 'Cisco', serie: 'SN-Y2', u_position: 1, u_height: 1 }
        ]
    },
]

function App() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [assets, setAssets] = useState<RackAsset[]>(INITIAL_ASSETS)
    const [previewData, setPreviewData] = useState<RackAsset[]>([])
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [selectedRack, setSelectedRack] = useState<RackAsset | null>(null)
    const [isRackModalOpen, setIsRackModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [assetToDelete, setAssetToDelete] = useState<RackAsset | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedSite, setSelectedSite] = useState<string>('all')
    const [viewingSite, setViewingSite] = useState<string | null>(null)
    const [viewingSala, setViewingSala] = useState<string | null>(null)
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load from localStorage
    useEffect(() => {
        const savedAssets = localStorage.getItem('dc-inventory');
        if (savedAssets) {
            try {
                setAssets(JSON.parse(savedAssets));
            } catch (e) {
                console.error("Error loading inventory:", e);
            }
        }
    }, [])

    const handleSaveInventory = async () => {
        setSaveStatus('saving');
        setIsSaving(true);

        // Simulate network delay for premium feel
        await new Promise(resolve => setTimeout(resolve, 1200));

        localStorage.setItem('dc-inventory', JSON.stringify(assets));

        setSaveStatus('saved');
        setTimeout(() => {
            setSaveStatus('idle');
            setIsSaving(false);
        }, 3000);
    };

    const handleClearAllInventory = () => {
        setAssets([])
        localStorage.removeItem('rack_inventory')
        setShowClearAllConfirm(false)
    }

    const availableSites = useMemo(() => {
        const sites = new Set(assets.map(a => a.sitio).filter(Boolean));
        return Array.from(sites) as string[];
    }, [assets]);

    const stats = useMemo(() => {
        const filteredAssets = selectedSite === 'all'
            ? assets
            : assets.filter(a => a.sitio === selectedSite);

        const totalRacks = filteredAssets.length
        const totalConsumption = filteredAssets.reduce((acc, r) => acc + (r.consumo || 0), 0)
        const totalUsedU = filteredAssets.reduce((acc, r) => acc + r.devices.reduce((dAcc, d) => dAcc + (d.u_height || 1), 0), 0)
        const totalU = totalRacks * U_TOTAL
        const usagePercent = totalU > 0 ? (totalUsedU / totalU) * 100 : 0
        const freePercent = 100 - usagePercent

        // Group by Sala
        interface SalaStats {
            name: string;
            racks: number;
            usedU: number;
            totalU: number;
            consumption: number;
        }

        const salaGroups = filteredAssets.reduce((acc: Record<string, SalaStats>, r) => {
            const sala = r.sala || 'Desconocida'
            if (!acc[sala]) {
                acc[sala] = { name: sala, racks: 0, usedU: 0, totalU: 0, consumption: 0 }
            }
            acc[sala].racks += 1
            acc[sala].usedU += r.devices.reduce((dAcc, d) => dAcc + (d.u_height || 1), 0)
            acc[sala].totalU += U_TOTAL
            acc[sala].consumption += (r.consumo || 0)
            return acc
        }, {})

        return {
            totalRacks,
            totalConsumption,
            usagePercent: usagePercent.toFixed(1),
            freePercent: freePercent.toFixed(1),
            salaBreakdown: Object.values(salaGroups),
            filteredAssets
        }
    }, [assets, selectedSite])

    const dynamicRoom = useMemo(() => {
        if (!viewingSite || !viewingSala) return { width: 20, height: 20, name: 'Cargando...' };

        const roomAssets = assets.filter(a => a.sitio === viewingSite && a.sala === viewingSala);

        // Find max coordinates
        let maxX = 10;
        let maxZ = 10;

        roomAssets.forEach(a => {
            if (a.pos_x > maxX) maxX = a.pos_x;
            if (a.pos_z > maxZ) maxZ = a.pos_z;
        });

        // Add padding (at least 2 units of margin)
        return {
            width: maxX + 2,
            height: maxZ + 2,
            name: `SALA ${viewingSala} - ${viewingSite}`
        };
    }, [assets, viewingSite, viewingSala]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const data = await parseAssetExcel(file)
            if (data.length > 0) {
                setPreviewData(data)
                setIsPreviewOpen(true)
            }
        } catch (error) {
            console.error('Error parsing excel:', error)
            alert('Error reading Excel file.')
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleConfirmImport = (importedRacks: RackAsset[]) => {
        setAssets(prev => {
            const assetMap = new Map(prev.map(a => [a.tag_id, a]));
            importedRacks.forEach(rack => {
                assetMap.set(rack.tag_id, rack);
            });
            return Array.from(assetMap.values());
        });
        setIsPreviewOpen(false)
        setPreviewData([])
    }

    const openRackDetail = (rack: RackAsset) => {
        setSelectedRack(rack);
        setIsRackModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!assetToDelete) return;
        setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
        setShowDeleteConfirm(false);
        setAssetToDelete(null);
        if (selectedRack?.id === assetToDelete.id) {
            setSelectedRack(null);
            setIsRackModalOpen(false);
        }
    };

    return (
        <div className="premium-bg flex h-screen overflow-hidden text-slate-200">
            {/* Sidebar */}
            <aside className="w-64 glass-card m-4 p-6 flex flex-col gap-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-900/40">DC</div>
                    <h1 className="text-xl font-bold tracking-tight text-white">AssetManager</h1>
                </div>

                <nav className="flex flex-col gap-2">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'inventory', icon: Database, label: 'Inventario' },
                        { id: 'floorplan', icon: MapIcon, label: 'Planos' },
                        { id: 'users', icon: Users, label: 'Usuarios' },
                        { id: 'settings', icon: Settings, label: 'Configuración' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setSelectedRack(null);
                                setIsRackModalOpen(false);
                                if (item.id === 'floorplan') {
                                    setViewingSite(null);
                                    setViewingSala(null);
                                }
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                : 'hover:bg-white/5 text-slate-400 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-auto flex flex-col">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold capitalize text-white">{activeTab}</h2>
                        <p className="text-slate-400 mt-1">Gestión avanzada de activos de centro de datos</p>
                    </div>

                    <div className="flex gap-3">
                        {activeTab === 'inventory' && (
                            <>
                                <button
                                    onClick={downloadTemplate}
                                    className="px-4 py-2.5 glass-card bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    Plantilla
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-2.5 glass-card bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30 text-blue-400 font-semibold transition-all flex items-center gap-2"
                                >
                                    <FileSpreadsheet size={18} />
                                    Importar
                                </button>
                                <button
                                    onClick={handleSaveInventory}
                                    disabled={isSaving}
                                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${saveStatus === 'saved'
                                        ? 'bg-green-600 text-white shadow-green-900/20'
                                        : 'bg-white/5 glass-card border-white/10 hover:bg-white/10 text-white'
                                        }`}
                                >
                                    {saveStatus === 'saving' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Guardando...
                                        </>
                                    ) : saveStatus === 'saved' ? (
                                        <>
                                            <Check size={18} />
                                            ¡Guardado!
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} className="text-blue-400" />
                                            Guardar
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                        {activeTab !== 'floorplan' && (
                            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2">
                                <Plus size={18} />
                                Nuevo
                            </button>
                        )}
                    </div>
                </header>

                <section className="flex-1 flex flex-col min-h-0 gap-6">
                    {activeTab === 'dashboard' && (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Filtrar por Sitio:</span>
                                    <select
                                        value={selectedSite}
                                        onChange={(e) => setSelectedSite(e.target.value)}
                                        className="bg-slate-900 border-none rounded-lg px-4 py-2 text-sm text-blue-400 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    >
                                        <option value="all">Todos los Sitios</option>
                                        {availableSites.map(site => (
                                            <option key={site} value={site}>{site}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                    Mostrando <span className="text-blue-400 font-bold">{stats.totalRacks}</span> de <span className="text-white">{assets.length}</span> racks
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Racks', value: stats.totalRacks.toString(), icon: Box, color: 'blue' },
                                    { label: 'Consumo Total', value: `${stats.totalConsumption.toFixed(2)} KW`, icon: Zap, color: 'blue' },
                                    { label: 'Ocupación Global', value: `${stats.usagePercent}%`, icon: Activity, color: 'blue' },
                                    { label: 'UR Libres Site', value: `${(stats.totalRacks * U_TOTAL - stats.filteredAssets.reduce((a, r) => a + r.devices.reduce((d, dv) => d + dv.u_height!, 0), 0))} UR`, icon: Database, color: 'green' },
                                ].map((stat) => (
                                    <div key={stat.label} className="p-6 glass-card border-white/5 flex items-center gap-4">
                                        <div className={`w-12 h-12 bg-${stat.color}-600/20 rounded-xl flex items-center justify-center text-${stat.color}-400`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">{stat.label}</p>
                                            <p className="text-2xl font-bold text-white">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>


                            <div className="flex gap-6 flex-1 min-h-0">
                                {/* Room Breakdown - First on the left */}
                                <div className="glass-card p-6 border-white/5 overflow-hidden flex flex-col w-[25%]">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <MapIcon className="text-blue-500" size={18} />
                                        Resumen por Sala
                                    </h3>
                                    <div className="overflow-auto flex-1">
                                        <table className="w-full text-left">
                                            <thead className="text-slate-500 text-[9px] uppercase tracking-[0.15em]">
                                                <tr className="border-b border-white/5">
                                                    <th className="pb-3 px-2">Sala</th>
                                                    <th className="pb-3 px-2">Racks</th>
                                                    <th className="pb-3 px-2 text-right">Uso %</th>
                                                    <th className="pb-3 px-2 text-right">UR Libres</th>
                                                    <th className="pb-3 px-2 text-right">Consumo</th>
                                                    <th className="pb-3 px-2 text-right">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {stats.salaBreakdown.map((sala) => {
                                                    const uPercent = ((sala.usedU / sala.totalU) * 100).toFixed(1)
                                                    const availU = sala.totalU - sala.usedU
                                                    return (
                                                        <tr key={sala.name} className="hover:bg-white/5 transition-colors">
                                                            <td className="py-3 px-2 font-bold text-white text-sm">{sala.name}</td>
                                                            <td className="py-3 px-2 text-slate-400 text-xs">{sala.racks}</td>
                                                            <td className="py-3 px-2 text-right text-blue-400 font-mono font-bold text-xs">{uPercent}%</td>
                                                            <td className="py-3 px-2 text-right text-green-400 font-mono text-xs">{availU} UR</td>
                                                            <td className="py-3 px-2 text-right text-white font-mono text-xs">{sala.consumption.toFixed(2)} KW</td>
                                                            <td className="py-3 px-2 text-right">
                                                                <select
                                                                    onChange={(e) => {
                                                                        const rackId = e.target.value;
                                                                        const rack = assets.find(a => a.id === rackId);
                                                                        if (rack) openRackDetail(rack);
                                                                    }}
                                                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-blue-400 font-bold outline-none cursor-pointer hover:border-blue-500/50 transition-all appearance-none pr-6 relative"
                                                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2360a5fa\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                                                                >
                                                                    <option value="">Sel...</option>
                                                                    {stats.filteredAssets.filter(a => (a.sala || 'Desconocida') === sala.name).map(r => (
                                                                        <option key={r.id} value={r.id}>{r.tag_id}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Rack Stack Chart Visual - Second in the middle */}
                                <div className="glass-card p-6 border-white/5 w-[30%] overflow-auto">
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 uppercase text-[10px] tracking-widest group">
                                        <Activity className="text-blue-500" size={16} />
                                        Visualización de Pilas por Rack
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {assets.map((rack) => {
                                            const usedU = rack.devices.reduce((acc, d) => acc + (d.u_height || 1), 0);
                                            const uPercent = (usedU / U_TOTAL) * 100;
                                            const statusColor = rack.estado?.toUpperCase() === 'OPERATIVO' ? '#22c55e' :
                                                rack.estado?.toUpperCase() === 'VACIO' ? '#64748b' : '#eab308';

                                            return (
                                                <div
                                                    key={rack.id}
                                                    onClick={() => openRackDetail(rack)}
                                                    className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-mono font-bold text-blue-400 text-sm">{rack.tag_id}</span>
                                                        <span className="text-[10px] text-slate-500">{(rack.consumo || 0).toFixed(2)} KW</span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-600 mb-2 uppercase tracking-tighter font-bold">{rack.sitio} • {rack.sala}</div>
                                                    {/* Stack Bar */}
                                                    <div className="h-6 w-full bg-slate-800 rounded-md overflow-hidden flex relative">
                                                        <div
                                                            style={{ width: `${uPercent}%`, backgroundColor: statusColor }}
                                                            className="h-full transition-all duration-500"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                            <span className="text-[9px] font-bold text-white drop-shadow-md">
                                                                {usedU} / {U_TOTAL} UR
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between mt-2">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-tighter">Estado: {rack.estado || 'N/A'}</span>
                                                        <span className="text-[9px] font-bold text-blue-400">{uPercent.toFixed(0)}% Ocupado</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Per-Rack Breakdown Table - Third on the right */}
                                <div className="glass-card p-8 border-white/5 overflow-hidden flex flex-col flex-1">
                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                        <Box className="text-blue-500" />
                                        Estructura de Racks
                                    </h3>
                                    <div className="overflow-auto flex-1">
                                        <table className="w-full text-left">
                                            <thead className="text-slate-500 text-[10px] uppercase tracking-[0.2em]">
                                                <tr className="border-b border-white/5">
                                                    <th className="pb-4 px-4">Rack</th>
                                                    <th className="pb-4 px-4">Estado</th>
                                                    <th className="pb-4 px-4 text-right">Uso %</th>
                                                    <th className="pb-4 px-4 text-right">UR Libres</th>
                                                    <th className="pb-4 px-4 text-right">Consumo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {stats.filteredAssets.map((rack) => {
                                                    const usedU = rack.devices.reduce((acc, d) => acc + (d.u_height || 1), 0)
                                                    const uPercent = ((usedU / U_TOTAL) * 100).toFixed(1)
                                                    const availU = U_TOTAL - usedU
                                                    return (
                                                        <tr key={rack.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="py-4 px-4">
                                                                <button
                                                                    onClick={() => openRackDetail(rack)}
                                                                    className="font-bold text-blue-400 hover:text-blue-300 font-mono underline decoration-blue-400/30"
                                                                >
                                                                    {rack.tag_id}
                                                                </button>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <span className={`px-2 py-1 rounded-md text-[9px] uppercase font-bold ${rack.estado?.toUpperCase() === 'OPERATIVO' ? 'bg-green-500/20 text-green-400' :
                                                                    rack.estado?.toUpperCase() === 'VACIO' ? 'bg-slate-500/20 text-slate-400' :
                                                                        'bg-yellow-500/20 text-yellow-400'
                                                                    }`}>
                                                                    {rack.estado || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-4 text-right text-blue-400 font-mono">{uPercent}%</td>
                                                            <td className="py-4 px-4 text-right text-green-400 font-mono">{availU} UR</td>
                                                            <td className="py-4 px-4 text-right text-slate-300 font-mono">{(rack.consumo || 0).toFixed(2)} KW</td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="flex-1 overflow-hidden flex flex-col gap-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                                <section className="glass-card flex-1 p-8 border-white/5 overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                            <Database className="text-blue-500" />
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
                                    <div className="overflow-auto flex-1">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-widest sticky top-0">
                                                <tr>
                                                    <th className="pb-4 px-4">Tag ID</th>
                                                    <th className="pb-4 px-4">Sitio</th>
                                                    <th className="pb-4 px-4">Fabricante</th>
                                                    <th className="pb-4 px-4">Modelo</th>
                                                    <th className="pb-4 px-4">Dispositivos</th>
                                                    <th className="pb-4 px-4">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {assets.map((asset) => (
                                                    <tr key={asset.id} className="hover:bg-white/5 transition-colors group">
                                                        <td className="py-5 px-4 font-bold text-white font-mono">{asset.tag_id}</td>
                                                        <td className="py-5 px-4 text-slate-400 font-bold text-xs">{asset.sitio || 'N/A'}</td>
                                                        <td className="py-5 px-4 text-slate-400">{asset.fabricante}</td>
                                                        <td className="py-5 px-4 text-slate-400">{asset.modelo}</td>
                                                        <td className="py-5 px-4">
                                                            <span className="px-3 py-1 bg-blue-600/10 text-blue-400 rounded-full text-xs font-semibold">
                                                                {asset.devices.length} Units
                                                            </span>
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            <div className="flex gap-2">
                                                                <button onClick={() => openRackDetail(asset)} className="p-2 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                                    <Activity size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => { setAssetToDelete(asset); setShowDeleteConfirm(true); }}
                                                                    className="p-2 hover:bg-red-600/20 text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <div className="flex-1 flex flex-col">
                                    {selectedRack ? (
                                        <RackLayout rack={selectedRack} onClose={() => setSelectedRack(null)} />
                                    ) : (
                                        <div className="flex-1 glass-card border-white/5 flex flex-col items-center justify-center text-slate-500 border-dashed border-2">
                                            <Box size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium">Seleccione un rack para ver su layout</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'floorplan' && (
                        <div className="flex-1 flex flex-col gap-6 min-h-0">
                            {/* Breadcrumbs / Navigation Header */}
                            <div className="flex items-center gap-3 mb-2">
                                <button
                                    onClick={() => { setViewingSite(null); setViewingSala(null); setSelectedRack(null); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!viewingSite ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    SITIOS
                                </button>
                                {viewingSite && (
                                    <>
                                        <span className="text-slate-600">/</span>
                                        <button
                                            onClick={() => { setViewingSala(null); setSelectedRack(null); }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewingSite && !viewingSala ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {viewingSite}
                                        </button>
                                    </>
                                )}
                                {viewingSala && (
                                    <>
                                        <span className="text-slate-600">/</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase">
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
                                                className="glass-card p-8 border-white/5 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all flex flex-col items-center gap-4 group"
                                            >
                                                <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                                    <MapIcon size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <h4 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-widest">{site}</h4>
                                                    <p className="text-slate-500 text-xs mt-2 font-mono">
                                                        {assets.filter(a => a.sitio === site).length} RACKS
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="col-span-full glass-card p-12 border-white/5 border-dashed border-2 flex flex-col items-center justify-center text-slate-500">
                                            <AlertTriangle size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-lg">No hay sitios registrados</p>
                                            <p className="text-sm mt-2">Importa un archivo Excel con la columna SITIO para comenzar.</p>
                                        </div>
                                    )}
                                </div>
                            ) : !viewingSala ? (
                                /* Sala Selection Grid */
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {Array.from(new Set(assets.filter(a => a.sitio === viewingSite).map(a => a.sala).filter(Boolean))).map(sala => (
                                        <button
                                            key={sala}
                                            onClick={() => setViewingSala(sala as string)}
                                            className="glass-card p-8 border-white/5 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all flex flex-col items-center gap-4 group"
                                        >
                                            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                                <Box size={32} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-widest">{sala}</h4>
                                                <p className="text-slate-500 text-xs mt-2 font-mono">
                                                    {assets.filter(a => a.sitio === viewingSite && a.sala === sala).length} RACKS
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setViewingSite(null)}
                                        className="glass-card p-8 border-white/5 border-dashed hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-white"
                                    >
                                        <X size={24} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Volver</span>
                                    </button>
                                </div>
                            ) : (
                                /* Floor Plan View */
                                <div className="flex-1 flex gap-6 min-h-0">
                                    <div className="flex-1 min-w-0">
                                        <FloorPlan
                                            assets={assets.filter(a => a.sitio === viewingSite && a.sala === viewingSala)}
                                            room={dynamicRoom}
                                            onSelectRack={setSelectedRack}
                                            selectedRackId={selectedRack?.id}
                                        />
                                    </div>

                                    {!selectedRack && (
                                        <div className="w-[450px] glass-card flex flex-col items-center justify-center p-8 text-center border-white/5">
                                            <Box size={48} className="text-slate-700 mb-4 opacity-50" />
                                            <h4 className="text-white font-semibold">Ningún Rack seleccionado</h4>
                                            <p className="text-slate-500 text-sm mt-2">
                                                Visualizando {viewingSite} / {viewingSala}.<br />
                                                Selecciona un rack para ver sus detalles.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && <UserManagement />}

                    {activeTab === 'settings' && (
                        <div className="glass-card flex-1 flex flex-col items-center justify-center text-slate-600">
                            <Settings size={48} className="animate-spin-slow mb-4 opacity-20" />
                            <p className="text-lg">Módulo de {activeTab} en construcción</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Modals */}
            {
                isPreviewOpen && (
                    <ImportPreviewModal
                        isOpen={isPreviewOpen}
                        onClose={() => setIsPreviewOpen(false)}
                        onConfirm={(data) => handleConfirmImport(data as RackAsset[])}
                        data={previewData}
                    />
                )
            }

            {
                isRackModalOpen && selectedRack && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsRackModalOpen(false)}
                        />
                        <div className="relative w-full max-w-2xl max-h-[90vh] glass-card border-white/10 overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Box className="text-blue-500" size={20} />
                                        Detalle del Rack: {selectedRack.tag_id}
                                    </h3>
                                    <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">{selectedRack.sala} • {selectedRack.estado}</p>
                                </div>
                                <button
                                    onClick={() => setIsRackModalOpen(false)}
                                    className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-8 bg-slate-900/30">
                                <RackLayout rack={selectedRack} hideHeader />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            {
                showDeleteConfirm && assetToDelete && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                            onClick={() => setShowDeleteConfirm(false)}
                        />
                        <div className="relative w-full max-w-md glass-card border-red-500/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">¿Eliminar Rack?</h3>
                                <p className="text-slate-400 text-sm mb-8">
                                    Esta acción eliminará permanentemente el rack <span className="text-white font-mono font-bold">{assetToDelete.tag_id}</span> y todos los dispositivos asociados ({assetToDelete.devices.length}).
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirmDelete}
                                        className="flex-1 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20 transition-all"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Clear All Confirmation Modal */}
            {showClearAllConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
                        onClick={() => setShowClearAllConfirm(false)}
                    />
                    <div className="relative w-full max-w-md glass-card border-red-500/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 animate-pulse">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2 text-red-500">¡Acción Crítica!</h3>
                            <p className="text-slate-400 text-sm mb-8">
                                Estás a punto de borrar los <span className="text-white font-mono font-bold">{assets.length} activos</span> guardados.<br /><br />
                                <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
                                    Esta acción es irreversible
                                </span>
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowClearAllConfirm(false)}
                                    className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleClearAllInventory}
                                    className="flex-1 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-600/20"
                                >
                                    Borrar Todo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}

export default App
