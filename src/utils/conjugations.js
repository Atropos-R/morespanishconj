// Fetches and parses Spanish verb conjugations from Wiktionary

const WIKTIONARY_API = 'https://en.wiktionary.org/api/rest_v1/page/html/'

export const TENSES = {
  presente: { label: 'Presente', group: 'Indicativo' },
  preterito_indefinido: { label: 'Pretérito Indefinido', group: 'Indicativo' },
  preterito_imperfecto: { label: 'Pretérito Imperfecto', group: 'Indicativo' },
  futuro: { label: 'Futuro', group: 'Indicativo' },
  condicional: { label: 'Condicional', group: 'Indicativo' },
  preterito_perfecto: { label: 'Pretérito Perfecto', group: 'Indicativo' },
  pluscuamperfecto: { label: 'Pluscuamperfecto', group: 'Indicativo' },
  futuro_perfecto: { label: 'Futuro Perfecto', group: 'Indicativo' },
  subjuntivo_presente: { label: 'Presente', group: 'Subjuntivo' },
  subjuntivo_imperfecto: { label: 'Pretérito Imperfecto', group: 'Subjuntivo' },
  subjuntivo_futuro: { label: 'Futuro', group: 'Subjuntivo' },
  imperativo_afirmativo: { label: 'Afirmativo', group: 'Imperativo' },
  imperativo_negativo: { label: 'Negativo', group: 'Imperativo' },
}

export const PERSONS = [
  { key: 'yo', label: 'yo' },
  { key: 'tu', label: 'tú' },
  { key: 'el', label: 'él/ella/Ud.' },
  { key: 'nosotros', label: 'nosotros' },
  { key: 'vosotros', label: 'vosotros' },
  { key: 'ellos', label: 'ellos/Uds.' },
]

// Map Wiktionary table headers to our tense keys
// Wiktionary uses specific header text in the conjugation tables
const WIKTIONARY_TENSE_MAP = {
  // Indicative
  'present': 'presente',
  'preterite': 'preterito_indefinido',
  'imperfect': 'preterito_imperfecto',
  'future': 'futuro',
  'conditional': 'condicional',
  'present perfect': 'preterito_perfecto',
  'past perfect': 'pluscuamperfecto',
  'future perfect': 'futuro_perfecto',
  // Subjunctive
  'present subjunctive': 'subjuntivo_presente',
  'imperfect subjunctive': 'subjuntivo_imperfecto',
  'future subjunctive': 'subjuntivo_futuro',
  // Imperative
  'affirmative imperative': 'imperativo_afirmativo',
  'negative imperative': 'imperativo_negativo',
}

const WIKTIONARY_PERSON_ORDER = ['yo', 'tu', 'el', 'nosotros', 'vosotros', 'ellos']

function cleanText(text) {
  return text?.replace(/\s+/g, ' ').trim() || ''
}

function stripParenthetical(text) {
  // Remove things like "(yo)" prefixes Wiktionary sometimes adds
  return text.replace(/^\(.*?\)\s*/, '').trim()
}

export async function fetchConjugations(infinitive) {
  const url = `${WIKTIONARY_API}${encodeURIComponent(infinitive)}`
  
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'text/html' }
    })
    
    if (!response.ok) {
      throw new Error(`Verb "${infinitive}" not found on Wiktionary`)
    }
    
    const html = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    return parseConjugationTables(doc, infinitive)
  } catch (e) {
    throw new Error(`Could not fetch conjugations for "${infinitive}": ${e.message}`)
  }
}

