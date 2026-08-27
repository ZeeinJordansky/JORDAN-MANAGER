import React, { useEffect, useState } from 'react';
import { panelApi } from '../api';
import { PanelUser } from '../types';
import { Users, Trash2, UserPlus, Shield, RefreshCw } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form
  const [newLogin, setNewLogin] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'moderator'>('admin');

  const fetchUsers = async () => {
    try {
      const data = await panelApi.getPanelUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogin || !newPass) return;
    try {
      await panelApi.createPanelUser(newLogin, newPass, newRole);
      setNewLogin('');
      setNewPass('');
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя панели?')) return;
    try {
      await panelApi.deletePanelUser(id);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="flex justify-center p-10 text-slate-500"><RefreshCw className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Управление пользователями панели</h2>
        <p className="text-xs text-slate-400">Создание и удаление аккаунтов для доступа в панель управления</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-4">
          {users.map((u) => (
            <div key={u.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${u.role === 'root' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                  {u.role === 'root' ? <Shield className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{u.login}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'root' ? 'bg-red-500/20 text-red-400' : 
                      u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {u.role}
                    </span>
                    {u.createdAt > 0 && (
                      <span className="text-[10px] text-slate-500">
                        Создан: {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {u.role !== 'root' && (
                <button
                  onClick={() => handleDelete(u.id)}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            Добавить пользователя
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Логин</label>
              <input
                type="text"
                value={newLogin}
                onChange={e => setNewLogin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Пароль</label>
              <input
                type="text"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Роль (права)</label>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="admin">Администратор</option>
                <option value="moderator">Модератор</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Создать аккаунт
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
