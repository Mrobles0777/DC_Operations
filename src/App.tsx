import { useRef, useMemo, useState, useEffect } from 'react'
import { FileSpreadsheet, Download, Save, Check, Box, Menu } from 'lucide-react'
import { motion } from 'framer-motion'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useInventory } from './hooks/useInventory'
import { useDashboardStats } from './hooks/useDashboardStats'

// Components
import { Login } from './components/Login'
import { Sidebar } from './components/layout/Sidebar'
import { DashboardView } from './components/views/DashboardView'
import { InventoryView } from './components/views/InventoryView'
import { FloorPlanView } from './components/views/FloorPlanView'
import { ImportPreviewModal } from './components/ImportPreviewModal'
import { StatusIndicators } from './components/StatusIndicators'
import { AssetEntryView } from './components/views/AssetEntryView'

// Utils
import { downloadTemplate, RackAsset } from './utils/excelUtils'

const INITIAL_ASSETS: RackAsset[] = []

function App() {
    // Custom Hooks
    const { user, authLoading, logout, setUser } = useAuth()
    const { 
        assets, 
        isSaving, 
        isLoading,
        saveStatus, 
        handleSaveInventory, 
        handleClearAllInventory,
        availableSites, 
        importFromExcel, 
        confirmImport, 
        deleteAsset, 
        updateAssetDevices,
        addAsset,
        addDeviceToRack
    } = useInventory(INITIAL_ASSETS)

    // UI States
    const [activeTab, setActiveTab] = useState('dashboard')
    const [previewData, setPreviewData] = useState<RackAsset[]>([])
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [selectedRack, setSelectedRack] = useState<RackAsset | null>(null)
    const [assetToDelete, setAssetToDelete] = useState<RackAsset | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [selectedSite, setSelectedSite] = useState<string>('all')
    const [viewingSite, setViewingSite] = useState<string | null>(null)
    const [viewingSala, setViewingSala] = useState<string | null>(null)
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Dashboard States
    const [dashboardSearch, setDashboardSearch] = useState('')
    const [dashboardSort, setDashboardSort] = useState<'id' | 'usage' | 'power'>('id')
    const [dashboardSelectedRack, setDashboardSelectedRack] = useState<RackAsset | null>(null)

    // Reset rack selection when site changes (ensures stats return to global site view)
    useEffect(() => {
        setDashboardSelectedRack(null);
    }, [selectedSite]);

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Memoized Stats
    const stats = useDashboardStats(assets, selectedSite)

    // Dynamic Room Calculation
    const dynamicRoom = useMemo(() => {
        if (!viewingSite || !viewingSala) return { width: 20, height: 20, name: 'Cargando...' };
        const roomAssets = assets.filter(a => a.sitio === viewingSite && a.sala === viewingSala);
        let maxX = 10, maxZ = 10;
        roomAssets.forEach(a => {
            if (a.pos_x > maxX) maxX = a.pos_x;
            if (a.pos_z > maxZ) maxZ = a.pos_z;
        });
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
            const data = await importFromExcel(file)
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

    const openRackDetail = (rack: RackAsset) => {
        setSelectedRack(rack);
        setActiveTab('inventory');
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
        <div className="premium-bg flex flex-col md:flex-row min-h-screen overflow-x-hidden text-slate-900 relative">
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

            {/* Premium Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-[100] bg-slate-900/10 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Sincronizando con Datacenter...</p>
                    </div>
                </div>
            )}

            <Sidebar 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                onLogout={logout}
                resetFloorPlan={() => { setViewingSite(null); setViewingSala(null); }}
            />

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
                        <DashboardView 
                            stats={stats}
                            assets={assets}
                            selectedSite={selectedSite}
                            setSelectedSite={setSelectedSite}
                            availableSites={availableSites}
                            dashboardSearch={dashboardSearch}
                            setDashboardSearch={setDashboardSearch}
                            dashboardSort={dashboardSort}
                            setDashboardSort={setDashboardSort}
                            dashboardSelectedRack={dashboardSelectedRack}
                            setDashboardSelectedRack={setDashboardSelectedRack}
                            openRackDetail={openRackDetail}
                        />
                    )}

                    {activeTab === 'inventory' && (
                        <InventoryView 
                            assets={assets}
                            selectedRack={selectedRack}
                            setSelectedRack={setSelectedRack}
                            setShowClearAllConfirm={setShowClearAllConfirm}
                            setAssetToDelete={setAssetToDelete}
                            setShowDeleteConfirm={setShowDeleteConfirm}
                            setActiveTab={setActiveTab}
                        />
                    )}

                    {activeTab === 'floorplan' && (
                        <FloorPlanView 
                            viewingSite={viewingSite}
                            setViewingSite={setViewingSite}
                            viewingSala={viewingSala}
                            setViewingSala={setViewingSala}
                            availableSites={availableSites}
                            assets={assets}
                            selectedRack={selectedRack}
                            setSelectedRack={setSelectedRack}
                            dynamicRoom={dynamicRoom}
                            updateAssetDevices={updateAssetDevices}
                        />
                    )}

                    {activeTab === 'assetentry' && (
                        <AssetEntryView 
                            assets={assets}
                            onCancel={() => setActiveTab('inventory')}
                            onSave={(newAsset: any, targetRackId?: string) => {
                                if (targetRackId) {
                                    addDeviceToRack(targetRackId, newAsset);
                                } else {
                                    addAsset(newAsset as RackAsset);
                                }
                                setActiveTab('inventory');
                            }}
                        />
                    )}
                </section>
            </main>

            {/* Modals & Overlays */}
            <ImportPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                data={previewData}
                onConfirm={confirmImport}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Rack?</h3>
                        <p className="text-slate-500 mb-6">Esta acción no se puede deshacer. Se eliminará el rack <span className="font-bold text-slate-900">{assetToDelete?.tag_id}</span> y todos sus dispositivos asociados.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancelar</button>
                            <button onClick={() => { if(assetToDelete) deleteAsset(assetToDelete.id); setShowDeleteConfirm(false); }} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200">Eliminar</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Clear All Confirmation Modal */}
            {showClearAllConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                            <Box size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">¿Limpiar Inventario?</h3>
                        <p className="text-slate-500 mb-6 font-medium">Estás a punto de borrar <span className="text-red-600 font-bold">{assets.length}</span> activos. Esta acción es irreversible.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowClearAllConfirm(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Conservar Datos</button>
                            <button 
                                onClick={() => {
                                    handleClearAllInventory();
                                    setShowClearAllConfirm(false);
                                }} 
                                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-all shadow-xl"
                            >
                                Sí, Limpiar Todo
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default App
