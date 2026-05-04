import { createClient } from '@supabase/supabase-js'

// These are PUBLIC anon keys — safe to expose in frontend code
// User must fill these in after setting up Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isSupabaseConfigured = () => !!supabase

// Fetch all verbs from the global pool
export async function fetchVerbs() {
  if (!supabase) return getLocalVerbs()
  
  const { data, error } = await supabase
    .from('verbs')
    .select('*')
    .order('infinitive', { ascending: true })
  
  if (error) {
    console.error('Supabase fetch error:', error)
    return getLocalVerbs()
  }
  
  return data || []
}

// Add a verb to the global pool
export async function addVerb(infinitive, conjugations) {
  const verbData = {
    infinitive,
    conjugations,
    added_at: new Date().toISOString(),
  }
  
  if (!supabase) {
    return addLocalVerb(verbData)
  }
  
  const { data, error } = await supabase
    .from('verbs')
    .upsert({ infinitive, conjugations }, { onConflict: 'infinitive' })
    .select()
    .single()
  
  if (error) {
    console.error('Supabase insert error:', error)
    return addLocalVerb(verbData)
  }
  
  return data
}

// Delete a verb
export async function deleteVerb(infinitive) {
  if (!supabase) {
    return deleteLocalVerb(infinitive)
  }
  
  const { error } = await supabase
    .from('verbs')
    .delete()
    .eq('infinitive', infinitive)
  
  if (error) console.error('Supabase delete error:', error)
}

// LocalStorage fallback
function getLocalVerbs() {
  try {
    return JSON.parse(localStorage.getItem('verb_gym_verbs') || '[]')
  } catch {
    return []
  }
}

function addLocalVerb(verbData) {
  const verbs = getLocalVerbs()
  const existing = verbs.findIndex(v => v.infinitive === verbData.infinitive)
  if (existing >= 0) {
    verbs[existing] = verbData
  } else {
    verbs.push(verbData)
  }
  localStorage.setItem('verb_gym_verbs', JSON.stringify(verbs))
  return verbData
}

function deleteLocalVerb(infinitive) {
  const verbs = getLocalVerbs().filter(v => v.infinitive !== infinitive)
  localStorage.setItem('verb_gym_verbs', JSON.stringify(verbs))
}
