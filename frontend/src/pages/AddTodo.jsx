import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, ClipboardList, Flag, Loader2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

const AddTodo = () => {
  const { token } = useAuth();
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'Medium' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTodos = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/todos`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.headers.get("content-type")?.includes("application/json")) throw new Error("Todo API is not available on the connected backend. Deploy the latest backend before using todos."); const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTodos(data.data);
    } catch (err) { setError(err.message || 'Unable to load todos'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (token) loadTodos(); }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('Add a title for this todo.');
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      if (!res.headers.get("content-type")?.includes("application/json")) throw new Error("Todo API is not available on the connected backend. Deploy the latest backend before using todos."); const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTodos((current) => [data.data, ...current]);
      setForm({ title: '', description: '', dueDate: '', priority: 'Medium' });
    } catch (err) { setError(err.message || 'Unable to create todo'); }
    finally { setSaving(false); }
  };

  const toggle = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/todos/${id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      if (!res.headers.get("content-type")?.includes("application/json")) throw new Error("Todo API is not available on the connected backend. Deploy the latest backend before using todos."); const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setTodos((current) => current.map((todo) => todo._id === id ? data.data : todo));
    } catch (err) { setError(err.message || 'Unable to update todo'); }
  };

  return <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8"><div className="max-w-5xl mx-auto font-sans">
    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"><ArrowLeft className="w-4 h-4" /> Back to dashboard</Link>
    <div className="mb-8"><h1 className="text-3xl font-extrabold tracking-tight">Add Todo</h1><p className="text-sm text-slate-400 mt-1">Capture a follow-up and keep your work moving.</p></div>
    {error && <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
    <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-6">
      <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="w-5 h-5 text-indigo-400" /> New todo</h2>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Title <span className="text-rose-400">*</span><input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="e.g. Follow up with the supplier" className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm normal-case font-normal text-slate-100 outline-none focus:border-indigo-500" /></label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Add useful context..." className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm normal-case font-normal text-slate-100 outline-none focus:border-indigo-500 resize-y" /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Due date<div className="relative mt-2"><CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500" /></div></label><label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Priority<div className="relative mt-2"><Flag className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500"><option>Low</option><option>Medium</option><option>High</option></select></div></label></div>
        <button type="submit" disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{saving ? 'Adding...' : 'Add Todo'}</button>
      </form>
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6"><h2 className="flex items-center gap-2 text-lg font-bold mb-5"><ClipboardList className="w-5 h-5 text-indigo-400" /> Your todos</h2>{loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div> : todos.length === 0 ? <div className="text-center py-12 text-sm text-slate-500">No todos yet. Add your first follow-up.</div> : <div className="space-y-3">{todos.map((todo) => <div key={todo._id} className={`rounded-xl border border-slate-800 bg-slate-950/40 p-4 ${todo.status === 'Completed' ? 'opacity-60' : ''}`}><div className="flex items-start gap-3"><button onClick={() => toggle(todo._id)} className="mt-0.5 text-slate-500 hover:text-emerald-400" aria-label="Toggle todo">{todo.status === 'Completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5" />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-semibold ${todo.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-100'}`}>{todo.title}</h3><span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">{todo.priority}</span></div>{todo.description && <p className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">{todo.description}</p>}{todo.dueDate && <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500"><CalendarDays className="w-3.5 h-3.5" /> Due {new Date(todo.dueDate).toLocaleDateString()}</p>}</div></div></div>)}</div>}</section>
    </div>
  </div></div>;
};

export default AddTodo;
