import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { api, json } from './api'
import AuthProvider from './AuthProvider'
import useAuth from './useAuth'
import './App.css'

const nav = [
  ['dashboard', '▦', 'Dashboard', true], ['products', '◫', 'Products', false],
  ['sales', '↗', 'Sales', false], ['inventory', '☷', 'Stock history', true],
  ['restocks', '↻', 'Restocks', false], ['categories', '◇', 'Categories', true],
  ['wishlist', '♡', 'Wishlist', false],
  ['settings', '⚙', 'Settings', false],
]
const money = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const stockLabel = (item) => !item ? 'No stock record' : item.stock_quantity === 0 ? 'Out of stock' : item.stock_quantity <= item.reorder_level ? 'Low stock' : 'In stock'

function Field({ label, children, error }) { return <label className="field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label> }
function Badge({ children, tone = '' }) { return <span className={`badge ${tone}`}>{children}</span> }
function Metric({ label, value, note, icon, accent = '' }) { return <article className={`metric ${accent}`}><div className="metric-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{note}</small></article> }

function Login({ onLogin, busy, error, errors }) {
  const [registering, setRegistering] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return <main className="login-page"><section className="login-card"><div className="brand-mark large">M</div><p className="eyebrow">MINI STORE INVENTORY</p><h1>{registering ? 'Create your account.' : 'Good to see you.'}</h1><p className="muted">{registering ? 'Register to start managing your store.' : 'Sign in to manage your store.'}</p>
    <form onSubmit={(e) => { e.preventDefault(); onLogin({ name, email, password }, registering) }} className="login-form">
      {registering && <Field label="Name" error={errors.name?.[0]}><input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></Field>}
      <Field label="Email" error={errors.email?.[0]}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
      <Field label="Password" error={errors.password?.[0]}><input type="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
      {error && <p className="error-text">{error}</p>}
      <button className="button primary full" disabled={busy}>{busy ? (registering ? 'Creating account…' : 'Signing in…') : (registering ? 'Create account' : 'Sign in')} <span>→</span></button>
    </form>
    <p className="muted" style={{ fontSize: 11, margin: '18px 0 0', textAlign: 'center' }}>{registering ? 'Already have an account?' : 'New to the store?'} <button type="button" className="text-button" disabled={busy} onClick={() => setRegistering((value) => !value)}>{registering ? 'Sign in' : 'Create an account'}</button></p>
  </section><div className="login-side"><span className="side-caption">YOUR STORE, IN GOOD ORDER</span><h2>Know what you have.<br /><em>Know what you sell.</em></h2><p>One simple place to keep stock accurate, sales moving, and your shelves ready.</p><div className="side-doodle">M<span>✳</span></div></div></main>
}

function StoreApp() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [authReady, setAuthReady] = useState(() => !localStorage.getItem('store-token'))
  const [authError, setAuthError] = useState('')
  const [dataReady, setDataReady] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const page = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard'
  const setPage = (nextPage) => navigate(nextPage === 'dashboard' ? '/' : `/${nextPage}`)
  const [toast, setToast] = useState('')
  const [data, setData] = useState({ dashboard: null, products: [], categories: [], sales: [], transactions: [], restocks: [], wishlist: [] })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [categoryId, setCategoryId] = useState('')
  const [modal, setModal] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [editing, setEditing] = useState(null)
  const [pageNum, setPageNum] = useState(1)
  const [salesPage, setSalesPage] = useState(1)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('store-dark-mode') === 'true')
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('store-compact-mode') === 'true')

  const admin = user?.role === 'admin'
  const visibleNav = nav.filter(([, , , adminOnly]) => !adminOnly || admin)
  const notify = useCallback((message) => { setToast(message); window.setTimeout(() => setToast(''), 3200) }, [])
  const signOut = useCallback((revoke = true) => { if (revoke) api('/auth/logout', json('POST', {})).catch(() => {}); localStorage.removeItem('store-token'); setUser(null); setDataReady(false); setData({ dashboard: null, products: [], categories: [], sales: [], transactions: [], restocks: [], wishlist: [] }) }, [setUser])
  const load = useCallback(async (isCurrent = () => true) => {
    if (!user) return
    try {
      const requests = [api(`/products?search=${encodeURIComponent(search)}&status=${status}&category_id=${categoryId}&page=${pageNum}`), api('/categories'), api(`/sales?page=${salesPage}`), api('/wishlist')]
      if (admin) requests.push(api('/dashboard'), api('/inventory/transactions'), api('/restocks'))
      const result = await Promise.all(requests)
      if (isCurrent()) setData({ products: result[0].data, productMeta: result[0].meta, categories: result[1], sales: result[2].data, salesMeta: result[2].meta, wishlist: result[3], dashboard: admin ? result[4] : null, transactions: admin ? result[5].data : [], restocks: admin ? result[6].data : [] })
    } catch (error) { if (isCurrent()) { if (error.status === 401) signOut(false); else notify(error.message) } }
    finally { if (isCurrent()) setDataReady(true) }
  }, [user, admin, search, status, categoryId, pageNum, salesPage, notify, signOut])

  useEffect(() => {
    const token = localStorage.getItem('store-token')
    if (!token) return undefined

    let active = true
    api('/auth/me')
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error) => {
        if (!active) return
        if (error.status === 401) localStorage.removeItem('store-token')
        else setAuthError('Could not restore your session. Check that the API is running, then refresh.')
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => { active = false }
  }, [setUser])
  useEffect(() => {
    if (!user) return
    let active = true
    Promise.resolve().then(() => load(() => active))
    return () => { active = false }
  }, [user, load])

  async function signIn(credentials, registering) {
    setBusy(true); setLoginError('')
    try { const result = await api(registering ? '/auth/register' : '/auth/login', json('POST', credentials)); localStorage.setItem('store-token', result.token); setDataReady(false); setUser(result.user) }
    catch (error) { setLoginError(error.message); setValidationErrors(error.errors || {}) } finally { setBusy(false) }
  }
  async function mutate(path, method, body, success) {
    try { await api(path, json(method, body)); setModal(''); setEditing(null); setValidationErrors({}); notify(success); await load() }
    catch (error) { setValidationErrors(error.errors || {}); notify(error.message) }
  }
  async function submitProduct(event) {
    event.preventDefault(); const body = new FormData(event.currentTarget)
    if (editing) body.append('_method', 'PUT')
    await mutate(editing ? `/products/${editing.id}` : '/products', 'POST', body, editing ? 'Product updated.' : 'Product added.')
  }
  async function submitCategory(event) { event.preventDefault(); const form = new FormData(event.currentTarget); await mutate(editing ? `/categories/${editing.id}` : '/categories', editing ? 'PUT' : 'POST', Object.fromEntries(form.entries()), editing ? 'Category updated.' : 'Category added.') }
  async function submitStock(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries()); body.quantity = Number(body.quantity); if (!window.confirm('Save this stock adjustment?')) return; await mutate(`/products/${editing.id}/stock`, 'POST', body, 'Stock updated and recorded.') }
  async function submitSale(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = { payment_method: form.get('payment_method'), items: [...form.entries()].filter(([key]) => key.startsWith('qty-')).map(([key, quantity]) => ({ product_id: Number(key.slice(4)), quantity: Number(quantity) })).filter((item) => item.quantity > 0) }; if (!body.items.length) return notify('Add at least one item.'); await mutate('/sales', 'POST', body, 'Sale completed. Stock has been updated.') }

  async function toggleWishlist(product) {
    const saved = data.wishlist.some((item) => item.id === product.id)
    try {
      if (saved) await api(`/wishlist/${product.id}`, json('DELETE', null))
      else await api('/wishlist', json('POST', { product_id: product.id }))
      setData((current) => ({ ...current, wishlist: saved ? current.wishlist.filter((item) => item.id !== product.id) : [...current.wishlist, product] }))
      notify(saved ? 'Removed from wishlist.' : 'Added to wishlist.')
    } catch (error) { notify(error.message) }
  }

  const products = data.products || []
  if (!authReady) return <main className="auth-loading"><div className="brand-mark large">M</div><p className="eyebrow">MINI STORE INVENTORY</p><p className="muted">Restoring your session…</p><span className="loading-spinner" aria-label="Loading" /></main>
  if (!user) return <Login onLogin={signIn} busy={busy} error={loginError || authError} errors={validationErrors} />
  if (!dataReady) return <main className="auth-loading"><div className="brand-mark large">M</div><p className="eyebrow">MINI STORE INVENTORY</p><p className="muted">Loading your store…</p><span className="loading-spinner" aria-label="Loading" /></main>

  return <div className={`app-shell${darkMode ? ' dark' : ''}${compactMode ? ' compact' : ''}`}>
    <aside className="sidebar"><div className="brand"><div className="brand-mark">M</div><span>minimart<small>INVENTORY</small></span></div>
      <div className="store-label">STORE MENU</div><nav>{visibleNav.map(([id, icon, label]) => <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setPageNum(1) }}><span className="nav-icon">{icon}</span>{label}{id === 'restocks' && data.restocks?.filter((item) => item.status === 'pending').length > 0 && <i className="nav-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile-avatar">{user.name?.[0]}</div><div className="profile-info"><b>{user.name}</b><span>{admin ? 'Store admin' : 'Cashier'}</span></div><button className="icon-button logout" title="Sign out" onClick={() => signOut()} aria-label="Sign out">↪</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div><span className="breadcrumb">Store /</span> <b>{visibleNav.find(([id]) => id === page)?.[2] || 'Dashboard'}</b></div><div className="top-user"><span className="status-dot" /> Store open <span className="top-divider" /> <span>{new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}</span><button className="mobile-signout" onClick={() => signOut()} aria-label="Sign out">↪</button></div></header>
      <div className="content">
        {page === 'dashboard' && <Dashboard data={data} products={products} admin={admin} onPage={setPage} onRestock={() => { setEditing(null); setModal('restock') }} />}
        {page === 'products' && <section><div className="page-heading"><div><p className="eyebrow">CATALOGUE</p><h1>Products</h1><p className="muted">Keep your shelves and catalogue up to date.</p></div>{admin && <button className="button primary" onClick={() => { setEditing(null); setModal('product') }}>＋ Add product</button>}</div>
          <div className="toolbar"><div className="search-box"><span>⌕</span><input placeholder="Search name or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPageNum(1) }} /></div><select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPageNum(1) }}><option value="">All categories</option>{data.categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><select value={status} onChange={(e) => { setStatus(e.target.value); setPageNum(1) }}><option value="all">All stock</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><span className="result-count">{data.productMeta?.total || products.length} products</span></div>
          <ProductTable products={products} admin={admin} wishlist={data.wishlist} onWishlist={toggleWishlist} onEdit={(p) => { setValidationErrors({}); setEditing(p); setModal('product') }} onStock={(p) => { setValidationErrors({}); setEditing(p); setModal('stock') }} onDelete={(p) => window.confirm(`Archive ${p.name}?`) && mutate(`/products/${p.id}`, 'DELETE', null, 'Product archived.')} />
          <Pagination meta={data.productMeta} onChange={setPageNum} /></section>}
        {page === 'sales' && <section><div className="page-heading"><div><p className="eyebrow">CHECKOUT</p><h1>Sales & order tracking</h1><p className="muted">Record a sale or review its fulfillment status.</p></div><button className="button primary" onClick={() => setModal('sale')}>＋ New sale</button></div><SalesTable sales={data.sales} admin={admin} onStatus={(sale, value) => value !== 'cancelled' || window.confirm('Cancel this order and return its items to stock?') ? mutate(`/sales/${sale.id}/status`, 'PATCH', { status: value }, `Order marked ${value}.`) : null} /><Pagination meta={data.salesMeta} onChange={setSalesPage} /></section>}
        {page === 'inventory' && <section><div className="page-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h1>Stock history</h1><p className="muted">Every stock movement, with its reason and time.</p></div></div><article className="panel low-panel inventory-alerts"><div className="panel-head"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Low stock alerts</h2></div><Badge tone="amber">{data.dashboard?.low_stock_count || 0} items</Badge></div>{data.dashboard?.low_stock_items?.length ? <div className="low-list">{data.dashboard.low_stock_items.map((product) => <div className="low-row" key={product.id}><div className="product-avatar">{product.name[0]}</div><div className="low-product"><b>{product.name}</b><small>{product.sku} · reorder at {product.inventory?.reorder_level ?? 0}</small></div><Badge tone={product.inventory?.stock_quantity === 0 ? 'red' : 'amber'}>{product.inventory?.stock_quantity ?? 0} left</Badge></div>)}</div> : <div className="empty compact"><span>✳</span><b>All shelves are looking good</b><small>No products are below their reorder level.</small></div>}</article><TransactionTable rows={data.transactions} /></section>}
        {page === 'categories' && <section><div className="page-heading"><div><p className="eyebrow">ORGANIZE</p><h1>Categories</h1><p className="muted">Group products so your catalogue stays easy to browse.</p></div><button className="button primary" onClick={() => { setEditing(null); setModal('category') }}>＋ Add category</button></div><CategoryList categories={data.categories} onEdit={(c) => { setEditing(c); setModal('category') }} onDelete={(c) => window.confirm(`Delete ${c.name}? Products will become uncategorized.`) && mutate(`/categories/${c.id}`, 'DELETE', null, 'Category deleted.')} /></section>}
        {page === 'restocks' && <section><div className="page-heading"><div><p className="eyebrow">REPLENISHMENT</p><h1>Restocks</h1><p className="muted">{admin ? 'Approve requests, then receive stock when it arrives.' : 'Request stock and follow its delivery status.'}</p></div><button className="button primary" onClick={() => setModal('restock')}>＋ New request</button></div><RestockTable rows={data.restocks} admin={admin} onStatus={(item, status) => mutate(`/restocks/${item.id}`, 'PATCH', { status }, status === 'approved' ? 'Request approved.' : 'Stock received and inventory updated.')} /></section>}
        {page === 'wishlist' && <section><div className="page-heading"><div><p className="eyebrow">SAVED PRODUCTS</p><h1>Wishlist</h1><p className="muted">Keep a personal list of products to follow up on.</p></div></div><ProductTable products={data.wishlist} admin={admin} wishlist={data.wishlist} onWishlist={toggleWishlist} onEdit={(p) => { setEditing(p); setModal('product') }} onStock={(p) => { setEditing(p); setModal('stock') }} onDelete={(p) => window.confirm(`Archive ${p.name}?`) && mutate(`/products/${p.id}`, 'DELETE', null, 'Product archived.')} /></section>}
        {page === 'settings' && <Settings darkMode={darkMode} compactMode={compactMode} onDarkMode={(value) => { setDarkMode(value); localStorage.setItem('store-dark-mode', String(value)) }} onCompactMode={(value) => { setCompactMode(value); localStorage.setItem('store-compact-mode', String(value)) }} user={user} />}
      </div>
    </main>
    {modal && <Modal title={{ product: editing ? 'Edit product' : 'Add product', category: editing ? 'Edit category' : 'Add category', stock: `Update stock · ${editing?.name ?? 'product'}`, sale: 'New sale', restock: 'New restock request' }[modal]} onClose={() => { setModal(''); setEditing(null); setValidationErrors({}) }}>
      {modal === 'product' && <form className="modal-form" onSubmit={submitProduct}><Field label="Product name" error={validationErrors.name?.[0]}><input name="name" defaultValue={editing?.name} required autoFocus /></Field><div className="form-row"><Field label="SKU / barcode" error={validationErrors.sku?.[0]}><input name="sku" defaultValue={editing?.sku} required /></Field><Field label="Price" error={validationErrors.price?.[0]}><input name="price" type="number" min="0" step="0.01" defaultValue={editing?.price} required /></Field></div><div className="form-row"><Field label="Category" error={validationErrors.category_id?.[0]}><select name="category_id" defaultValue={editing?.category_id || ''}><option value="">Uncategorized</option>{data.categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Reorder level" error={validationErrors.reorder_level?.[0]}><input name="reorder_level" type="number" min="0" defaultValue={editing?.inventory?.reorder_level ?? 5} /></Field></div><Field label="Description" error={validationErrors.description?.[0]}><textarea name="description" rows="2" defaultValue={editing?.description} /></Field><Field label="Product image (optional)" error={validationErrors.image?.[0]}>{editing?.image_url && <img className="product-preview" src={editing.image_url} alt={editing.name} />}<input name="image" type="file" accept="image/*" /></Field><ModalActions onCancel={() => { setModal(''); setValidationErrors({}) }} label="Save product" /></form>}
      {modal === 'category' && <form className="modal-form" onSubmit={submitCategory}><Field label="Category name" error={validationErrors.name?.[0]}><input name="name" defaultValue={editing?.name} required autoFocus /></Field><Field label="Description" error={validationErrors.description?.[0]}><textarea name="description" rows="3" defaultValue={editing?.description} /></Field><ModalActions onCancel={() => { setModal(''); setValidationErrors({}) }} label="Save category" /></form>}
      {modal === 'stock' && <form className="modal-form" onSubmit={submitStock}><div className="stock-now"><span>Current stock</span><b>{editing.inventory?.stock_quantity ?? 0} units</b></div><Field label="Movement" error={validationErrors.type?.[0]}><select name="type"><option value="IN">Stock in · restock</option><option value="OUT">Stock out · remove</option><option value="ADJUST">Set exact quantity</option></select></Field><Field label="Quantity" error={validationErrors.quantity?.[0]}><input name="quantity" type="number" min="0" required autoFocus /></Field><Field label="Note" error={validationErrors.notes?.[0]}><textarea name="notes" rows="2" placeholder="e.g. delivery from supplier" /></Field><ModalActions onCancel={() => { setModal(''); setValidationErrors({}) }} label="Save adjustment" /></form>}
      {modal === 'sale' && <form className="modal-form sale-form" onSubmit={submitSale}><div className="sale-items">{products.filter((p) => p.inventory?.stock_quantity > 0).map((p) => <label key={p.id} className="sale-item"><span><b>{p.name}</b><small>{p.sku} · {money(p.price)} · {p.inventory.stock_quantity} available</small></span><input aria-label={`Quantity for ${p.name}`} name={`qty-${p.id}`} type="number" min="0" max={p.inventory.stock_quantity} defaultValue="0" /></label>)}</div><Field label="Payment method" error={validationErrors.payment_method?.[0]}><select name="payment_method"><option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Bank transfer</option><option value="other">Other</option></select></Field><ModalActions onCancel={() => { setModal(''); setValidationErrors({}) }} label="Complete sale" /></form>}
      {modal === 'restock' && <form className="modal-form" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); mutate('/restocks', 'POST', { product_id: Number(form.get('product_id')), quantity: Number(form.get('quantity')), notes: form.get('notes') }, 'Restock request created.') }}><Field label="Product" error={validationErrors.product_id?.[0]}><select name="product_id" required>{products.map((p) => <option key={p.id} value={p.id}>{p.name} · stock {p.inventory?.stock_quantity ?? 0}</option>)}</select></Field><Field label="Quantity requested" error={validationErrors.quantity?.[0]}><input name="quantity" type="number" min="1" required /></Field><Field label="Note" error={validationErrors.notes?.[0]}><textarea name="notes" rows="2" placeholder="Supplier, expected delivery, etc." /></Field><ModalActions onCancel={() => { setModal(''); setValidationErrors({}) }} label="Create request" /></form>}
    </Modal>}
    {toast && <div role="status" className="toast">{toast}<button onClick={() => setToast('')}>×</button></div>}
  </div>
}

function Settings({ darkMode, compactMode, onDarkMode, onCompactMode, user }) {
  return <section className="settings-page"><div className="page-heading"><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p className="muted">Make the store workspace feel right for you.</p></div></div>
    <article className="panel settings-panel"><div className="settings-section"><p className="eyebrow">APPEARANCE</p><h2>Workspace display</h2>
      <label className="setting-row"><span><b>Dark mode</b><small>Use a darker color scheme across the store.</small></span><span className="setting-control"><span className={`theme-icon ${darkMode ? 'moon' : 'sun'}`} aria-label={darkMode ? 'Dark mode on' : 'Light mode on'}>{darkMode ? '☾' : '☀'}</span><input type="checkbox" checked={darkMode} onChange={(event) => onDarkMode(event.target.checked)} aria-label="Dark mode" /></span></label>
      <label className="setting-row"><span><b>Compact tables</b><small>Fit more product and transaction rows on screen.</small></span><input type="checkbox" checked={compactMode} onChange={(event) => onCompactMode(event.target.checked)} /></label>
    </div><div className="settings-section"><p className="eyebrow">ACCOUNT</p><h2>Your account</h2><div className="account-summary"><span className="profile-avatar">{user.name?.[0]}</span><span><b>{user.name}</b><small>{user.email}</small></span><Badge>{user.role}</Badge></div></div></article>
  </section>
}

function Dashboard({ data, products, admin, onPage, onRestock }) {
  const d = data.dashboard || {}
  const low = d.low_stock_items || []
  return <section><div className="welcome"><div><p className="eyebrow">{new Date().toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p><h1>Here's your store today.</h1><p className="muted">A quick look at what's happening on your shelves.</p></div><button className="button soft" onClick={() => onPage('products')}>View products <span>→</span></button></div>
    {admin ? <><div className="metrics"><Metric label="Active products" value={d.total_products ?? 0} note="Products in your catalogue" icon="◫" /><Metric label="Low stock" value={d.low_stock_count ?? 0} note="Items at or under reorder level" icon="⌁" accent="warning" /><Metric label="Sales today" value={money(d.today_sales_total)} note={`${d.today_sales_count ?? 0} transactions`} icon="↗" accent="success" /><Metric label="Out of stock" value={d.out_of_stock_count ?? 0} note="Need replenishing" icon="○" accent="danger" /></div>
      <div className="dashboard-grid"><article className="panel low-panel"><div className="panel-head"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Low stock items</h2></div><button className="text-button" onClick={() => onPage('products')}>View all →</button></div>{low.length ? <div className="low-list">{low.slice(0, 5).map((p) => <div className="low-row" key={p.id}><div className="product-avatar">{p.name[0]}</div><div className="low-product"><b>{p.name}</b><small>{p.sku} · reorder at {p.inventory.reorder_level}</small></div><Badge tone={p.inventory.stock_quantity === 0 ? 'red' : 'amber'}>{p.inventory.stock_quantity} left</Badge></div>)}</div> : <div className="empty compact"><span>✳</span><b>All shelves are looking good</b><small>Nothing needs a restock right now.</small></div>}</article>
      <article className="panel quick-panel"><p className="eyebrow">QUICK ACTION</p><h2>Keep things moving.</h2><p className="muted">Adjust inventory or record a new walk-in sale.</p><button className="quick-action" onClick={onRestock}><span className="quick-icon lilac">↻</span><span><b>Create a restock request</b><small>Start a replenishment request</small></span><i>→</i></button><button className="quick-action" onClick={() => onPage('sales')}><span className="quick-icon peach">＋</span><span><b>Record a sale</b><small>Check out a customer</small></span><i>→</i></button><div className="inventory-value"><span>Current catalogue stock value</span><b>{money(products.reduce((s, p) => s + Number(p.price) * (p.inventory?.stock_quantity || 0), 0))}</b></div></article>
      <article className="panel best-panel"><div className="panel-head"><div><p className="eyebrow">CUSTOMER FAVOURITES</p><h2>Best sellers</h2></div><span className="muted tiny">All time</span></div>{d.best_sellers?.length ? d.best_sellers.map((item, i) => <div className="best-row" key={item.product_id}><span className="rank">0{i + 1}</span><b>{item.product?.name || 'Archived product'}</b><span>{item.quantity_sold} sold</span></div>) : <div className="empty compact"><span>↗</span><b>Your best sellers will show here</b><small>Complete a sale to get started.</small></div>}</article>
      <SalesChart rows={d.sales_chart || []} />
      <article className="panel tip-panel"><div className="tip-stamp">✳</div><div><p className="eyebrow">A LITTLE REMINDER</p><h2>Small updates make a big difference.</h2><p>Recording every sale keeps your stock count accurate and your restock alerts useful.</p></div></article></div>
    </> : <><div className="metrics"><Metric label="Products" value={products.length} note="Items available to sell" icon="◫" /><Metric label="Sales today" value={data.sales?.filter((s) => new Date(s.created_at).toDateString() === new Date().toDateString()).length || 0} note="Your recorded transactions" icon="↗" accent="success" /><Metric label="Stock value" value={money(products.reduce((s, p) => s + Number(p.price) * (p.inventory?.stock_quantity || 0), 0))} note="Available inventory" icon="◈" /></div><article className="panel"><div className="panel-head"><div><p className="eyebrow">YOUR SALES</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => onPage('sales')}>View all →</button></div><SalesTable sales={(data.sales || []).slice(0, 5)} /></article></>}
  </section>
}

function SalesChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.total))
  return <article className="panel chart-panel"><div className="panel-head"><div><p className="eyebrow">SALES REPORT</p><h2>Last 7 days</h2></div><span className="muted tiny">Daily revenue</span></div><div className="chart-bars" role="img" aria-label="Daily sales for the last seven days">{rows.map((row) => <div className="chart-column" key={row.date}><span className="chart-value">{money(row.total)}</span><div className="chart-track"><div className="chart-bar" style={{ height: `${row.total ? Math.max(5, row.total / max * 100) : 0}%` }} /></div><small>{new Date(`${row.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' })}</small></div>)}</div></article>
}

function ProductTable({ products, admin, wishlist = [], onWishlist, onEdit, onStock, onDelete }) { const savedIds = new Set(wishlist.map((item) => item.id)); return <div className="table-card"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>IN STOCK</th><th>STATUS</th><th>SAVE</th>{admin && <th />}</tr></thead><tbody>{products.map((p) => { const label = stockLabel(p.inventory); return <tr key={p.id}><td><div className="table-product">{p.image_url ? <img className="product-thumb rounded-md object-cover" src={p.image_url} alt="" /> : <div className="product-avatar">{p.name[0]}</div>}<span><b>{p.name}</b><small>{p.sku}</small></span></div></td><td>{p.category?.name || <span className="muted">—</span>}</td><td className="price-cell">{money(p.price)}</td><td>{p.inventory?.stock_quantity ?? 0} <span className="muted">units</span></td><td><Badge tone={label === 'In stock' ? 'green' : label === 'Low stock' ? 'amber' : 'red'}><i />{label}</Badge></td><td><button className="wishlist-button text-rose-700" aria-label={savedIds.has(p.id) ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`} onClick={() => onWishlist(p)}>{savedIds.has(p.id) ? '♥' : '♡'}</button></td>{admin && <td><div className="row-actions"><button onClick={() => onStock(p)} title="Adjust stock">↻</button><button onClick={() => onEdit(p)} title="Edit product">✎</button><button className="delete-action" onClick={() => onDelete(p)} title="Archive product">×</button></div></td>}</tr>})}</tbody></table>{products.length === 0 && <div className="empty"><span>⌕</span><b>No products found</b><small>Try changing the search or stock filter.</small></div>}</div> }
function SalesTable({ sales = [], admin = false, onStatus }) { return <div className="table-card"><table><thead><tr><th>INVOICE</th><th>DATE</th><th>RECORDED BY</th><th>PAYMENT</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>{sales.map((s) => <tr key={s.id}><td><b className="invoice">{s.invoice_number}</b></td><td>{new Date(s.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td><td>{s.user?.name || '—'}</td><td><Badge>{s.payment_method}</Badge></td><td>{admin && !['completed', 'cancelled'].includes(s.status) ? <select aria-label={`Update order ${s.invoice_number} status`} value={s.status} onChange={(event) => onStatus(s, event.target.value)}>{(s.status === 'processing' ? ['processing', 'ready', 'completed', 'cancelled'] : ['ready', 'completed', 'cancelled']).map((value) => <option key={value} value={value}>{value}</option>)}</select> : <Badge tone={s.status === 'completed' ? 'green' : s.status === 'cancelled' ? 'red' : 'blue'}>{s.status}</Badge>}</td><td className="price-cell">{money(s.total_amount)}</td></tr>)}</tbody></table>{!sales.length && <div className="empty"><span>↗</span><b>No sales recorded yet</b><small>Your completed checkouts will appear here.</small></div>}</div> }
function TransactionTable({ rows = [] }) { return <div className="table-card"><table><thead><tr><th>PRODUCT</th><th>MOVEMENT</th><th>REFERENCE</th><th>QUANTITY</th><th>BY</th><th>DATE</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><b>{r.product?.name}</b><small className="cell-sub">{r.product?.sku}</small></td><td><Badge tone={r.transaction_type === 'IN' ? 'green' : r.transaction_type === 'OUT' ? 'amber' : ''}>{r.transaction_type}</Badge></td><td>{r.reference_type}{r.notes ? ` · ${r.notes}` : ''}</td><td className={r.quantity > 0 ? 'qty-in' : 'qty-out'}>{r.quantity > 0 ? '+' : ''}{r.quantity}</td><td>{r.user?.name || '—'}</td><td>{new Date(r.created_at).toLocaleString()}</td></tr>)}</tbody></table>{!rows.length && <div className="empty"><span>☷</span><b>No movements yet</b><small>Restocks and sales will leave a complete history here.</small></div>}</div> }
function RestockTable({ rows = [], admin, onStatus }) { return <div className="table-card"><table><thead><tr><th>PRODUCT</th><th>QUANTITY</th><th>REQUESTED BY</th><th>STATUS</th><th>NOTE</th><th>ACTION</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><b>{r.product?.name}</b><small className="cell-sub">{r.product?.sku}</small></td><td>{r.quantity} units</td><td>{r.requester?.name}</td><td><Badge tone={r.status === 'received' ? 'green' : r.status === 'pending' ? 'amber' : 'blue'}>{r.status}</Badge></td><td>{r.notes || '—'}</td><td>{admin && r.status === 'pending' ? <button className="button small soft" onClick={() => onStatus(r, 'approved')}>Approve</button> : admin && r.status === 'approved' ? <button className="button small primary" onClick={() => onStatus(r, 'received')}>Mark received</button> : <span className="muted">{r.status === 'received' ? 'Complete' : 'Waiting'}</span>}</td></tr>)}</tbody></table>{!rows.length && <div className="empty"><span>↻</span><b>No restock requests</b><small>Create a request when stock needs replenishing.</small></div>}</div> }
function CategoryList({ categories = [], onEdit, onDelete }) { return <div className="category-grid">{categories.map((c) => <article className="category-card" key={c.id}><div className="category-icon">◇</div><div className="category-info"><b>{c.name}</b><small>{c.products_count} products</small><p>{c.description || 'No description added.'}</p></div><div className="row-actions"><button onClick={() => onEdit(c)} title="Edit category">✎</button><button className="delete-action" onClick={() => onDelete(c)} title="Delete category">×</button></div></article>)}{!categories.length && <div className="empty"><span>◇</span><b>No categories yet</b><small>Add a category to organize products.</small></div>}</div> }
function Pagination({ meta, onChange }) { if (!meta || meta.last_page <= 1) return null; return <div className="pagination"><span>Showing {meta.from}–{meta.to} of {meta.total}</span><div><button disabled={meta.current_page <= 1} onClick={() => onChange(meta.current_page - 1)}>← Previous</button><span>Page {meta.current_page} of {meta.last_page}</span><button disabled={meta.current_page >= meta.last_page} onClick={() => onChange(meta.current_page + 1)}>Next →</button></div></div> }
function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><p className="eyebrow">MINI STORE</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</section></div> }
function ModalActions({ onCancel, label }) { return <div className="modal-actions"><button type="button" className="button soft" onClick={onCancel}>Cancel</button><button className="button primary">{label}</button></div> }

export default function App() {
  return <BrowserRouter><AuthProvider><Routes><Route path="/*" element={<StoreApp />} /></Routes></AuthProvider></BrowserRouter>
}
