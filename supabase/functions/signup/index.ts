// Inscription publique : crée le compte Auth confirmé d'emblée (pas d'e-mail à
// attendre) puis laisse le trigger `handle_new_user` créer le profil applicatif.
// La service_role reste côté serveur ; seuls les rôles élève et parent sont acceptés.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  let body: { email?: string; password?: string; fullName?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corps de requête invalide' }, 400)
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const fullName = (body.fullName ?? '').trim()
  const role = body.role === 'parent' ? 'parent' : 'eleve'

  if (!EMAIL_RE.test(email)) return json({ error: 'Adresse e-mail invalide' }, 400)
  if (password.length < 6) {
    return json({ error: 'Mot de passe trop court (6 caractères minimum)' }, 400)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Configuration serveur incomplète' }, 500)

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email, role },
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      payload?.msg ?? payload?.message ?? payload?.error_description ?? 'Inscription impossible'
    const alreadyExists = /already|registered|exists/i.test(String(message))
    return json(
      { error: alreadyExists ? 'Un compte existe déjà avec cette adresse.' : message },
      alreadyExists ? 409 : 400,
    )
  }

  return json({ ok: true, id: payload?.id ?? null, role }, 201)
})
