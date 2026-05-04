import { useState } from 'react'
import { fetchConjugations } from '../utils/conjugations'
import { addVerb, deleteVerb } from '../utils/supabase'

export default function VerbManager({ verbs, onRefresh }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    const infinitive = input.trim().toLowerCase()
    if (!infinitive) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const conjugations = await fetchConjugations(infinitive)
      await addVerb(infinitive, conjugations)
      setSuccess(`"${infinitive}" added!`)
      setInput('')
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(infinitive) {
    setDeleting(infinitive)
    try {
      await deleteVerb(infinitive)
      onRefresh()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="verb-manager">
      <div className="vm-header">
        <h2>Verb Library</h2>
        <p className="vm-subtitle">
          {verbs.length} verb{verbs.length !== 1 ? 's' : ''} in pool
        </p>
      </div>

      <form className="add-verb-form" onSubmit={handleAdd}>
        <input
          className="verb-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="hablar, ser, tener..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={loading}
        />
        <button className="btn-primary" type="submit" disabled={loading || !input.trim()}>
          {loading ? '...' : '+ Add'}
        </button>
      </form>

      {error && <div className="vm-error">{error}</div>}
      {success && <div className="vm-success">{success}</div>}

      <div className="verb-list">
        {verbs.length === 0 && (
          <div className="verb-list-empty">
            No verbs yet. Type an infinitive above to add one.
          </div>
        )}
        {verbs.map(verb => (
          <div key={verb.infinitive} className="verb-item">
            <span className="verb-name">{verb.infinitive}</span>
            <button
              className="verb-delete"
              onClick={() => handleDelete(verb.infinitive)}
              disabled={deleting === verb.infinitive}
              title="Remove verb"
            >
              {deleting === verb.infinitive ? '...' : '×'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
