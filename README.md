# ⚡ Verb Gym — Spanish Conjugation Trainer

A fast, keyboard-driven Spanish verb conjugation drill app. Conjugation data is pulled live from Wiktionary. Verb lists sync globally via Supabase.

## Features

- **All tenses** — Presente, Pretérito, Imperfecto, Futuro, Condicional, Subjuntivo, Imperativo, and compound tenses
- **All person forms** — yo, tú, él/ella, nosotros, vosotros, ellos
- **Toggleable tenses & persons** in Settings
- **Accent checking** — strict mode (hablo ≠ habló) or lenient
- **Keyboard-first** — Enter to submit, Enter again to advance
- **Add any verb** by typing the infinitive — pulled from Wiktionary
- **Global verb sync** via Supabase (or local fallback)

---

## Deploy in ~10 minutes

### 1. Fork & clone

```bash
git clone https://github.com/YOUR_USERNAME/spanish-verb-gym.git
cd spanish-verb-gym
npm install
```

### 2. Set up Supabase (free tier)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. In the SQL Editor, run this to create the verbs table:

```sql
create table verbs (
  infinitive text primary key,
  conjugations jsonb not null,
  added_at timestamptz default now()
);

-- Allow public read/write (no auth required for this app)
alter table verbs enable row level security;

create policy "Public read" on verbs for select using (true);
create policy "Public insert" on verbs for insert with check (true);
create policy "Public update" on verbs for update using (true);
create policy "Public delete" on verbs for delete using (true);
```

4. Go to **Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Add secrets to GitHub

In your GitHub repo → **Settings → Secrets and variables → Actions**, add:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

### 4. Enable GitHub Pages

In your GitHub repo → **Settings → Pages**:
- Source: **GitHub Actions**

### 5. Push to main

```bash
git add .
git commit -m "initial deploy"
git push origin main
```

GitHub Actions will build and deploy automatically. Your site will be at:
`https://YOUR_USERNAME.github.io/spanish-verb-gym/`

---

## Running locally

```bash
cp .env.example .env
# Fill in your Supabase credentials in .env
npm run dev
```

The app works without Supabase — verbs will be stored in localStorage only.

---

## How conjugations work

When you add a verb, the app fetches its conjugation table from the [Wiktionary REST API](https://en.wiktionary.org/api/rest_v1/). This covers thousands of Spanish verbs including irregulars. The conjugation data is stored in Supabase so it only needs to be fetched once per verb.

---

## Customising the `base` path

If your GitHub repo is named something other than `spanish-verb-gym`, update `vite.config.js`:

```js
base: '/your-repo-name/',
```

And update the `<link rel="icon">` in `index.html` to match.
