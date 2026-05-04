import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isSupabaseConfigured = () => !!supabase

export async function fetchVerbs() {
  if (!supabase) return getLocalVerbs()
  const { data, error } = await supabase
    .from('verbs')
    .select('*')
    .order('infinitive', { ascending: true })
  if (error) { console.error(error); return getLocalVerbs() }
  return data || []
}

export async function addVerb(infinitive, conjugations, definition = null) {
  const verbData = { infinitive, conjugations, definition, added_at: new Date().toISOString() }
  if (!supabase) return addLocalVerb(verbData)
  const { data, error } = await supabase
    .from('verbs')
    .upsert({ infinitive, conjugations, definition }, { onConflict: 'infinitive' })
    .select()
    .single()
  if (error) { console.error(error); return addLocalVerb(verbData) }
  return data
}

export async function deleteVerb(infinitive) {
  if (!supabase) return deleteLocalVerb(infinitive)
  const { error } = await supabase.from('verbs').delete().eq('infinitive', infinitive)
  if (error) console.error(error)
}

function getLocalVerbs() {
  try { return JSON.parse(localStorage.getItem('verb_gym_verbs') || '[]') } catch { return [] }
}

function addLocalVerb(verbData) {
  const verbs = getLocalVerbs()
  const i = verbs.findIndex(v => v.infinitive === verbData.infinitive)
  if (i >= 0) verbs[i] = verbData; else verbs.push(verbData)
  localStorage.setItem('verb_gym_verbs', JSON.stringify(verbs))
  return verbData
}

function deleteLocalVerb(infinitive) {
  const verbs = getLocalVerbs().filter(v => v.infinitive !== infinitive)
  localStorage.setItem('verb_gym_verbs', JSON.stringify(verbs))
}
