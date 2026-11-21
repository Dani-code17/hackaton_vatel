// Proxy DeepSeek côté serveur : la clé reste dans les secrets Supabase,
// jamais dans le bundle JavaScript exposé au navigateur.
//
// Déploiement :
//   supabase functions deploy deepseek --project-ref <ref>
//   supabase secrets set DEEPSEEK_API_KEY=sk-... --project-ref <ref>
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) return json({ error: 'DEEPSEEK_API_KEY non configurée' }, 501)

  let payload: { system?: string; user?: string; temperature?: number; maxTokens?: number }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Corps de requête invalide' }, 400)
  }

  if (!payload.user) return json({ error: 'Prompt manquant' }, 400)

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: payload.temperature ?? 0.2,
        max_tokens: payload.maxTokens ?? 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: payload.system ?? 'Réponds uniquement en JSON.' },
          { role: 'user', content: payload.user },
        ],
      }),
    })

    if (!upstream.ok) {
      return json({ error: `DeepSeek HTTP ${upstream.status}` }, 502)
    }

    const data = await upstream.json()
    const content = data?.choices?.[0]?.message?.content ?? ''
    return json({ content })
  } catch (error) {
    return json({ error: (error as Error).message ?? 'Appel DeepSeek impossible' }, 502)
  }
})
