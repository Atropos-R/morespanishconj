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
            tenseKey,
            personKey: person.key,
            personLabel: person.label,
            answer: form.trim(),
          })
        }
      }
    }
  }
  // Shuffle
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
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'accent_error' | 'wrong'
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [streak, setStreak] = useState(0)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, total: 0 })
  const [showAnswer, setShowAnswer] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (verbs.length > 0) {
      const q = buildQueue(verbs, enabledTenses, enabledPersons)
      setQueue(q)
      setIndex(0)
      setInput('')
      setFeedback(null)
      setCorrectAnswer(null)
      setShowAnswer(false)
    }
  }, [verbs, enabledTenses, enabledPersons])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading, index, feedback])

  const currentCard = queue[index] || null

  const advance = useCallback(() => {
    setInput('')
    setFeedback(null)
    setCorrectAnswer(null)
    setShowAnswer(false)
    setIndex(i => {
      const next = i + 1
      if (next >= queue.length) {
        // Reshuffle and restart
        const q = buildQueue(verbs, enabledTenses, enabledPersons)
        setQueue(q)
        return 0
      }
      return next
    })
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [queue, verbs, enabledTenses, enabledPersons])

  const handleSubmit = useCallback(() => {
    if (!currentCard) return

    if (feedback) {
      // Already answered — Enter moves to next
      advance()
      return
    }

    if (!input.trim()) {
      // Empty submit — show the answer
      setShowAnswer(true)
      setCorrectAnswer(currentCard.answer)
      setFeedback('skipped')
      setStreak(0)
      setSessionStats(s => ({ ...s, wrong: s.wrong + 1, total: s.total + 1 }))
      return
    }

    const result = checkAnswer(input, currentCard.answer, strictAccents)
    setFeedback(result)

    if (result === 'correct') {
      setStreak(s => s + 1)
      setSessionStats(s => ({ ...s, correct: s.correct + 1, total: s.total + 1 }))
      // Auto-advance after short delay on correct
      setTimeout(advance, 500)
    } else {
      setCorrectAnswer(currentCard.answer)
      setStreak(0)
      setSessionStats(s => ({ ...s, wrong: s.wrong + 1, total: s.total + 1 }))
    }
  }, [currentCard, feedback, input, strictAccents, advance])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (loading) {
    return (
      <div className="trainer-empty">
        <div className="spinner" />
        <p>Loading verbs...</p>
      </div>
    )
  }

  if (verbs.length === 0) {
    return (
      <div className="trainer-empty">
        <p className="empty-icon">📚</p>
        <h2>No verbs yet</h2>
        <p>Add some verbs to get started.</p>
        <button className="btn-primary" onClick={onGoToVerbs}>Add Verbs →</button>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="trainer-empty">
        <p className="empty-icon">⚙️</p>
        <h2>Nothing to drill</h2>
        <p>Enable at least one tense and one person form in Settings.</p>
      </div>
    )
  }

  const tenseInfo = currentCard ? TENSES[currentCard.tenseKey] : null
  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : null

  return (
    <div className="trainer">
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-label">streak</span>
          <span className="stat-value streak">{streak}</span>
        </div>
        <div className="progress-pill">
          {index + 1} / {queue.length}
        </div>
        {accuracy !== null && (
          <div className="stat">
            <span className="stat-label">accuracy</span>
            <span className="stat-value">{accuracy}%</span>
          </div>
        )}
      </div>

      {/* Card */}
      {currentCard && (
        <div className={`card ${feedback || ''}`}>
          <div className="card-meta">
            <span className="card-group">{tenseInfo?.group}</span>
            <span className="card-tense">{tenseInfo?.label}</span>
          </div>

          <div className="card-prompt">
            <span className="card-person">{currentCard.personLabel}</span>
            <span className="card-infinitive">{currentCard.infinitive}</span>
          </div>

          <div className="input-row">
            <input
              ref={inputRef}
              className={`conj-input ${feedback || ''}`}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="conjugación..."
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
              {feedback ? '→' : '✓'}
            </button>
          </div>

          {feedback === 'correct' && (
            <div className="feedback correct">¡Correcto! ✓</div>
          )}
          {feedback === 'accent_error' && (
            <div className="feedback accent-error">
              <span>Almost! Missing accent: <strong>{correctAnswer}</strong></span>
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="feedback wrong">
              <span>Answer: <strong>{correctAnswer}</strong></span>
            </div>
          )}
          {feedback === 'skipped' && (
            <div className="feedback skipped">
              <span>Skipped: <strong>{correctAnswer}</strong></span>
            </div>
          )}

          {feedback && feedback !== 'correct' && (
            <div className="next-hint">Press Enter to continue</div>
          )}
        </div>
      )}

      <div className="keyboard-hints">
        <kbd>Enter</kbd> submit / next &nbsp;·&nbsp; <kbd>Enter</kbd> on empty = skip
      </div>
    </div>
  )
}
