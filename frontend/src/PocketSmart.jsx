import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight,
  BadgeIndianRupee, Bell, Bot, CalendarDays, Check, ChevronDown, CircleHelp, Coffee,
  CreditCard, Download, FileText, Filter, Gauge, House, Lightbulb, LogOut, Menu,
  MessageCircle, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles,
  Target, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import './PocketSmart.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const categories = ['Food', 'Transport', 'Education', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Others']
const colors = ['#ed745b', '#e7a446', '#5986d7', '#9771cb', '#55a38c', '#d8789a', '#54a8b8', '#8a9691']
const navItems = [
  { label: 'Welcome', icon: Sparkles, section: 'workspace' },
  { label: 'Overview', icon: House, section: 'workspace' },
  { label: 'Income', icon: ArrowDownLeft, section: 'workspace' },
  { label: 'Expenses', icon: ArrowUpRight, section: 'workspace' },
  { label: 'Budgets', icon: Gauge, section: 'workspace' },
  { label: 'Transactions', icon: ArrowLeftRight, section: 'workspace' },
  { label: 'Analytics', icon: Activity, section: 'insights' },
  { label: 'Recommendations', icon: Lightbulb, section: 'insights' },
  { label: 'AI assistant', icon: MessageCircle, section: 'insights' },
]
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })
const isoDate = (daysAgo = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}
const isoMonthDate = (monthsAgo, day = 12) => {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - monthsAgo)
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
  return date.toISOString().slice(0, 10)
}
const seedTransactions = [
  { id: 'd1', type: 'Income', category: 'Salary', description: 'Monthly salary', amount: 62000, date: isoDate(2) },
  { id: 'd2', type: 'Income', category: 'Freelance', description: 'Brand design project', amount: 8500, date: isoDate(8) },
  { id: 'd3', type: 'Expense', category: 'Food', description: 'Groceries & market', amount: 4820, date: isoDate(1) },
  { id: 'd4', type: 'Expense', category: 'Bills', description: 'Electricity and internet', amount: 2650, date: isoDate(3) },
  { id: 'd5', type: 'Expense', category: 'Transport', description: 'Metro pass', amount: 1450, date: isoDate(4) },
  { id: 'd6', type: 'Expense', category: 'Shopping', description: 'New running shoes', amount: 3890, date: isoDate(6) },
  { id: 'd7', type: 'Expense', category: 'Food', description: 'Dinner with friends', amount: 1650, date: isoDate(9) },
  { id: 'd8', type: 'Expense', category: 'Education', description: 'Online course', amount: 2200, date: isoDate(12) },
  { id: 'd9', type: 'Expense', category: 'Entertainment', description: 'Cinema tickets', amount: 960, date: isoDate(14) },
  { id: 'd10', type: 'Expense', category: 'Healthcare', description: 'Pharmacy', amount: 740, date: isoDate(17) },
  { id: 'd11', type: 'Expense', category: 'Transport', description: 'Cab rides', amount: 1180, date: isoDate(20) },
  { id: 'd12', type: 'Expense', category: 'Food', description: 'Weekly groceries', amount: 3170, date: isoDate(23) },
  ...Array.from({ length: 5 }, (_, index) => {
    const month = index + 1
    return [
      { id: `history-income-${month}`, type: 'Income', category: 'Salary', description: 'Monthly salary', amount: 60000 + month * 1200, date: isoMonthDate(month, 2) },
      { id: `history-expense-${month}`, type: 'Expense', category: ['Food', 'Bills', 'Transport', 'Shopping', 'Education'][index], description: 'Monthly spending', amount: 28500 + month * 950, date: isoMonthDate(month, 18) },
    ]
  }).flat(),
]
const defaultBudgets = { monthly: 42000, Food: 9000, Transport: 5000, Education: 5000, Shopping: 5500, Bills: 6500, Entertainment: 3500, Healthcare: 3000, Others: 2500 }
const readSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
const dataKey = (kind, auth) => `pocketsmart-${kind}-${encodeURIComponent(auth.email || 'demo').toLowerCase()}`

