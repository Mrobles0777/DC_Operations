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
            <div className="flex-1 flex flex-col items-center justify-center text-blue-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="text-lg font-medium">Cargando usuarios...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-100">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Error de conexión</h3>
                <p className="text-slate-500 max-w-md">{error}</p>
                <button
                    onClick={fetchData}
                    className="mt-6 px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 transition-all font-bold shadow-sm"
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
                    <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="text-blue-600" />
                        Administración de Usuarios
                    </h3>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Gestiona los permisos y accesos de los operadores del sistema</p>
                </div>
                <button
                    onClick={() => setIsAddingUser(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center gap-2"
                >
                    <Users size={18} />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-white flex-1 p-8 border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 backdrop-blur-md text-slate-500 text-[10px] uppercase tracking-[0.2em] sticky top-0 z-10 font-bold">
                            <tr>
                                <th className="py-4 px-6 border-b border-slate-100">Nombre</th>
                                <th className="py-4 px-6 border-b border-slate-100">Email</th>
                                <th className="py-4 px-6 border-b border-slate-100">Rol</th>
                                <th className="py-4 px-6 border-b border-slate-100">Estado</th>
                                <th className="py-4 px-6 border-b border-slate-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map((user) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                                                {user.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-900">{user.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                                            <Mail size={14} className="opacity-70 text-blue-600" />
                                            {user.email}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-blue-600" />
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold ring-1 ring-blue-100">
                                                {user.roles?.nombre || 'Sin Rol'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${user.activo
                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                            : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${user.activo ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-xl transition-all border border-transparent hover:border-blue-100"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2.5 hover:bg-red-50 text-red-600 rounded-xl transition-all border border-transparent hover:border-red-100"
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
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
                        >
                            <form onSubmit={handleUpdateUser} className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        <Edit2 className="text-blue-600" size={20} />
                                        Editar Usuario
                                    </h4>
                                    <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={editingUser.nombre}
                                            onChange={e => setEditingUser({ ...editingUser, nombre: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all"
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Email (No editable)</label>
                                        <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-slate-400 font-mono text-sm cursor-not-allowed">
                                            {editingUser.email}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Asignar Rol</label>
                                        <select
                                            value={editingUser.rol_id}
                                            onChange={e => setEditingUser({ ...editingUser, rol_id: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all cursor-pointer appearance-none"
                                        >
                                            {roles.map(role => (
                                                <option key={role.id} value={role.id}>{role.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div>
                                            <span className="text-sm font-bold text-slate-900">Estado del Usuario</span>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-bold">Permitir acceso al sistema</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditingUser({ ...editingUser, activo: !editingUser.activo })}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${editingUser.activo ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${editingUser.activo ? 'translate-x-6' : 'translate-x-1'} shadow-sm`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-10">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
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
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
                        >
                            <form onSubmit={handleCreateUser} className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        <Users className="text-blue-600" size={20} />
                                        Nuevo Usuario
                                    </h4>
                                    <button type="button" onClick={() => setIsAddingUser(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Nombre Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUser.nombre}
                                            onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all"
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={newUser.email}
                                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all"
                                            placeholder="usuario@ejemplo.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            value={newUser.password}
                                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-2 block font-bold">Asignar Rol</label>
                                        <select
                                            value={newUser.rol_id}
                                            onChange={e => setNewUser({ ...newUser, rol_id: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all cursor-pointer appearance-none"
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
                                        className="flex-1 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
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
