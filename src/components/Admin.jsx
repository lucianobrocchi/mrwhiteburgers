import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const IMAGE_KEYS = ['curri_white', 'obrera', 'chesse_joa', 'big_white', 'oklahoma', 'joa_white']
const inputCls =
  'w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#F0C832]/60 transition-colors'
const labelCls = 'text-[10px] tracking-[0.18em] uppercase text-white/40'

function Centered({ children }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelCls} style={{ fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
      {children}
    </label>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    setLoading(false)
    if (error) setErr('Email o contraseña incorrectos.')
  }

  return (
    <Centered>
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="text-4xl text-white uppercase mb-1" style={{ fontFamily: 'Anton, sans-serif' }}>
          Mr. White <span className="text-[#F0C832]">Admin</span>
        </h1>
        <p className="text-white/50 text-sm mb-8">Ingresá para editar el menú.</p>
        <div className="flex flex-col gap-4">
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="username" />
          </Field>
          <Field label="Contraseña">
            <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)} className={inputCls} autoComplete="current-password" />
          </Field>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-full text-black text-sm tracking-widest uppercase disabled:opacity-60"
            style={{ fontFamily: 'Anton, sans-serif', backgroundColor: '#F0C832' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </Centered>
  )
}

function BurgerEditor({ burger, onChanged }) {
  const [form, setForm] = useState({
    name: burger.name || '',
    tag: burger.tag || '',
    description: burger.description || '',
    image_key: burger.image_key || '',
    simple: burger.prices?.simple ?? 0,
    doble: burger.prices?.doble ?? 0,
    triple: burger.prices?.triple ?? 0,
    sort_order: burger.sort_order ?? 0,
    active: burger.active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false) }

  const save = async () => {
    setSaving(true)
    const payload = {
      name: form.name,
      tag: form.tag,
      description: form.description,
      image_key: form.image_key || null,
      prices: { simple: Number(form.simple), doble: Number(form.doble), triple: Number(form.triple) },
      sort_order: Number(form.sort_order),
      active: form.active,
    }
    const { error } = await supabase.from('burgers').update(payload).eq('id', burger.id)
    setSaving(false)
    if (error) { alert('Error al guardar: ' + error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onChanged?.()
  }

  const del = async () => {
    if (!window.confirm(`¿Borrar "${form.name}"? No se puede deshacer.`)) return
    const { error } = await supabase.from('burgers').delete().eq('id', burger.id)
    if (error) { alert('Error al borrar: ' + error.message); return }
    onChanged?.()
  }

  return (
    <div
      className="rounded-2xl p-5 md:p-6"
      style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.08)', opacity: form.active ? 1 : 0.6 }}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-2xl text-white uppercase truncate" style={{ fontFamily: 'Anton, sans-serif' }}>
          {form.name || '—'}
        </span>
        <span
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
          style={{ backgroundColor: 'rgba(240,200,50,0.1)', border: '1px solid rgba(240,200,50,0.3)', color: '#F0C832', fontFamily: 'DM Sans, sans-serif' }}
          title="Clics en Agregar"
        >
          👆 {burger.clicks ?? 0} clics
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre">
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Tag (ej. La Más Pedida)">
          <input value={form.tag} onChange={(e) => set('tag', e.target.value)} className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descripción">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className={inputCls + ' resize-y'} />
          </Field>
        </div>
        <Field label="Precio simple">
          <input type="number" value={form.simple} onChange={(e) => set('simple', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Precio doble">
          <input type="number" value={form.doble} onChange={(e) => set('doble', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Precio triple">
          <input type="number" value={form.triple} onChange={(e) => set('triple', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Orden">
          <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Foto">
          <select value={form.image_key} onChange={(e) => set('image_key', e.target.value)} className={inputCls}>
            <option value="">(sin foto)</option>
            {IMAGE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <label className="flex items-center gap-2.5 mt-1">
          <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4 accent-[#F0C832]" />
          <span className="text-sm text-white/80" style={{ fontFamily: 'DM Sans, sans-serif' }}>Visible en el sitio</span>
        </label>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 rounded-full text-black text-sm tracking-widest uppercase disabled:opacity-60"
          style={{ fontFamily: 'Anton, sans-serif', backgroundColor: saved ? '#4ade80' : '#F0C832' }}
        >
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
        <button
          onClick={del}
          className="px-4 py-2.5 rounded-full text-sm tracking-wide uppercase text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          Borrar
        </button>
      </div>
    </div>
  )
}

export default function Admin() {
  const [session, setSession] = useState(undefined) // undefined = cargando
  const [burgers, setBurgers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('burgers').select('*').order('sort_order', { ascending: true })
    setBurgers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (session) load() }, [session, load])

  if (session === undefined) return <Centered><p className="text-white/60">Cargando…</p></Centered>
  if (!session) return <Login />

  const addNew = async () => {
    const maxOrder = burgers.reduce((m, b) => Math.max(m, b.sort_order || 0), 0)
    const { error } = await supabase.from('burgers').insert({
      name: 'NUEVA BURGER', description: '', prices: { simple: 0, doble: 0, triple: 0 },
      sort_order: maxOrder + 1, active: false,
    })
    if (error) { alert(error.message); return }
    load()
  }

  const totalClicks = burgers.reduce((s, b) => s + (b.clicks || 0), 0)

  return (
    <div className="min-h-screen bg-black px-5 md:px-10 py-8" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl text-white uppercase leading-none" style={{ fontFamily: 'Anton, sans-serif' }}>
              Mr. White <span className="text-[#F0C832]">Admin</span>
            </h1>
            <p className="text-white/45 text-sm mt-2">{burgers.length} burgers · {totalClicks} clics totales</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-white/60 hover:text-white transition-colors">Ver sitio →</a>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 rounded-full text-sm uppercase tracking-wide text-white/70 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Salir
            </button>
          </div>
        </div>

        <button
          onClick={addNew}
          className="mb-6 px-5 py-2.5 rounded-full text-sm tracking-widest uppercase text-[#F0C832]"
          style={{ border: '1px solid rgba(240,200,50,0.4)', fontFamily: 'Anton, sans-serif' }}
        >
          + Agregar burger
        </button>

        {loading ? (
          <p className="text-white/50">Cargando burgers…</p>
        ) : (
          <div className="flex flex-col gap-5">
            {burgers.map((b) => <BurgerEditor key={b.id} burger={b} onChanged={load} />)}
            {!burgers.length && (
              <p className="text-white/50">No hay burgers todavía. Corré el SQL de seed o tocá “Agregar burger”.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