function App() {
  const [auth, setAuth] = useState(() => readSaved('pocketsmart-auth', { mode: 'demo', name: 'Aarav Mehta', email: 'aarav@example.com' }))
  const [page, setPage] = useState('Overview')
  const [transactions, setTransactions] = useState(() => readSaved(dataKey('transactions', auth), seedTransactions))
  const [budgets, setBudgets] = useState(() => readSaved(dataKey('budgets', auth), defaultBudgets))
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All types')
  const [filterMonth, setFilterMonth] = useState('This month')
  const [sortOrder, setSortOrder] = useState('Newest first')
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi Aarav! I’ve reviewed your recent spending. Ask me about a category, your savings, or a practical budget plan.' }])
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [busy, setBusy] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const saveTransactions = (next, owner = auth) => { setTransactions(next); localStorage.setItem(dataKey('transactions', owner), JSON.stringify(next)) }
  const saveBudgets = (next, owner = auth) => { setBudgets(next); localStorage.setItem(dataKey('budgets', owner), JSON.stringify(next)) }
  const monthlyTransactions = useMemo(() => transactions.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    const now = new Date()
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  }), [transactions])
  const expenses = useMemo(() => monthlyTransactions.filter((item) => item.type === 'Expense'), [monthlyTransactions])
  const income = useMemo(() => monthlyTransactions.filter((item) => item.type === 'Income'), [monthlyTransactions])
  const totalIncome = income.reduce((sum, item) => sum + Number(item.amount), 0)
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0)
  const balance = totalIncome - totalExpenses
  const savingsRate = totalIncome ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0
  const spentByCategory = categories.map((category, index) => ({
    name: category,
    amount: expenses.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.amount), 0),
    color: colors[index],
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)
  const budgetUsed = budgets.monthly ? Math.round(totalExpenses / budgets.monthly * 100) : 0
  const filteredTransactions = [...transactions].filter((item) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${item.category} ${item.description} ${item.type}`.toLowerCase().includes(query)
    const matchesType = filterType === 'All types' || item.type === filterType
    const transactionDate = new Date(`${item.date}T12:00:00`)
    const now = new Date()
    const matchesMonth = filterMonth === 'All time' || (transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear())
    return matchesSearch && matchesType && matchesMonth
  }).sort((a, b) => sortOrder === 'Newest first' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))

  const showToast = (text) => { setToast(text); window.setTimeout(() => setToast(''), 2800) }
  useEffect(() => {
    if (auth.mode !== 'account') return undefined
    let active = true
    Promise.all([apiRequest('/api/transactions'), apiRequest('/api/budgets')]).then(([accountTransactions, accountBudgets]) => {
      if (!active) return
      saveTransactions(accountTransactions)
      saveBudgets({ ...defaultBudgets, ...accountBudgets })
    }).catch((error) => {
      if (active && error.status === 401) {
        localStorage.removeItem('pocketsmart-auth')
        setAuth({ mode: 'logged-out' })
        setAuthError('Your session expired. Please sign in again.')
      }
    })
    return () => { active = false }
  }, [auth.mode, auth.email])
  const handleSaveTransaction = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    if (!Number.isFinite(amount) || amount <= 0) return showToast('Enter an amount greater than zero.')
    const entry = { id: modal?.id || crypto.randomUUID(), type: form.get('type'), category: form.get('category'), description: form.get('description').trim(), amount, date: form.get('date') }
    if (!entry.date || !entry.description) return showToast('Add a date and short description.')
    let savedEntry = entry
    if (auth.mode === 'account') {
      try { savedEntry = await apiRequest(`/api/transactions${modal?.id ? `/${modal.id}` : ''}`, modal?.id ? 'PUT' : 'POST', entry) }
      catch (error) { return showToast(error.message || 'Could not save this transaction.') }
    }
    const next = modal?.id ? transactions.map((item) => item.id === modal.id ? savedEntry : item) : [savedEntry, ...transactions]
    saveTransactions(next)
    setModal(null)
    showToast(modal?.id ? 'Transaction updated.' : 'Transaction added.')
  }
  const deleteTransaction = async (item) => {
    if (auth.mode === 'account') {
      try { await apiRequest(`/api/transactions/${item.id}`, 'DELETE') }
      catch (error) { return showToast(error.message || 'Could not remove this transaction.') }
    }
    saveTransactions(transactions.filter((transaction) => transaction.id !== item.id))
    showToast('Transaction removed.')
  }
  const handleAuth = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const data = await apiRequest(endpoint, 'POST', Object.fromEntries(form.entries()))
      const nextAuth = { mode: 'account', name: data.name, email: data.email, token: data.access_token }
      setAuth(nextAuth)
      localStorage.setItem('pocketsmart-auth', JSON.stringify(nextAuth))
      const [accountTransactions, accountBudgets] = await Promise.all([apiRequest('/api/transactions'), apiRequest('/api/budgets')])
      saveTransactions(accountTransactions, nextAuth)
      saveBudgets({ ...defaultBudgets, ...accountBudgets }, nextAuth)
      setAuthError('')
      showToast(authMode === 'login' ? 'Welcome back.' : 'Your account is ready.')
      setPage('Overview')
    } catch (error) {
      if (authMode === 'signup' && error.status === 409) {
        setAuthMode('login')
        setAuthError('This email already has an account. Sign in instead.')
      } else {
        setAuthError(error.message || 'Could not connect to the finance service.')
      }
    }
    finally { setBusy(false) }
  }
  const logOut = () => {
    localStorage.setItem('pocketsmart-auth', JSON.stringify({ mode: 'logged-out' }))
    setAuth({ mode: 'logged-out' })
    setAuthMode('login')
    setPage('Overview')
  }
  const enterDemo = () => {
    const demoAuth = { mode: 'demo', name: 'Aarav Mehta', email: 'aarav@example.com' }
    setAuth(demoAuth)
    localStorage.setItem('pocketsmart-auth', JSON.stringify(demoAuth))
    setTransactions(readSaved(dataKey('transactions', demoAuth), seedTransactions))
    setBudgets(readSaved(dataKey('budgets', demoAuth), defaultBudgets))
    setPage('Overview')
  }
  const askAssistant = (question = chatInput) => {
    const prompt = question.trim()
    if (!prompt) return
    setMessages((current) => [...current, { role: 'user', text: prompt }])
    setChatInput('')
    window.setTimeout(async () => {
      let answer
      try {
        if (auth.mode === 'account') {
          const response = await apiRequest('/api/assistant/chat', 'POST', { question: prompt })
          answer = response.answer
        }
      } catch { answer = null }
      if (!answer) answer = localAnswer(prompt, expenses, income, budgets, totalIncome, totalExpenses, balance, spentByCategory)
      setMessages((current) => [...current, { role: 'assistant', text: answer }])
    }, 280)
  }
  const recommendations = buildRecommendations(spentByCategory, expenses, totalIncome, totalExpenses, budgets, balance)
  const alerts = buildAlerts(spentByCategory, expenses, totalIncome, totalExpenses, budgets, balance)
  const openTransaction = (type = 'Expense', item = null) => setModal({ type, ...(item || {}) })

  if (auth.mode === 'logged-out') return <AuthScreen mode={authMode} setMode={(mode) => { setAuthError(''); setAuthMode(mode) }} onSubmit={handleAuth} busy={busy} error={authError} onDemo={enterDemo} />

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#welcome" onClick={(event) => { event.preventDefault(); setPage('Welcome') }}>
        <span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span>
        <span>Pocket<span className="brand-smart">Smart</span><small>YOUR MONEY, IN FOCUS</small></span>
      </a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon
          return <button key={item.label} className={`nav-item ${page === item.label ? 'active' : ''} ${item.section === 'insights' && item.label === 'Analytics' ? 'nav-insights-start' : ''}`} onClick={() => { setPage(item.label); setMobileNav(false) }}>
            <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
            {item.label === 'AI assistant' && <span className="nav-new">NEW</span>}
          </button>
        })}
        <div className="workspace-label insights-label">YOUR INSIGHTS</div>
        {navItems.slice(6).map((item) => {
          const Icon = item.icon
          return <button key={item.label} className={`nav-item ${page === item.label ? 'active' : ''}`} onClick={() => { setPage(item.label); setMobileNav(false) }}>
            <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
            {item.label === 'AI assistant' && <span className="nav-new">NEW</span>}
          </button>
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-note"><ShieldCheck size={15} /><span>Your finances stay private</span></div>
        <button className={`nav-item ${page === 'Profile' ? 'active' : ''}`} onClick={() => { setPage('Profile'); setMobileNav(false) }}><Settings size={17} /><span>Profile & settings</span></button>
        <div className="sidebar-user"><div className="avatar">{auth.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'AM'}</div><div className="user-meta"><strong>{auth.name || 'PocketSmart'}</strong><span>{auth.mode === 'demo' ? 'Demo workspace' : auth.email}</span></div><button title={auth.mode === 'demo' ? 'Sign in' : 'Sign out'} aria-label={auth.mode === 'demo' ? 'Sign in' : 'Sign out'} className="icon-button logout" onClick={() => { if (auth.mode === 'demo') { setAuth({ mode: 'logged-out' }); setAuthMode('login') } else logOut() }}>{auth.mode === 'demo' ? <ArrowRight size={16} /> : <LogOut size={16} />}</button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button>
        <div className="breadcrumb">PocketSmart <span>/</span> <strong>{page}</strong></div>
        <div className="topbar-right">{auth.mode === 'demo' && <button className="text-button auth-top-link" onClick={() => { setAuth({ mode: 'logged-out' }); setAuthMode('login') }}>Sign in <ArrowRight size={13} /></button>}<span className="month-pill"><CalendarDays size={14} /> {currentMonth}</span><button className="icon-button notification-button" title="Notifications" aria-label={`Notifications, ${alerts.length} alerts`} onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{alerts.length > 0 && <i />}</button>{notificationsOpen && <div className="notification-popover"><div className="notification-heading"><div><strong>Notifications</strong><span>{alerts.length} updates for this month</span></div><button className="icon-button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X size={16} /></button></div>{alerts.map((alert, index) => <div className={`notification-item ${alert.level}`} key={`${alert.type}-${index}`}><span className="notification-icon"><AlertTriangle size={15} /></span><div><strong>{alert.title}</strong><p>{alert.message}</p></div></div>)}</div>}<button className="top-avatar" aria-label="Open profile" onClick={() => setPage('Profile')}>{auth.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'AM'}</button></div>
      </header>
      <div className="content-area">
        {page === 'Welcome' && <LandingPage setPage={setPage} openAuth={(mode) => { setAuth({ mode: 'logged-out' }); setAuthMode(mode) }} />}
        {page === 'Overview' && <Dashboard {...{ transactions, income, expenses, totalIncome, totalExpenses, balance, savingsRate, budgetUsed, budgets, spentByCategory, showToast, openTransaction, setPage, recommendations }} />}
        {(page === 'Income' || page === 'Expenses' || page === 'Transactions') && <TransactionsPage {...{ page, filteredTransactions, search, setSearch, filterType, setFilterType, filterMonth, setFilterMonth, sortOrder, setSortOrder, openTransaction, deleteTransaction, setPage }} />}
        {page === 'Budgets' && <BudgetsPage {...{ budgets, saveBudgets, spentByCategory, totalExpenses, showToast, auth }} />}
        {page === 'Analytics' && <AnalyticsPage {...{ transactions, income, expenses, totalIncome, totalExpenses, balance, spentByCategory, budgets }} />}
        {page === 'Recommendations' && <RecommendationsPage {...{ recommendations, spentByCategory, setPage }} />}
        {page === 'AI assistant' && <AssistantPage {...{ messages, chatInput, setChatInput, askAssistant }} />}
        {page === 'Profile' && <ProfilePage {...{ auth, logOut, setAuth, showToast, onCreateAccount: () => { setAuth({ mode: 'logged-out' }); setAuthMode('signup') } }} />}
      </div>
    </main>
    {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    {modal && <TransactionModal item={modal} onClose={() => setModal(null)} onSubmit={handleSaveTransaction} />}
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </div>
}

async function apiRequest(path, method = 'GET', body) {
  const savedAuth = readSaved('pocketsmart-auth', {})
  const headers = { 'Content-Type': 'application/json' }
  if (savedAuth.token) headers.Authorization = `Bearer ${savedAuth.token}`
  const response = await fetch(`${API_URL}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) })
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((issue) => `${issue.loc?.at(-1) || 'Request'}: ${issue.msg}`).join(' ')
      : data.detail
    const error = new Error(typeof detail === 'string' ? detail : 'Request failed. Please try again.')
    error.status = response.status
    throw error
  }
  return data
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}
function LandingPage({ setPage, openAuth }) {
  return <>
    <section className="landing-hero">
      <div className="landing-copy">
        <span className="eyebrow">YOUR MONEY, IN FOCUS</span>
        <h1>A clearer picture.<br />A calmer money routine.</h1>
        <p>Track what comes in and goes out, set a budget that fits your life, and notice small ways to feel more in control.</p>
        <div className="landing-actions"><button className="button button-primary" onClick={() => setPage('Overview')}>Open demo dashboard <ArrowRight size={15} /></button><button className="button button-outline" onClick={() => openAuth('signup')}>Create account</button></div>
        <button className="landing-login" onClick={() => openAuth('login')}>Already have an account? <strong>Sign in</strong></button>
      </div>
      <div className="landing-preview"><div className="preview-topline"><span><i /> MONTHLY SNAPSHOT</span><span>{currentMonth}</span></div><div className="preview-balance"><span>Available balance</span><strong>₹47,790</strong><small><TrendingUp size={13} /> A steady month so far</small></div><div className="preview-bars" aria-label="Illustrative income and expense chart"><i style={{ height: '48%' }} /><i style={{ height: '67%' }} /><i style={{ height: '59%' }} /><i style={{ height: '82%' }} /><i style={{ height: '73%' }} /><i style={{ height: '92%' }} /><i style={{ height: '76%' }} /><i style={{ height: '100%' }} /></div><div className="preview-legend"><span><i className="income-dot" /> Income</span><span><i className="expense-dot" /> Spending</span></div><div className="preview-insight"><Sparkles size={15} /><span>Food is your top category this month</span><ArrowRight size={14} /></div></div>
    </section>
    <section className="landing-features"><div><span className="feature-number">01</span><h2>See the whole month</h2><p>Bring your income and expenses into one simple view.</p></div><div><span className="feature-number">02</span><h2>Budget without the guilt</h2><p>Choose practical limits and get a heads-up before you reach them.</p></div><div><span className="feature-number">03</span><h2>Ask better questions</h2><p>Get clear, data-based spending insights in plain language.</p></div></section>
    <p className="landing-note"><ShieldCheck size={14} /> Your financial information stays private to your account. PocketSmart offers spending insights, not investment advice.</p>
  </>
}
function Dashboard({ transactions, income, expenses, totalIncome, totalExpenses, balance, savingsRate, budgetUsed, budgets, spentByCategory, openTransaction, setPage, recommendations }) {
  const chartData = buildMonthlyTrend(transactions)
  const metrics = [
    { label: 'Total income', amount: money(totalIncome), note: `${income.length} income entries`, icon: ArrowDownLeft, tint: 'mint', trend: '+8.2%' },
    { label: 'Total expenses', amount: money(totalExpenses), note: `${expenses.length} transactions`, icon: ArrowUpRight, tint: 'coral', trend: 'This month' },
    { label: 'Available balance', amount: money(balance), note: 'Income minus expenses', icon: Wallet, tint: 'blue', trend: 'On track' },
    { label: 'Savings rate', amount: `${savingsRate}%`, note: `${money(Math.max(0, balance))} kept this month`, icon: Target, tint: 'gold', trend: savingsRate >= 20 ? 'Healthy' : 'Build steadily' },
  ]
  return <>
    <PageHeading eyebrow={`${new Date().toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()}, FINANCES MADE CLEAR`} title={`Good ${greeting()}, ${nameFirst()} 👋`} subtitle="Here’s a calm, clear picture of your money this month." action={<button className="button button-primary" onClick={() => openTransaction('Expense')}><Plus size={16} /> Add transaction</button>} />
    <section className="metric-grid">
      {metrics.map(({ label, amount, note, icon: Icon, tint, trend }) => <article className="metric-card" key={label}><div className={`metric-icon ${tint}`}><Icon size={18} /></div><span className="metric-trend">{trend}</span><div className="metric-label">{label}</div><strong className="metric-value">{amount}</strong><div className="metric-note">{note}</div></article>)}
    </section>
    <section className="dashboard-grid">
      <article className="panel cashflow-panel"><div className="panel-heading"><div><h2>Cash flow</h2><p>Income and expenses over time</p></div><button className="text-button" onClick={() => setPage('Analytics')}>View analytics <ArrowRight size={14} /></button></div><div className="chart-legend"><span><i className="legend-dot income-dot" /> Income</span><span><i className="legend-dot expense-dot" /> Expenses</span><span className="legend-period">Last 6 months <ChevronDown size={13} /></span></div><div className="cashflow-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#59aa8f" stopOpacity={0.18} /><stop offset="100%" stopColor="#59aa8f" stopOpacity={0} /></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ed745b" stopOpacity={0.13} /><stop offset="100%" stopColor="#ed745b" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e6ebe7', fontSize: 12 }} /><Area type="monotone" dataKey="income" stroke="#55a38c" strokeWidth={2.3} fill="url(#incomeFill)" /><Area type="monotone" dataKey="expenses" stroke="#ed745b" strokeWidth={2.3} fill="url(#expenseFill)" /></AreaChart></ResponsiveContainer></div></article>
      <article className="panel budget-panel"><div className="panel-heading"><div><h2>Monthly budget</h2><p>{currentMonth}</p></div><button className="icon-button subtle" aria-label="Open budgets" onClick={() => setPage('Budgets')}><MoreHorizontal size={19} /></button></div><div className="budget-total"><strong>{money(totalExpenses)}</strong><span>of {money(budgets.monthly)}</span></div><div className="progress-track"><div className={`progress-fill ${budgetUsed >= 90 ? 'over' : ''}`} style={{ width: `${Math.min(budgetUsed, 100)}%` }} /></div><div className="budget-caption"><span>{budgetUsed}% used</span><span>{money(Math.max(0, budgets.monthly - totalExpenses))} left</span></div><div className={`budget-message ${budgetUsed >= 90 ? 'warning' : ''}`}><span className="status-dot" />{budgetUsed >= 100 ? 'You’ve gone over this month’s budget.' : budgetUsed >= 80 ? 'You’re getting close to your monthly limit.' : 'You’re doing well. Keep your pace steady.'}</div><button className="button button-outline full-button" onClick={() => setPage('Budgets')}>Manage budget <ArrowRight size={14} /></button></article>
    </section>
    <section className="dashboard-grid lower-grid">
      <article className="panel spending-panel"><div className="panel-heading"><div><h2>Where it goes</h2><p>Your spending by category</p></div><button className="text-button" onClick={() => setPage('Analytics')}>Details <ArrowRight size={14} /></button></div><div className="category-overview"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={spentByCategory} dataKey="amount" nameKey="name" innerRadius="66%" outerRadius="90%" paddingAngle={4} stroke="none"><Cell fill="#ed745b" /><Cell fill="#e7a446" /><Cell fill="#5986d7" /><Cell fill="#9771cb" /><Cell fill="#55a38c" /><Cell fill="#d8789a" /><Cell fill="#54a8b8" /></Pie></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(totalExpenses)}</strong><span>spent</span></div></div><div className="category-list">{spentByCategory.slice(0, 4).map((category) => <div className="category-row" key={category.name}><span className="category-name"><i style={{ background: category.color }} />{category.name}</span><strong>{money(category.amount)}</strong><span className="category-percent">{totalExpenses ? Math.round(category.amount / totalExpenses * 100) : 0}%</span></div>)}</div></div></article>
      <article className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Your latest money moves</p></div><button className="text-button" onClick={() => setPage('Transactions')}>All transactions <ArrowRight size={14} /></button></div><div className="recent-list">{transactions.slice(0, 4).map((item) => <TransactionRow key={item.id} item={item} />)}</div></article>
    </section>
    <section className="insight-strip"><div className="insight-icon"><Sparkles size={19} /></div><div className="insight-copy"><strong>A little insight, just for you</strong><span>{recommendations[0]?.text || 'A steady month is a good time to keep building your savings habit.'}</span></div><button className="text-button" onClick={() => setPage('Recommendations')}>See all insights <ArrowRight size={14} /></button></section>
  </>
}
function nameFirst() { return readSaved('pocketsmart-auth', { name: 'Aarav Mehta' }).name?.split(' ')[0] || 'there' }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening' }
function buildMonthlyTrend(transactions) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const monthTransactions = transactions.filter((item) => {
      const date = new Date(`${item.date}T12:00:00`)
      return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth()
    })
    const income = monthTransactions.filter((item) => item.type === 'Income').reduce((sum, item) => sum + Number(item.amount), 0)
    const expenses = monthTransactions.filter((item) => item.type === 'Expense').reduce((sum, item) => sum + Number(item.amount), 0)
    return { month: monthDate.toLocaleString('en-IN', { month: 'short' }), income, expenses, savings: income - expenses }
  })
}
function TransactionRow({ item }) {
  const expense = item.type === 'Expense'
  return <div className="recent-row"><div className={`transaction-icon ${expense ? item.category.toLowerCase() : 'income-icon'}`}>{expense ? <CategoryIcon category={item.category} /> : <ArrowDownLeft size={17} />}</div><div className="recent-details"><strong>{item.description}</strong><span>{item.category} <i /> {new Date(`${item.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></div><strong className={`recent-amount ${expense ? 'negative' : 'positive'}`}>{expense ? '−' : '+'}{money(item.amount)}</strong></div>
}
function CategoryIcon({ category }) {
  const icons = { Food: Coffee, Transport: ArrowRight, Education: FileText, Shopping: CreditCard, Bills: FileText, Entertainment: Activity, Healthcare: ShieldCheck }
  const Icon = icons[category] || BadgeIndianRupee
  return <Icon size={17} />
}
function TransactionsPage({ page, filteredTransactions, search, setSearch, filterType, setFilterType, filterMonth, setFilterMonth, sortOrder, setSortOrder, openTransaction, deleteTransaction, setPage }) {
  const shown = filteredTransactions.filter((item) => page === 'Income' ? item.type === 'Income' : page === 'Expenses' ? item.type === 'Expense' : true)
  const title = page === 'Income' ? 'Income' : page === 'Expenses' ? 'Expenses' : 'Transactions'
  const subtitle = page === 'Income' ? 'Keep track of the money coming in.' : page === 'Expenses' ? 'Understand where your money is going.' : 'Every money move, all in one place.'
  return <><PageHeading eyebrow="YOUR MONEY MOVES" title={title} subtitle={subtitle} action={<button className="button button-primary" onClick={() => openTransaction(page === 'Income' ? 'Income' : 'Expense')}><Plus size={16} /> Add {page === 'Income' || page === 'Expenses' ? page.slice(0, -1).toLowerCase() : 'transaction'}</button>} />
    <section className="panel table-panel"><div className="table-toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions" /></label><div className="toolbar-filters"><label className="select-wrap"><Filter size={14} /><select value={filterType} onChange={(event) => setFilterType(event.target.value)}><option>All types</option><option>Income</option><option>Expense</option></select></label><label className="select-wrap"><CalendarDays size={14} /><select value={filterMonth} onChange={(event) => setFilterMonth(event.target.value)}><option>This month</option><option>All time</option></select></label><select className="sort-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option>Newest first</option><option>Oldest first</option></select></div></div>
      <div className="table-wrap"><table><thead><tr><th>DATE</th><th>DESCRIPTION</th><th>TYPE</th><th>CATEGORY</th><th className="amount-cell">AMOUNT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><span className="table-description">{item.description}</span></td><td><span className={`type-pill ${item.type.toLowerCase()}`}>{item.type}</span></td><td><span className="table-category"><i style={{ background: item.type === 'Income' ? '#55a38c' : colors[categories.indexOf(item.category)] || '#8a9691' }} />{item.category}</span></td><td className={`amount-cell ${item.type === 'Income' ? 'positive' : ''}`}>{item.type === 'Income' ? '+' : '−'}{money(item.amount)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${item.description}`} title="Edit" onClick={() => openTransaction(item.type, item)}><Settings size={15} /></button><button className="icon-button delete-action" aria-label={`Delete ${item.description}`} title="Delete" onClick={() => deleteTransaction(item)}><X size={16} /></button></div></td></tr>)}</tbody></table></div>
      {shown.length === 0 && <div className="empty-state"><div className="empty-icon"><ArrowLeftRight size={22} /></div><h3>No transactions found</h3><p>Try a different search, or add your first transaction.</p><button className="button button-primary" onClick={() => openTransaction(page === 'Income' ? 'Income' : 'Expense')}><Plus size={15} /> Add transaction</button></div>}
      <div className="table-footer"><span>Showing {shown.length} {shown.length === 1 ? 'transaction' : 'transactions'}</span><button className="text-button" onClick={() => setPage('Analytics')}><Download size={14} /> View analytics</button></div>
    </section></>
}
function BudgetsPage({ budgets, saveBudgets, spentByCategory, totalExpenses, showToast, auth }) {
  const [draft, setDraft] = useState(budgets)
  const categorySpent = (category) => spentByCategory.find((item) => item.name === category)?.amount || 0
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }))
  const submit = async (event) => {
    event.preventDefault()
    if (auth.mode === 'account') {
      try {
        const saved = await apiRequest('/api/budgets', 'PUT', draft)
        saveBudgets({ ...defaultBudgets, ...saved })
        setDraft({ ...defaultBudgets, ...saved })
        showToast('Your budget plan is saved.')
      } catch (error) { showToast(error.message || 'Could not save your budget.') }
      return
    }
    saveBudgets(draft)
    showToast('Your budget plan is saved.')
  }
  return <><PageHeading eyebrow="PLAN WITH PURPOSE" title="Budgets" subtitle="Set comfortable limits and keep an eye on your progress." action={<button className="button button-primary" onClick={submit}><Check size={16} /> Save budget</button>} />
    <form onSubmit={submit} className="budget-layout"><article className="panel budget-main-card"><div className="panel-heading"><div><h2>Monthly spending limit</h2><p>One clear number for your everyday spending</p></div><div className="budget-setting-icon"><Target size={19} /></div></div><label className="budget-input-label">TOTAL MONTHLY BUDGET <span>₹</span><input type="number" min="0" step="500" value={draft.monthly} onChange={(event) => update('monthly', event.target.value)} /></label><div className="budget-overview"><div><span>Spent so far</span><strong>{money(totalExpenses)}</strong></div><div><span>Remaining</span><strong className={totalExpenses > draft.monthly ? 'text-danger' : ''}>{money(Math.max(0, draft.monthly - totalExpenses))}</strong></div><div><span>Monthly target</span><strong>{money(draft.monthly)}</strong></div></div><div className="progress-track large"><div className={`progress-fill ${totalExpenses / Math.max(1, draft.monthly) >= .9 ? 'over' : ''}`} style={{ width: `${Math.min(totalExpenses / Math.max(1, draft.monthly) * 100, 100)}%` }} /></div><div className="budget-caption"><span>{draft.monthly ? Math.round(totalExpenses / draft.monthly * 100) : 0}% of budget used</span><span>{currentMonth}</span></div></article>
      <article className="panel category-budget-panel"><div className="panel-heading"><div><h2>Category limits</h2><p>Keep the flexible parts in balance</p></div><span className="category-count">{categories.length} categories</span></div><div className="budget-category-list">{categories.map((category, index) => { const spent = categorySpent(category); const limit = Number(draft[category]) || 0; const percent = limit ? spent / limit * 100 : spent ? 100 : 0; return <div className="budget-category-row" key={category}><div className="budget-category-title"><i style={{ background: colors[index] }} /><strong>{category}</strong><span>{money(spent)} spent</span></div><div className="category-progress"><div style={{ width: `${Math.min(percent, 100)}%`, background: percent >= 90 ? '#d76a54' : colors[index] }} /></div><label className="category-budget-input"><span>Limit</span><span>₹</span><input type="number" min="0" step="100" value={draft[category] ?? 0} onChange={(event) => update(category, event.target.value)} aria-label={`${category} monthly limit`} /></label>{percent >= 90 && <span className="category-warning">{percent >= 100 ? 'Over limit' : 'Near limit'}</span>}</div> })}</div></article>
    </form>
  </>
}
function AnalyticsPage({ transactions, income, expenses, totalIncome, totalExpenses, balance, spentByCategory, budgets }) {
  const trendData = buildMonthlyTrend(transactions)
  const budgetData = categories.map((name) => ({ name: name.length > 8 ? `${name.slice(0, 7)}…` : name, spent: spentByCategory.find((item) => item.name === name)?.amount || 0, budget: budgets[name] || 0 })).filter((item) => item.spent || item.budget)
  return <><PageHeading eyebrow="THE BIGGER PICTURE" title="Analytics" subtitle="Patterns and progress, made easier to understand." action={<span className="month-pill static"><CalendarDays size={14} /> {currentMonth}</span>} />
    <div className="analytics-stat-grid"><div className="analytics-stat"><span>Income</span><strong>{money(totalIncome)}</strong><i className="stat-up"><TrendingUp size={14} /> This month</i></div><div className="analytics-stat"><span>Expenses</span><strong>{money(totalExpenses)}</strong><i className="stat-down"><TrendingDown size={14} /> This month</i></div><div className="analytics-stat"><span>Net savings</span><strong>{money(balance)}</strong><i className="stat-up"><Target size={14} /> {totalIncome ? Math.round(balance / totalIncome * 100) : 0}% of income</i></div><div className="analytics-stat"><span>Transactions</span><strong>{transactions.length}</strong><i>{income.length} income · {expenses.length} expenses</i></div></div>
    <div className="analytics-grid"><article className="panel analytics-chart-panel"><div className="panel-heading"><div><h2>Income vs. expenses</h2><p>Monthly cash flow, last 6 months</p></div></div><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={trendData} barGap={5} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e6ebe7', fontSize: 12 }} /><Bar dataKey="income" fill="#55a38c" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" fill="#ed745b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></article><article className="panel analytics-chart-panel"><div className="panel-heading"><div><h2>Savings trend</h2><p>What you keep after spending</p></div></div><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e6ebe7', fontSize: 12 }} /><Line dataKey="savings" type="monotone" stroke="#5986d7" strokeWidth={2.5} dot={{ r: 3, fill: '#5986d7', strokeWidth: 0 }} /></LineChart></ResponsiveContainer></div></article></div>
    <div className="analytics-grid lower-analytics"><article className="panel analytics-chart-panel"><div className="panel-heading"><div><h2>Budget vs. actual</h2><p>Spending against category limits</p></div></div><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={budgetData} barGap={4} margin={{ top: 8, right: 12, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0ed" strokeDasharray="3 5" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#909b96', fontSize: 10 }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e6ebe7', fontSize: 12 }} /><Bar dataKey="budget" name="Budget" fill="#dcebe5" radius={[3, 3, 0, 0]} /><Bar dataKey="spent" name="Actual" fill="#ed745b" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></article><article className="panel top-categories-panel"><div className="panel-heading"><div><h2>Top spending categories</h2><p>Where most of your expenses go</p></div></div>{spentByCategory.slice(0, 5).map((item, index) => <div className="top-category-row" key={item.name}><span className="rank">0{index + 1}</span><span className="top-category-name">{item.name}</span><div className="top-category-track"><i style={{ width: `${spentByCategory[0] ? item.amount / spentByCategory[0].amount * 100 : 0}%`, background: item.color }} /></div><strong>{money(item.amount)}</strong></div>)}</article></div>
  </>
}
function RecommendationsPage({ recommendations, spentByCategory, setPage }) {
  return <><PageHeading eyebrow="SMALL STEPS, BETTER HABITS" title="Your money, with a little perspective" subtitle="Personalized observations from your transactions and budget. Not financial or investment advice." action={<button className="button button-outline" onClick={() => setPage('AI assistant')}><MessageCircle size={16} /> Ask the assistant</button>} />
    <section className="recommendation-feature"><div className="recommendation-feature-copy"><span className="ai-orb"><Sparkles size={20} /></span><span className="eyebrow">YOUR MONTHLY SNAPSHOT</span><h2>{spentByCategory[0] ? `${spentByCategory[0].name} is your biggest spending category.` : 'A fresh start for your spending.'}</h2><p>{recommendations[0]?.text || 'As you add transactions, PocketSmart will share simple patterns to help you feel more in control.'}</p><button className="button button-light" onClick={() => setPage('Budgets')}>Review my budget <ArrowRight size={15} /></button></div><div className="recommendation-feature-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-center"><Wallet size={32} /></div><div className="art-tag tag-one"><TrendingDown size={14} /> Thoughtful spending</div><div className="art-tag tag-two"><Target size={14} /> Saving steadily</div></div></section>
    <div className="recommendation-grid">{recommendations.map((item, index) => { const Icon = [Lightbulb, Gauge, Activity, ShieldCheck][index % 4]; return <article className="panel recommendation-card" key={item.title}><div className={`recommendation-icon rec-${index % 4}`}><Icon size={18} /></div><span className="recommendation-type">{item.type}</span><h3>{item.title}</h3><p>{item.text}</p>{item.action && <button className="text-button" onClick={() => setPage(item.action === 'Budget' ? 'Budgets' : 'AI assistant')}>{item.action} <ArrowRight size={14} /></button>}</article> })}</div>
    <p className="disclaimer"><CircleHelp size={15} /> PocketSmart shares general spending insights, not professional financial, tax, legal, or investment advice.</p>
  </>
}
function buildAlerts(spentByCategory, expenses, totalIncome, totalExpenses, budgets, balance) {
  const alerts = []
  const monthlyRatio = budgets.monthly ? totalExpenses / budgets.monthly : 0
  if (monthlyRatio >= 1) alerts.push({ type: 'budget-exceeded', level: 'warning', title: 'Monthly budget exceeded', message: `${money(totalExpenses - budgets.monthly)} above your ${money(budgets.monthly)} limit.` })
  else if (monthlyRatio >= .8) alerts.push({ type: 'budget-near', level: 'warning', title: 'Monthly budget is nearly used', message: `${Math.round(monthlyRatio * 100)}% of your monthly limit is used.` })
  for (const item of spentByCategory) {
    const limit = Number(budgets[item.name]) || 0
    if (limit && item.amount > limit) alerts.push({ type: `category-${item.name}`, level: 'warning', title: `${item.name} is above its limit`, message: `${money(item.amount - limit)} over the ${money(limit)} category budget.` })
  }
  const top = spentByCategory[0]
  if (top && totalExpenses > 0 && top.amount / totalExpenses >= .4) alerts.push({ type: 'high-category', level: 'info', title: `${top.name} is a large share of spending`, message: `${Math.round(top.amount / totalExpenses * 100)}% of this month's recorded expenses are in ${top.name}.` })
  if (totalIncome > 0 && balance < totalIncome * .1) alerts.push({ type: 'low-balance', level: 'warning', title: 'Remaining balance is low', message: `Less than 10% of your recorded income remains this month.` })
  const byCategory = new Map()
  for (const expense of expenses) byCategory.set(expense.category, [...(byCategory.get(expense.category) || []), expense])
  for (const [category, entries] of byCategory) {
    if (entries.length < 2) continue
    const average = entries.reduce((sum, item) => sum + Number(item.amount), 0) / entries.length
    const latest = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0]
    if (latest.amount >= average * 2) {
      alerts.push({ type: 'unusual-spending', level: 'info', title: 'A larger-than-usual purchase', message: `Your latest ${category.toLowerCase()} entry is higher than your average for that category.` })
      break
    }
  }
  if (alerts.length === 0) alerts.push({ type: 'on-track', level: 'success', title: 'You are within your budget', message: 'Your recorded spending is currently within the monthly plan.' })
  return alerts
}
function AssistantPage({ messages, chatInput, setChatInput, askAssistant }) {
  const prompts = ['Where did I spend the most this month?', 'How much can I save this month?', 'Give me a budget plan.']
  return <><PageHeading eyebrow="A FRIENDLY FINANCE SIDEKICK" title="PocketSmart AI Assistant" subtitle="Ask a question. Get a clear answer based on your own transactions." action={<span className="assistant-status"><i /> Your data is ready</span>} />
    <section className="assistant-layout"><div className="assistant-main panel"><div className="chat-header"><div className="chat-avatar"><Bot size={19} /></div><div><strong>PocketSmart Assistant</strong><span><i /> Here to help you understand your money</span></div><button className="icon-button" aria-label="More assistant options"><MoreHorizontal size={19} /></button></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><div className="chat-message-icon">{message.role === 'assistant' ? <Sparkles size={14} /> : 'AM'}</div><div className="chat-bubble">{message.text}</div></div>)}</div><form className="chat-compose" onSubmit={(event) => { event.preventDefault(); askAssistant() }}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about your spending..." aria-label="Ask PocketSmart" /><button className="send-button" aria-label="Send message" disabled={!chatInput.trim()}><ArrowRight size={18} /></button></form><span className="chat-disclaimer">Answers are based on the data available in your account.</span></div><aside className="assistant-aside"><div className="aside-kicker">TRY ASKING</div>{prompts.map((prompt) => <button className="suggestion-prompt" key={prompt} onClick={() => askAssistant(prompt)}>{prompt}<ArrowRight size={14} /></button>)}<div className="assistant-privacy"><ShieldCheck size={16} /><div><strong>Your finances stay private</strong><span>Answers use your own transaction history only.</span></div></div><div className="assistant-safety"><CircleHelp size={16} /><span>PocketSmart can help with spending habits, but not investment decisions or guaranteed returns.</span></div></aside></section>
  </>
}
function ProfilePage({ auth, logOut, setAuth, showToast, onCreateAccount }) {
  return <><PageHeading eyebrow="YOUR POCKETSMART ACCOUNT" title="Profile & settings" subtitle="Manage your account and the way you use PocketSmart." />
    <div className="profile-layout"><section className="panel profile-card"><div className="profile-avatar">{auth.name?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'AM'}</div><div><h2>{auth.name || 'PocketSmart'}</h2><p>{auth.email}</p><span className="account-type"><i />{auth.mode === 'demo' ? 'Demo workspace' : 'Personal account'}</span></div>{auth.mode === 'demo' && <button className="button button-primary profile-create" onClick={onCreateAccount}>Create account <ArrowRight size={14} /></button>}</section><section className="panel settings-panel"><div className="settings-heading"><div><h2>Account details</h2><p>Your profile information is kept private.</p></div><ShieldCheck size={19} /></div><label>Full name<input value={auth.name || ''} onChange={(event) => { const next = { ...auth, name: event.target.value }; setAuth(next); localStorage.setItem('pocketsmart-auth', JSON.stringify(next)) }} /></label><label>Email address<input value={auth.email || ''} readOnly /></label><label>Currency<select defaultValue="INR"><option value="INR">Indian Rupee (₹ INR)</option><option value="USD">US Dollar ($ USD)</option></select></label><button className="button button-outline settings-logout" onClick={logOut}><LogOut size={15} /> Sign out</button></section><section className="panel privacy-card"><div className="privacy-icon"><ShieldCheck size={20} /></div><div><h3>Your financial data belongs to you</h3><p>Transactions and budgets are private to your account. Demo data stays in this browser and can be cleared at any time.</p></div><button className="text-button" onClick={() => { localStorage.removeItem(dataKey('transactions', auth)); localStorage.removeItem(dataKey('budgets', auth)); showToast('Local data cleared. Refresh to reload sample data.') }}>Clear local data</button></section></div>
  </>
}
function TransactionModal({ item, onClose, onSubmit }) {
  const [type, setType] = useState(item.type || 'Expense')
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="transaction-modal" onSubmit={onSubmit}><div className="modal-heading"><div><div className="eyebrow">YOUR MONEY MOVES</div><h2>{item.id ? 'Edit transaction' : 'Add transaction'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={19} /></button></div><div className="transaction-type-toggle"><button type="button" className={type === 'Expense' ? 'selected expense-selected' : ''} onClick={() => setType('Expense')}><ArrowUpRight size={15} /> Expense</button><button type="button" className={type === 'Income' ? 'selected income-selected' : ''} onClick={() => setType('Income')}><ArrowDownLeft size={15} /> Income</button></div><input type="hidden" name="type" value={type} /><label className="form-label">Amount<span className="amount-input"><span>₹</span><input name="amount" type="number" min="0.01" step="0.01" required defaultValue={item.amount || ''} placeholder="0.00" autoFocus /></span></label><label className="form-label">Category<select name="category" defaultValue={item.category || (type === 'Income' ? 'Salary' : 'Food')} required>{(type === 'Income' ? ['Salary', 'Freelance', 'Business', 'Investment return', 'Gift', 'Other income'] : categories).map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-label">Date<input type="date" name="date" required defaultValue={item.date || isoDate()} /></label><label className="form-label">Description<input name="description" maxLength="120" required defaultValue={item.description || ''} placeholder="What was this for?" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary"><Check size={15} /> {item.id ? 'Save changes' : 'Add transaction'}</button></div></form></div>
}
function AuthScreen({ mode, setMode, onSubmit, busy, error, onDemo }) {
  return <div className="auth-screen"><div className="auth-visual"><a className="brand auth-brand" href="#"><span className="brand-mark"><Wallet size={19} /></span><span>Pocket<span className="brand-smart">Smart</span><small>YOUR MONEY, IN FOCUS</small></span></a><div className="auth-visual-copy"><span className="eyebrow">A CALMER WAY TO MANAGE MONEY</span><h1>Small choices.<br />A clearer picture.</h1><p>Make sense of your spending, build a budget that feels right, and find room to save.</p><div className="auth-quote"><Sparkles size={17} /><span>“I finally know where my money goes, without feeling judged.”</span><small>POCKETSMART MEMBER</small></div></div><span className="auth-orbit orbit-a" /><span className="auth-orbit orbit-b" /></div><div className="auth-form-side"><div className="auth-form-wrap"><button className="text-button auth-back" onClick={onDemo}><ArrowRight className="back-arrow" size={14} /> Back to demo</button><span className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'A FRESH START'}</span><h2>{mode === 'login' ? 'Sign in to PocketSmart' : 'Create your account'}</h2><p className="auth-subtitle">{mode === 'login' ? 'Pick up where you left off.' : 'Your personal finance space, ready when you are.'}</p>{error && <p className="auth-error" role="alert">{error}</p>}<form onSubmit={onSubmit} className="auth-form">{mode === 'signup' && <label className="form-label">Your name<input name="name" minLength="2" required placeholder="e.g. Aarav Mehta" /></label>}<label className="form-label">Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label className="form-label">Password<input name="password" type="password" minLength="8" required placeholder="At least 8 characters" /></label><button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></button></form><div className="auth-switch">{mode === 'login' ? 'New to PocketSmart?' : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div><div className="auth-security"><ShieldCheck size={15} /> Your account is secured and your data stays private.</div></div></div></div>
}
function buildRecommendations(spentByCategory, expenses, income, totalIncome, totalExpenses, budgets, balance) {
  const top = spentByCategory[0]
  const categoryCount = spentByCategory.length
  const recs = []
  if (top) {
    const share = totalExpenses ? Math.round(top.amount / totalExpenses * 100) : 0
    recs.push({ type: 'SPENDING PATTERN', title: `${top.name} is your top category`, text: `${money(top.amount)} went to ${top.name.toLowerCase()} across ${expenses.filter((item) => item.category === top.name).length} transactions${share ? `, about ${share}% of your recorded expenses` : ''}. A quick look at the smaller purchases here could reveal a comfortable way to save.`, action: 'Explore' })
  }
  if (totalIncome > 0) {
    const suggested = Math.round(Math.max(0, balance) * .2 / 500) * 500
    recs.push({ type: 'SAVINGS IDEA', title: suggested ? `Try setting aside ${money(suggested)}` : 'Start with a small savings habit', text: suggested ? `Your current balance is ${money(balance)}. Setting aside ${money(suggested)} as a first step would leave room for your recorded spending. Adjust the amount to what feels realistic.` : 'Your recorded expenses are close to or above your income. Review flexible categories first and choose a savings target that feels manageable.', action: 'Budget' })
  }
  const overBudget = categories.find((category) => spentByCategory.some((item) => item.name === category && item.amount > (budgets[category] || 0)))
  if (overBudget) {
    const over = spentByCategory.find((item) => item.name === overBudget)
    recs.push({ type: 'BUDGET CHECK-IN', title: `${overBudget} is above its limit`, text: `${money(over.amount)} is recorded against a ${money(budgets[overBudget])} category budget. Consider adjusting next month’s plan or looking for one easy-to-change expense.`, action: 'Budget' })
  } else if (categoryCount) {
    recs.push({ type: 'BUDGET CHECK-IN', title: 'Your categories are within their limits', text: 'A quick weekly check-in can help keep your plan realistic and reduce end-of-month surprises.', action: 'Budget' })
  }
  recs.push({ type: 'MONTHLY REFLECTION', title: `${expenses.length} expenses recorded this month`, text: income.length ? `You have logged ${income.length} income entries and ${expenses.length} expenses. Your recorded balance is ${money(balance)}. Keep capturing small purchases to make this picture more complete.` : 'Add your income entries to see a more complete monthly balance and savings picture.', action: 'Explore' })
  return recs
}
function localAnswer(question, expenses, income, budgets, totalIncome, totalExpenses, balance, spentByCategory) {
  const lower = question.toLowerCase()
  const top = spentByCategory[0]
  const food = expenses.filter((item) => item.category.toLowerCase() === 'food').reduce((sum, item) => sum + Number(item.amount), 0)
  if (/food/.test(lower)) return `You’ve recorded ${money(food)} in Food expenses across ${expenses.filter((item) => item.category === 'Food').length} transactions. This is based on the entries currently in your PocketSmart workspace.`
  if (/most|category|where/.test(lower)) return top ? `Your biggest recorded expense category is ${top.name} at ${money(top.amount)} (${totalExpenses ? Math.round(top.amount / totalExpenses * 100) : 0}% of expenses). You could browse those transactions for any easy-to-adjust costs.` : 'There are no expense entries yet. Add a few transactions and I can spot your biggest category.'
  if (/save|savings|budget plan/.test(lower)) return `Your recorded income is ${money(totalIncome)} and expenses are ${money(totalExpenses)}, leaving a balance of ${money(balance)}. A gentle starting point could be setting aside around ${money(Math.max(0, Math.round(balance * .2 / 500) * 500))}, if that fits your needs. Your current monthly budget is ${money(budgets.monthly)}. This is a spending summary, not financial advice.`
  if (/increase|increased|why/.test(lower)) return top ? `${top.name} is currently your largest expense category at ${money(top.amount)}. I can only see the transactions entered here, so compare recent entries in that category with your usual month to understand what changed.` : 'I need more expense history to compare what may have changed. Add your recent transactions and I can help you look for a pattern.'
  if (/reduce|cut|lower/.test(lower)) return top ? `Start by reviewing ${top.name}, your largest category at ${money(top.amount)}. Look for one repeat cost or optional purchase you could adjust, then check whether that change still feels comfortable next week.` : 'Start by recording a few expenses. Then we can find a category to review together.'
  return `Based on what you’ve recorded, your balance is ${money(balance)} from ${money(totalIncome)} income and ${money(totalExpenses)} expenses. Ask me about a specific category, your savings, or a simple budget plan.`
}

export default App