function parseConjugationTables(doc, infinitive) {
  const result = {}
  
  // Initialize all tenses
  Object.keys(TENSES).forEach(tense => {
    result[tense] = {}
    PERSONS.forEach(p => { result[tense][p.key] = null })
  })

  // Find the Spanish section first
  let spanishSection = null
  const headers = doc.querySelectorAll('h2')
  for (const h of headers) {
    if (h.textContent.trim() === 'Spanish') {
      spanishSection = h
      break
    }
  }

  if (!spanishSection) {
    throw new Error(`No Spanish entry found for "${infinitive}"`)
  }

  // Collect all tables after the Spanish section heading
  const tables = []
  let el = spanishSection.nextElementSibling
  while (el) {
    if (el.tagName === 'H2') break // hit next language
    if (el.tagName === 'TABLE' || el.querySelector('table')) {
      const tbl = el.tagName === 'TABLE' ? el : el.querySelector('table')
      if (tbl) tables.push(tbl)
    }
    el = el.nextElementSibling
  }

  if (tables.length === 0) {
    // fallback: grab all tables anywhere and look for conjugation ones
    doc.querySelectorAll('table').forEach(t => tables.push(t))
  }

  for (const table of tables) {
    parseTable(table, result)
  }

  // Validate we got something
  const hasData = Object.values(result).some(tense =>
    Object.values(tense).some(v => v !== null)
  )
  
  if (!hasData) {
    throw new Error(`Could not parse conjugation table for "${infinitive}". The verb may not have a standard conjugation table on Wiktionary.`)
  }

  return result
}

function parseTable(table, result) {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length < 2) return

  // Try to identify what tenses this table section covers
  // Wiktionary uses th elements with colspan for section headers
  let currentTenseKey = null
  let personIndex = 0

  // Look for a caption or header row identifying the tense
  const caption = table.querySelector('caption')
  if (caption) {
    const capText = cleanText(caption.textContent).toLowerCase()
    for (const [wikKey, ourKey] of Object.entries(WIKTIONARY_TENSE_MAP)) {
      if (capText.includes(wikKey)) {
        currentTenseKey = ourKey
        break
      }
    }
  }

  // Parse row by row
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('th, td'))
    if (cells.length === 0) continue

    const firstCell = cleanText(cells[0].textContent).toLowerCase()

    // Check if this is a tense header row
    let matchedTense = null
    for (const [wikKey, ourKey] of Object.entries(WIKTIONARY_TENSE_MAP)) {
      if (firstCell.includes(wikKey)) {
        matchedTense = ourKey
        break
      }
    }

    if (matchedTense) {
      currentTenseKey = matchedTense
      personIndex = 0
      continue
    }

    // Check if this is a person row (has a conjugation value)
    if (currentTenseKey && personIndex < 6) {
      // The last td cell usually contains the conjugation
      const dataCells = row.querySelectorAll('td')
      if (dataCells.length > 0) {
        const lastCell = dataCells[dataCells.length - 1]
        const rawText = cleanText(lastCell.textContent)
        
        // Could be comma-separated (e.g. "hablé, hablaste" in some layouts)
        // Take the first form
        const forms = rawText.split(',').map(s => stripParenthetical(s.trim())).filter(Boolean)
        
        if (forms.length > 0 && forms[0].length > 0 && forms[0].length < 30) {
          const personKey = WIKTIONARY_PERSON_ORDER[personIndex]
          if (personKey && result[currentTenseKey]) {
            result[currentTenseKey][personKey] = forms[0]
          }
          personIndex++
        }
      }
    }
  }
}

// Normalize accent for lenient checking
export function normalizeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function checkAnswer(input, correct, strict = true) {
  const cleanInput = input.trim()
  const cleanCorrect = correct.trim()
  
  if (cleanInput === cleanCorrect) return 'correct'
  
  if (!strict && normalizeAccents(cleanInput) === normalizeAccents(cleanCorrect)) {
    return 'accent_error'
  }
  
  return 'wrong'
}

// Fetch English definition for a verb from Wiktionary dictionary API
export async function fetchDefinition(infinitive) {
  try {
    const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(infinitive)}`)
    if (!res.ok) return null
    const data = await res.json()
    
    // Look in Spanish section
    const spanish = data.es || data.ES
    if (!spanish) return null
    
    for (const entry of spanish) {
      if (entry.partOfSpeech?.toLowerCase().includes('verb')) {
        const def = entry.definitions?.[0]?.definition
        if (def) {
          // Strip HTML tags
          return def.replace(/<[^>]+>/g, '').trim()
        }
      }
    }
    return null
  } catch {
    return null
  }
}
