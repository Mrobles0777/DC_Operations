import { LayoutDashboard, Database, Map as MapIcon, Users, Settings, X } from 'lucide-react'

interface SidebarProps {
    activeTab: string
    setActiveTab: (tab: string) => void
    isMobileMenuOpen: boolean
    setIsMobileMenuOpen: (open: boolean) => void
    onLogout: () => void
    resetFloorPlan: () => void
}

export const Sidebar = ({ 
    activeTab, 
    setActiveTab, 
    isMobileMenuOpen, 
    setIsMobileMenuOpen, 
    onLogout,
    resetFloorPlan
}: SidebarProps) => {
    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'inventory', icon: Database, label: 'Inventario' },
        { id: 'floorplan', icon: MapIcon, label: 'Planos' },
        { id: 'users', icon: Users, label: 'Usuarios' },
        { id: 'settings', icon: Settings, label: 'Configuración' },
    ]

    return (
        <>
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
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                                if (item.id === 'floorplan') {
                                    resetFloorPlan();
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
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                    >
                        <X size={20} />
                        <span className="font-medium uppercase tracking-widest text-xs">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
