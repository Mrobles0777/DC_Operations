import { LayoutDashboard, Database, Map as MapIcon, Users, Settings, FileSpreadsheet, Trash2, Download, Box, Activity, Zap, X, Save, Check, AlertTriangle, Search, Menu } from 'lucide-react'
import { useState, useRef, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FloorPlan } from './components/FloorPlan'
import { ImportPreviewModal } from './components/ImportPreviewModal'
import { RackLayout } from './components/RackLayout'
import { UserManagement } from './components/UserManagement'
import { StatusIndicators } from './components/StatusIndicators'
import { parseAssetExcel, downloadTemplate, RackAsset, U_TOTAL } from './utils/excelUtils'
import { Login } from './components/Login'
import { supabase } from './lib/supabase'
import { User } from '@supabase/supabase-js'

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
    const [user, setUser] = useState<User | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Dashboard local search & sort
    const [dashboardSearch, setDashboardSearch] = useState('');
    const [dashboardSort, setDashboardSort] = useState<'id' | 'usage' | 'power'>('id');
    const [dashboardSelectedRack, setDashboardSelectedRack] = useState<RackAsset | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auth persistence
    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.warn("Session error detected, clearing invalid auth tokens:", error.message);
                supabase.auth.signOut();
                setUser(null);
            } else {
                setUser(session?.user ?? null)
            }
            setAuthLoading(false)
        }).catch(err => {
            console.error("Failed to recover session:", err);
            supabase.auth.signOut();
            setUser(null);
            setAuthLoading(false);
        })

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

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

        const getAlarmPercent = (alarmKey: keyof RackAsset) => {
            const assetsWithData = filteredAssets.filter(r => r[alarmKey] !== undefined);
            if (assetsWithData.length === 0) return NaN;
            const alarmsCount = assetsWithData.filter(r => r[alarmKey] === 1).length;
            return (alarmsCount / assetsWithData.length) * 100;
        };

        return {
            totalRacks,
            totalWatts: totalConsumption,
            totalConsumptionKW: totalConsumption / 1000,
            usagePercent: usagePercent.toFixed(1),
            freePercent: freePercent.toFixed(1),
            salaBreakdown: Object.values(salaGroups),
            filteredAssets,
            alarms: {
                hardware: getAlarmPercent('alarm_hardware'),
                ventilador: getAlarmPercent('alarm_ventilador'),
                fuente: getAlarmPercent('alarm_fuente'),
                hdd: getAlarmPercent('alarm_hdd'),
            }
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
            name: `SALA ${viewingSala} - ${viewingSite} `
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

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
            </div>
        )
    }

    if (!user) {
        return <Login onLoginSuccess={setUser} />
    }

    return (
        <div className="premium-bg flex flex-col md:flex-row h-screen overflow-hidden text-slate-900 relative">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 relative">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-blue-200">DC</div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900">AssetManager</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* Mobile Menu Backdrop */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-64 glass-card m-4 p-6 flex flex-col gap-8 bg-white/95 border-slate-200/60 shadow-xl shadow-slate-200/40 fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[110%]'}`}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-200">DC</div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">AssetManager</h1>
                    </div>
                    <button 
                        className="md:hidden text-slate-400 hover:text-red-500"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={24} />
                    </button>
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
                                setIsMobileMenuOpen(false);
                                if (item.id === 'floorplan') {
                                    setViewingSite(null);
                                    setViewingSala(null);
                                }
                            }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-100">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                    >
                        <X size={20} />
                        <span className="font-medium uppercase tracking-widest text-xs">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-auto flex flex-col">
                <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold capitalize text-slate-900">{activeTab}</h2>
                        <p className="text-slate-500 mt-1 text-sm md:text-base">Gestión avanzada de activos de centro de datos</p>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 w-full md:w-auto">
                        {activeTab === 'dashboard' && <StatusIndicators alarms={stats.alarms} racksStats={{ total: stats.totalRacks, usage: stats.usagePercent }} />}
                        <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
                            {activeTab === 'inventory' && (
                                <>
                                    <button
                                        onClick={downloadTemplate}
                                        className="px-4 py-2.5 glass-card bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <Download size={18} />
                                        Plantilla
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-6 py-2.5 glass-card bg-blue-600 border-blue-600 hover:bg-blue-700 text-white font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                                    >
                                        <FileSpreadsheet size={18} />
                                        Importar
                                    </button>
                                    <button
                                        onClick={handleSaveInventory}
                                        disabled={isSaving}
                                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${saveStatus === 'saved'
                                            ? 'bg-emerald-600 text-white shadow-emerald-200'
                                            : 'bg-white glass-card border-slate-200 hover:bg-slate-50 text-slate-700'
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
                                                <Save size={18} className="text-blue-600" />
                                                Guardar
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <section className="flex-1 flex flex-col min-h-0 gap-6">
                    {activeTab === 'dashboard' && (
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
                                    { label: 'UR Libres Site', value: `${(stats.totalRacks * U_TOTAL - stats.filteredAssets.reduce((a, r) => a + r.devices.reduce((d, dv) => d + dv.u_height!, 0), 0))} UR`, icon: Database, color: 'emerald' },
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
                                {/* Room Breakdown - First on the left */}
                                <div className="glass-card p-6 bg-white border-slate-200/60 overflow-hidden flex flex-col w-full lg:w-[25%] shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <MapIcon className="text-blue-600" size={18} />
                                        Resumen por Sala
                                    </h3>
                                    <div className="overflow-x-auto flex-1 w-full relative">
                                        <table className="w-full text-left">
                                            <thead className="text-slate-400 text-[9px] uppercase tracking-[0.15em]">
                                                <tr className="border-b border-slate-100">
                                                    <th className="pb-3 px-2">Sala</th>
                                                    <th className="pb-3 px-2">Racks</th>
                                                    <th className="pb-3 px-2 text-right">Uso %</th>
                                                    <th className="pb-3 px-2 text-right">UR Libres</th>
                                                    <th className="pb-3 px-2 text-right">Consumo</th>
                                                    <th className="pb-3 px-2 text-right">Detalle</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {stats.salaBreakdown.map((sala) => {
                                                    const uPercent = ((sala.usedU / sala.totalU) * 100).toFixed(1)
                                                    const availU = sala.totalU - sala.usedU
                                                    return (
                                                        <tr key={sala.name} className="hover:bg-slate-50 transition-colors">
                                                            <td className="py-3 px-2 font-bold text-slate-900 text-sm">{sala.name}</td>
                                                            <td className="py-3 px-2 text-slate-500 text-xs">{sala.racks}</td>
                                                            <td className="py-3 px-2 text-right text-blue-600 font-mono font-bold text-xs">{uPercent}%</td>
                                                            <td className="py-3 px-2 text-right text-emerald-600 font-mono text-xs">{availU} UR</td>
                                                            <td className="py-3 px-2 text-right text-slate-700 font-mono text-xs">{(sala.consumption / 1000).toFixed(2)} KW</td>
                                                            <td className="py-3 px-2 text-right">
                                                                <select
                                                                    onChange={(e) => {
                                                                        const rackId = e.target.value;
                                                                        const rack = assets.find(a => a.id === rackId);
                                                                        if (rack) openRackDetail(rack);
                                                                    }}
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] text-blue-600 font-bold outline-none cursor-pointer hover:border-blue-400/50 transition-all appearance-none pr-6 relative"
                                                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%232563eb\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
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

                                {/* Interactive Capacity Monitor & Live Preview */}
                                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                                    {/* Left: Capacity Monitor */}
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
                                                .filter(r =>
                                                    r.tag_id.toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                                                    (r.sala || '').toLowerCase().includes(dashboardSearch.toLowerCase()) ||
                                                    (r.sitio || '').toLowerCase().includes(dashboardSearch.toLowerCase())
                                                )
                                                .sort((a, b) => {
                                                    if (dashboardSort === 'usage') {
                                                        const useA = a.devices.reduce((acc, d) => acc + (d.u_height || 1), 0);
                                                        const useB = b.devices.reduce((acc, d) => acc + (d.u_height || 1), 0);
                                                        return useB - useA;
                                                    }
                                                    if (dashboardSort === 'power') return (b.consumo || 0) - (a.consumo || 0);
                                                    return a.tag_id.localeCompare(b.tag_id);
                                                })
                                                .map((rack) => {
                                                    const usedU = rack.devices.reduce((acc, d) => acc + (d.u_height || 1), 0);
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
                                                                {/* Modern Vertical Gauge */}
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

                                    {/* Right: Live Industrial Preview */}
                                    <div className="glass-card p-6 bg-white border-slate-200/60 w-full lg:w-[380px] flex flex-col min-h-0 shadow-2xl relative overflow-hidden group/preview">
                                        {/* Background Decor */}
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
                                                    <div className="flex-1 overflow-hidden scale-[0.9] origin-top">
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
                            </div>
                        </>
                    )}

                    {activeTab === 'inventory' && (
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
                    )}

                    {activeTab === 'floorplan' && (
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
                                        <div className="col-span-full glass-card bg-white p-12 border-slate-200/60 border-dashed border-2 flex flex-col items-center justify-center text-slate-400">
                                            <AlertTriangle size={48} className="mb-4 opacity-10" />
                                            <p className="font-medium text-lg text-slate-900">No hay sitios registrados</p>
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
                                            className="glass-card bg-white p-8 border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 group shadow-sm"
                                        >
                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                                <Box size={32} />
                                            </div>
                                            <div className="text-center">
                                                <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-widest">{sala}</h4>
                                                <p className="text-slate-500 text-xs mt-2 font-mono">
                                                    {assets.filter(a => a.sitio === viewingSite && a.sala === sala).length} RACKS
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setViewingSite(null)}
                                        className="glass-card bg-white p-8 border-slate-200/60 border-dashed hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-900"
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
                                        <div className="w-[450px] glass-card bg-white border-slate-200/60 flex flex-col items-center justify-center p-8 text-center shadow-sm">
                                            <Box size={48} className="text-slate-200 mb-4" />
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
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                            onClick={() => setIsRackModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-7xl h-[85vh] glass-card border-white/10 shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Modal Header Overlay */}
                            <div className="absolute top-6 right-6 z-50">
                                <button
                                    onClick={() => setIsRackModalOpen(false)}
                                    className="p-3 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-2xl transition-all border border-white/10 hover:border-red-500/30"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <RackLayout rack={selectedRack} />
                            </div>
                        </motion.div>
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
            {
                showClearAllConfirm && (
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
                )
            }
        </div >
    )
}

export default App
