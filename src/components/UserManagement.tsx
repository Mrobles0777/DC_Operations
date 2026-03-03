import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Edit2, Trash2, Shield, Mail, X, AlertCircle, Loader2, Save } from 'lucide-react';

interface User {
    id: string;
    nombre: string;
    email: string;
    rol_id: string;
    activo: boolean;
    created_at: string;
    roles?: {
        nombre: string;
    };
}

interface Role {
    id: string;
    nombre: string;
}

export const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({ nombre: '', email: '', rol_id: '', password: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, rolesRes] = await Promise.all([
                supabase
                    .from('usuarios')
                    .select('*, roles(nombre)')
                    .order('created_at', { ascending: false }),
                supabase.from('roles').select('id, nombre')
            ]);

            if (usersRes.error) throw usersRes.error;
            if (rolesRes.error) throw rolesRes.error;

            setUsers(usersRes.data || []);
            const fetchedRoles = rolesRes.data || [];
            setRoles(fetchedRoles);

            // Set default role for new user
            if (fetchedRoles.length > 0 && !newUser.rol_id) {
                setNewUser(prev => ({ ...prev, rol_id: fetchedRoles[0].id }));
            }
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError('No se pudieron cargar los datos de los usuarios. Asegúrate de que las tablas existan en Supabase.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.nombre || !newUser.email || !newUser.password) {
            alert('Por favor completa todos los campos.');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .insert([{
                    nombre: newUser.nombre,
                    email: newUser.email,
                    rol_id: newUser.rol_id,
                    password_hash: newUser.password, // Simple for dev
                    activo: true
                }]);

            if (error) throw error;

            await fetchData();
            setIsAddingUser(false);
            setNewUser({ nombre: '', email: '', rol_id: roles[0]?.id || '', password: '' });
        } catch (err: any) {
            console.error('Error creating user:', err);
            alert('Error al crear el usuario: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({
                    nombre: editingUser.nombre,
                    rol_id: editingUser.rol_id,
                    activo: editingUser.activo
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            await fetchData();
            setEditingUser(null);
        } catch (err: any) {
            console.error('Error updating user:', err);
            alert('Error al actualizar el usuario: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

        try {
            const { error } = await supabase.from('usuarios').delete().eq('id', id);
            if (error) throw error;
            setUsers(users.filter(u => u.id !== id));
        } catch (err: any) {
            console.error('Error deleting user:', err);
            alert('Error al eliminar el usuario.');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-blue-400">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="text-lg font-medium">Cargando usuarios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Error de conexión</h3>
                <p className="text-slate-400 max-w-md">{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all font-bold"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 gap-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="text-blue-500" />
                        Administración de Usuarios
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Gestiona los permisos y accesos de los operadores del sistema</p>
                </div>
                <button
                    onClick={() => setIsAddingUser(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2"
                >
                    <Users size={18} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="glass-card flex-1 p-8 border-white/5 overflow-hidden flex flex-col shadow-xl">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-[#0f172a]/80 backdrop-blur-md text-slate-400 text-[10px] uppercase tracking-[0.2em] sticky top-0 z-10">
                            <tr>
                                <th className="py-4 px-6 border-b border-white/5">Nombre</th>
                                <th className="py-4 px-6 border-b border-white/5">Email</th>
                                <th className="py-4 px-6 border-b border-white/5">Rol</th>
                                <th className="py-4 px-6 border-b border-white/5">Estado</th>
                                <th className="py-4 px-6 border-b border-white/5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">
                                                {user.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-white">{user.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Mail size={14} className="opacity-50" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-blue-400" />
                                            <span className="px-3 py-1 bg-blue-600/10 text-blue-400 rounded-lg text-xs font-bold ring-1 ring-blue-500/20">
                                                {user.roles?.nombre || 'Sin Rol'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${user.activo
                                            ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
                                            : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.activo ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-2.5 hover:bg-blue-600/20 text-blue-400 rounded-xl transition-all border border-transparent hover:border-blue-500/30"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2.5 hover:bg-red-600/20 text-red-500 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                                                title="Eliminar Usuario"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            <Users size={48} className="mx-auto mb-4 opacity-10" />
                            <p>No hay usuarios registrados en el sistema.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditingUser(null)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md glass-card border-white/10 shadow-2xl overflow-hidden"
                        >
                            <form onSubmit={handleUpdateUser} className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                                        <Edit2 className="text-blue-500" size={20} />
                                        Editar Usuario
                                    </h4>
                                    <button type="button" onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={editingUser.nombre}
                                            onChange={e => setEditingUser({ ...editingUser, nombre: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Email (No editable)</label>
                                        <div className="w-full bg-slate-900/30 border border-white/5 rounded-xl px-4 py-3 text-slate-500 font-mono text-sm cursor-not-allowed">
                                            {editingUser.email}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Asignar Rol</label>
                                        <select
                                            value={editingUser.rol_id}
                                            onChange={e => setEditingUser({ ...editingUser, rol_id: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none shadow-inner"
                                        >
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                        <div>
                                            <span className="text-sm font-bold text-white">Estado del Usuario</span>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Permitir acceso al sistema</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditingUser({ ...editingUser, activo: !editingUser.activo })}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${editingUser.activo ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${editingUser.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all border border-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={18} />}
                                        Guardar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Create Modal */}
            <AnimatePresence>
                {isAddingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddingUser(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md glass-card border-white/10 shadow-2xl overflow-hidden"
                        >
                            <form onSubmit={handleCreateUser} className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                                        <Users className="text-blue-500" size={20} />
                                        Nuevo Usuario
                                    </h4>
                                    <button type="button" onClick={() => setIsAddingUser(false)} className="text-slate-500 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Nombre Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUser.nombre}
                                            onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                                            placeholder="usuario@ejemplo.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-2 block">Asignar Rol</label>
                                        <select
                                            value={newUser.rol_id}
                                            onChange={e => setNewUser({ ...newUser, rol_id: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer appearance-none shadow-inner"
                                        >
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingUser(false)}
                                        className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all border border-white/5"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save size={18} />}
                                        Crear
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
