import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', user.id)
    .maybeSingle()
  if (!business) return NextResponse.json({ error: 'Sem negócio' }, { status: 404 })

  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
  const ext = EXT[file.type]
  if (!ext) return NextResponse.json({ error: 'Formato inválido (use PNG, JPG, WEBP ou SVG)' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Imagem muito grande (máx 2MB)' }, { status: 400 })

  const service = createServiceClient()
  const path = `${business.id}/logo-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await service.storage.from('logos').upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  const { data: pub } = service.storage.from('logos').getPublicUrl(path)
  const logoUrl = pub.publicUrl

  const { error: updErr } = await service.from('businesses').update({ logo_url: logoUrl }).eq('id', business.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

  return NextResponse.json({ logo_url: logoUrl })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  await service.from('businesses').update({ logo_url: null }).eq('owner_user_id', user.id)
  return NextResponse.json({ ok: true })
}
