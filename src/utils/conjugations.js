import conjugateVerb from './conjugateVerb.js'

export const TENSES = {
  presente:              { label: 'Presente',           group: 'Indicativo' },
  preterito_indefinido:  { label: 'Pretérito Indefinido', group: 'Indicativo' },
  preterito_imperfecto:  { label: 'Pretérito Imperfecto', group: 'Indicativo' },
  futuro:                { label: 'Futuro',              group: 'Indicativo' },
  condicional:           { label: 'Condicional',         group: 'Indicativo' },
  preterito_perfecto:    { label: 'Pretérito Perfecto',  group: 'Indicativo' },
  pluscuamperfecto:      { label: 'Pluscuamperfecto',    group: 'Indicativo' },
  futuro_perfecto:       { label: 'Futuro Perfecto',     group: 'Indicativo' },
  subjuntivo_presente:   { label: 'Presente',            group: 'Subjuntivo' },
  subjuntivo_imperfecto: { label: 'Pretérito Imperfecto', group: 'Subjuntivo' },
  subjuntivo_futuro:     { label: 'Futuro',              group: 'Subjuntivo' },
  imperativo_afirmativo: { label: 'Afirmativo',          group: 'Imperativo' },
  imperativo_negativo:   { label: 'Negativo',            group: 'Imperativo' },
}

export const PERSONS = [
  { key: 'yo',       label: 'yo' },
  { key: 'tu',       label: 'tú' },
  { key: 'el',       label: 'él/ella/Ud.' },
  { key: 'nosotros', label: 'nosotros' },
  { key: 'vosotros', label: 'vosotros' },
  { key: 'ellos',    label: 'ellos/Uds.' },
]

function stripExclamation(s) {
  return s ? s.replace(/[¡!]/g, '').trim() : null
}

// Map conjugator's output structure to our flat format
function mapConjugations(raw) {
  const r = {}

  const pick = (obj, ...keys) => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined) return obj[k]
    }
    return null
  }

  const ind = raw?.indicative || {}
  const sub = raw?.subjunctive || {}
  const con = raw?.conditional || {}
  const imp = raw?.imperative || {}

  // Helper: extract 6 person forms from a tense object {singular:{first,second,third}, plural:{first,second,third}}
  const forms = (t) => t ? {
    yo:       pick(t, 'singular')?.first  || null,
    tu:       pick(t, 'singular')?.second || null,
    el:       pick(t, 'singular')?.third  || null,
    nosotros: pick(t, 'plural')?.first    || null,
    vosotros: pick(t, 'plural')?.second   || null,
    ellos:    pick(t, 'plural')?.third    || null,
  } : null

  r.presente             = forms(ind.present)
  r.preterito_indefinido = forms(ind.preterite)
  r.preterito_imperfecto = forms(ind.imperfect)
  r.futuro               = forms(ind.future)
  r.condicional          = forms(con.present || con.future)
  r.preterito_perfecto   = forms(ind.perfect)
  r.pluscuamperfecto     = forms(ind.pluperfect)
  r.futuro_perfecto      = forms(ind['future perfect'])

  r.subjuntivo_presente   = forms(sub.present)
  // Prefer -ra form for imperfect subjunctive
  r.subjuntivo_imperfecto = forms(sub['imperfect -ra'] || sub['imperfect -se'] || sub.imperfect)
  r.subjuntivo_futuro     = forms(sub.future)

  // Imperative only has some persons
  const affirmative = imp?.affirmative
  const negative    = imp?.negative
  r.imperativo_afirmativo = affirmative ? {
    yo:       null,
    tu:       stripExclamation(affirmative?.singular?.second),
    el:       stripExclamation(affirmative?.singular?.third),
    nosotros: stripExclamation(affirmative?.plural?.first),
    vosotros: stripExclamation(affirmative?.plural?.second),
    ellos:    stripExclamation(affirmative?.plural?.third),
  } : null
  r.imperativo_negativo = negative ? {
    yo:       null,
    tu:       stripExclamation(negative?.singular?.second),
    el:       stripExclamation(negative?.singular?.third),
    nosotros: stripExclamation(negative?.plural?.first),
    vosotros: stripExclamation(negative?.plural?.second),
    ellos:    stripExclamation(negative?.plural?.third),
  } : null

  // Remove nulls from tenses that have no forms at all
  for (const tense of Object.keys(r)) {
    if (!r[tense]) { r[tense] = {}; continue }
    const hasAny = Object.values(r[tense]).some(v => v !== null)
    if (!hasAny) r[tense] = {}
  }

  return r
}

// Validate a verb exists by checking Wiktionary definition API
// (lightweight — just checks the page exists and has a Spanish verb entry)
async function validateVerb(infinitive) {
  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(infinitive)}`
    )
    if (!res.ok) return false
    const data = await res.json()
    const spanish = data.es || data.ES
    if (!spanish) return false
    return spanish.some(e => e.partOfSpeech?.toLowerCase().includes('verb'))
  } catch {
    // If Wiktionary is unreachable, allow through (conjugator will handle it)
    return true
  }
}

export async function fetchConjugations(infinitive) {
  const verb = infinitive.trim().toLowerCase()

  // Validate verb exists
  const valid = await validateVerb(verb)
  if (!valid) {
    throw new Error(`"${verb}" doesn't appear to be a Spanish verb. Check the spelling.`)
  }

  // Conjugate locally — instant, offline, handles irregulars
  let raw
  try {
    raw = conjugateVerb(verb, 'es')
  } catch (e) {
    throw new Error(`Could not conjugate "${verb}": ${e.message}`)
  }

  const conjugations = mapConjugations(raw)

  // Sanity check
  const hasData = Object.values(conjugations).some(t =>
    Object.values(t).some(v => v !== null)
  )
  if (!hasData) {
    throw new Error(`No conjugation data found for "${verb}"`)
  }

  return conjugations
}

// Fetch English definition
export async function fetchDefinition(infinitive) {
  try {
    const res = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(infinitive)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    const spanish = data.es || data.ES
    if (!spanish) return null
    for (const entry of spanish) {
      if (entry.partOfSpeech?.toLowerCase().includes('verb')) {
        const def = entry.definitions?.[0]?.definition
        if (def) return def.replace(/<[^>]+>/g, '').trim()
      }
    }
    return null
  } catch {
    return null
  }
}

export function normalizeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function checkAnswer(input, correct, strict = true) {
  const a = input.trim()
  const b = correct.trim()
  if (a === b) return 'correct'
  if (!strict && normalizeAccents(a) === normalizeAccents(b)) return 'accent_error'
  return 'wrong'
}
