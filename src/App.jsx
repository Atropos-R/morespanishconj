import { useState, useEffect, useCallback } from 'react'
import Trainer from './components/Trainer'
import Settings from './components/Settings'
import VerbManager from './components/VerbManager'
import { TENSES, PERSONS } from './utils/conjugations'
import { fetchVerbs } from './utils/supabase'
import './App.css'

const DEFAULT_TENSES = Object.keys(TENSES).reduce((acc, k) => ({ ...acc, [k]: true }), {})
const DEFAULT_PERSONS = PERSONS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {})

function loadSettings(key, defaults) {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return { ...defaults, ...JSON.parse(saved) }
  } catch {}
  return defaults
}

export default function App() {
  const [view, setView] = useState('train') // 'train' | 'settings' | 'verbs'
  const [verbs, setVerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [enabledTenses, setEnabledTenses] = useState(() => loadSettings('vg_tenses', DEFAULT_TENSES))
  const [enabledPersons, setEnabledPersons] = useState(() => loadSettings('vg_persons', DEFAULT_PERSONS))
  const [strictAccents, setStrictAccents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vg_strict') ?? 'true') } catch { return true }
  })

  useEffect(() => {
    loadVerbs()
  }, [])

  useEffect(() => {
    localStorage.setItem('vg_tenses', JSON.stringify(enabledTenses))
  }, [enabledTenses])

  useEffect(() => {
    localStorage.setItem('vg_persons', JSON.stringify(enabledPersons))
  }, [enabledPersons])

  useEffect(() => {
    localStorage.setItem('vg_strict', JSON.stringify(strictAccents))
  }, [strictAccents])

  async function loadVerbs() {
    setLoading(true)
    try {
      const data = await fetchVerbs()
      setVerbs(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">VERB GYM</span>
          <span className="logo-sub">ES</span>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'train' ? 'active' : ''}`}
            onClick={() => setView('train')}
          >Train</button>
          <button
            className={`nav-btn ${view === 'verbs' ? 'active' : ''}`}
            onClick={() => setView('verbs')}
          >Verbs</button>
          <button
            className={`nav-btn ${view === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >Settings</button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'train' && (
          <Trainer
            verbs={verbs}
            loading={loading}
            enabledTenses={enabledTenses}
            enabledPersons={enabledPersons}
            strictAccents={strictAccents}
            onGoToVerbs={() => setView('verbs')}
          />
        )}
        {view === 'verbs' && (
          <VerbManager
            verbs={verbs}
            onRefresh={loadVerbs}
          />
        )}
        {view === 'settings' && (
          <Settings
            enabledTenses={enabledTenses}
            setEnabledTenses={setEnabledTenses}
            enabledPersons={enabledPersons}
            setEnabledPersons={setEnabledPersons}
            strictAccents={strictAccents}
            setStrictAccents={setStrictAccents}
          />
        )}
      </main>
    </div>
  )
}
