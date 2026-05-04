import { useState, useEffect, useRef, useCallback } from 'react'
import { TENSES, PERSONS, checkAnswer } from '../utils/conjugations'

function buildQueue(verbs, enabledTenses, enabledPersons) {
  const queue = []
  for (const verb of verbs) {
    if (!verb.conjugations) continue
    for (const [tenseKey, enabled] of Object.entries(enabledTenses)) {
      if (!enabled) continue
      if (!verb.conjugations[tenseKey]) continue
      for (const person of PERSONS) {
        if (!enabledPersons[person.key]) continue
        const form = verb.conjugations[tenseKey][person.key]
        if (form && form.trim()) {
          queue.push({
            infinitive: verb.infinitive,
            definition: verb.definition || null,
            tenseKey,
            personKey: person.key,
            personLabel: person.label,
            answer: form.trim(),
          })
        }
      }
    }
  }
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]]
  }
  return queue
}

export default function Trainer({ verbs, loading, enabledTenses, enabledPersons, strictAccents, onGoToVerbs }) {
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [streak, setStreak] = useState(0)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 })
  const [waitingForEnter, setWaitingForEnter] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (verbs.length > 0) {
      const q = buildQueue(verbs, enabledTenses, enabledPersons)
      setQueue(q)
      setIndex(0)
      setInput('')
      setFeedback(null)
      setCorrectAnswer(null)
      setWaitingForEnter(false)
    }
  }, [verbs, enabledTenses, enabledPersons])

  useEffect(() => {
    inputRef.current?.focus()
  }, [index])

  const currentCard = queue[index] || null

  const advance = useCallback(() => {
    setInput('')
    setFeedback(null)
    setCorrectAnswer(null)
    setWaitingForEnter(false)
    setIndex(i => {
      const next = i + 1
      if (next >= queue.length) {
        const q = buildQueue(verbs, enabledTenses, enabledPersons)
        setQueue(q)
        return 0
      }
      return next
    })
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [queue, verbs, enabledTenses, enabledPersons])

  const handleSubmit = useCallback(() => {
    if (!currentCard) return

    if (waitingForEnter) {
      advance()
      return
    }

    if (feedback === 'correct') return

    if (!input.trim()) {
      setCorrectAnswer(currentCard.answer)
      setFeedback('skipped')
      setStreak(0)
      setSessionStats(s => ({ ...s, wrong: s.wrong + 1 }))
      setWaitingForEnter(true)
      return
    }

    const result = checkAnswer(input, currentCard.answer, strictAccents)
    setFeedback(result)

    if (result === 'correct') {
      setStreak(s => s + 1)
      setSessionStats(s => ({ ...s, correct: s.correct + 1 }))
      setTimeout(advance, 600)
    } else {
      setCorrectAnswer(currentCard.answer)
      setStreak(0)
      setSessionStats(s => ({ ...s, wrong: s.wrong + 1 }))
      setWaitingForEnter(true)
    }
  }, [currentCard, feedback, waitingForEnter, input, strictAccents, advance])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" />
        <p>Loading verbs...</p>
      </div>
    )
  }

  if (verbs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📚</div>
        <h2>No verbs yet</h2>
        <p>Add some verbs to get started.</p>
        <button className="btn-primary" onClick={onGoToVerbs}>Add verbs</button>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚙️</div>
        <h2>Nothing to drill</h2>
        <p>Enable at least one tense and one person in Settings.</p>
      </div>
    )
  }

  const tenseInfo = currentCard ? TENSES[currentCard.tenseKey] : null
  const total = sessionStats.correct + sessionStats.wrong
  const accuracy = total > 0 ? Math.round((sessionStats.correct / total) * 100) : null

  return (
    <div className="trainer">
      <div className="trainer-topbar">
        <div className="topbar-stat">
          <span className="topbar-label">Streak</span>
          <span className="topbar-value" style={{ color: streak > 0 ? 'var(--green)' : undefined }}>{streak}</span>
        </div>
        <span className="topbar-progress">{index + 1} / {queue.length}</span>
        <div className="topbar-stat" style={{ textAlign: 'right' }}>
          <span className="topbar-label">Accuracy</span>
          <span className="topbar-value">{accuracy !== null ? `${accuracy}%` : '—'}</span>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
      </div>

      {currentCard && (
        <div className={`card ${feedback || ''}`}>
          <div className="card-tags">
            <span className="tag">{tenseInfo?.group}</span>
            <span className="tag">{tenseInfo?.label}</span>
          </div>

          <div className="card-body">
            <div className="card-person">{currentCard.personLabel}</div>
            <div className="card-verb">{currentCard.infinitive}</div>
            {currentCard.definition && (
              <div className="card-definition">"{currentCard.definition}"</div>
            )}
          </div>

          <div className="input-area">
            <input
              ref={inputRef}
              className={`conj-input ${feedback || ''}`}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="type conjugation..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={!!feedback}
            />
            <button
              className={`submit-btn ${feedback || ''}`}
              onClick={handleSubmit}
              tabIndex={-1}
            >
              {waitingForEnter ? '→' : '↵'}
            </button>
          </div>

          {feedback === 'correct' && (
            <div className="feedback-bar correct">✓ Correct</div>
          )}
          {feedback === 'accent_error' && (
            <div className="feedback-bar accent">
              ⚠ Check accent — <strong>{correctAnswer}</strong>
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="feedback-bar wrong">
              ✗ <strong>{correctAnswer}</strong>
            </div>
          )}
          {feedback === 'skipped' && (
            <div className="feedback-bar skipped">
              <strong>{correctAnswer}</strong>
            </div>
          )}
        </div>
      )}

      <p className="hint-text">
        {waitingForEnter ? 'Press Enter to continue →' : 'Enter to submit · empty Enter to skip'}
      </p>
    </div>
  )
}
