import { TENSES, PERSONS } from '../utils/conjugations'
import { isSupabaseConfigured } from '../utils/supabase'

const TENSE_GROUPS = ['Indicativo', 'Subjuntivo', 'Imperativo']

export default function Settings({ enabledTenses, setEnabledTenses, enabledPersons, setEnabledPersons, strictAccents, setStrictAccents }) {
  
  function toggleTense(key) {
    setEnabledTenses(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function togglePerson(key) {
    setEnabledPersons(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleAllTenses(on) {
    setEnabledTenses(Object.keys(TENSES).reduce((acc, k) => ({ ...acc, [k]: on }), {}))
  }

  function toggleAllPersons(on) {
    setEnabledPersons(PERSONS.reduce((acc, p) => ({ ...acc, [p.key]: on }), {}))
  }

  const supabaseOk = isSupabaseConfigured()

  return (
    <div className="settings">
      <h2>Settings</h2>

      {/* Accent mode */}
      <section className="settings-section">
        <h3>Accent Checking</h3>
        <div className="toggle-row">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={strictAccents}
              onChange={e => setStrictAccents(e.target.checked)}
            />
            <span>Strict mode — accents required</span>
          </label>
          <p className="setting-desc">
            When on, <em>hablo</em> ≠ <em>habló</em>. Turn off to accept unaccented answers with a warning.
          </p>
        </div>
      </section>

      {/* Persons */}
      <section className="settings-section">
        <div className="section-header">
          <h3>Person Forms</h3>
          <div className="bulk-btns">
            <button onClick={() => toggleAllPersons(true)}>All</button>
            <button onClick={() => toggleAllPersons(false)}>None</button>
          </div>
        </div>
        <div className="toggle-grid">
          {PERSONS.map(person => (
            <label key={person.key} className={`toggle-chip ${enabledPersons[person.key] ? 'on' : 'off'}`}>
              <input
                type="checkbox"
                checked={!!enabledPersons[person.key]}
                onChange={() => togglePerson(person.key)}
              />
              {person.label}
            </label>
          ))}
        </div>
      </section>

      {/* Tenses */}
      <section className="settings-section">
        <div className="section-header">
          <h3>Tenses</h3>
          <div className="bulk-btns">
            <button onClick={() => toggleAllTenses(true)}>All</button>
            <button onClick={() => toggleAllTenses(false)}>None</button>
          </div>
        </div>
        {TENSE_GROUPS.map(group => (
          <div key={group} className="tense-group">
            <h4>{group}</h4>
            <div className="toggle-grid">
              {Object.entries(TENSES)
                .filter(([, info]) => info.group === group)
                .map(([key, info]) => (
                  <label key={key} className={`toggle-chip ${enabledTenses[key] ? 'on' : 'off'}`}>
                    <input
                      type="checkbox"
                      checked={!!enabledTenses[key]}
                      onChange={() => toggleTense(key)}
                    />
                    {info.label}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* Supabase status */}
      <section className="settings-section">
        <h3>Sync Status</h3>
        <div className={`sync-status ${supabaseOk ? 'ok' : 'local'}`}>
          {supabaseOk
            ? '🟢 Syncing globally via Supabase'
            : '🟡 Local mode — verbs stored on this device only. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env for global sync.'}
        </div>
      </section>
    </div>
  )
}
