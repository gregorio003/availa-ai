import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runSchedulingAgent } from '@/lib/agent/scheduler'
import type { Business, Service, Conversation } from '@/types'

interface ZAPIMessage {
  phone: string
  fromMe: boolean
  momment: number
  status: string
  chatName: string
  senderPhoto: string
  senderName: string
  participantPhone: string | null
  photo: string
  broadcast: boolean
  type: string
  instanceId: string
  text?: { message: string }
  image?: { caption: string }
}

async function sendZAPIMessage(phone: string, message: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN

  console.log('[ZAPI] Sending message to', phone)

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    }
  )

  const responseText = await response.text()
  console.log('[ZAPI] Send response status:', response.status, 'body:', responseText)

  if (!response.ok) {
    throw new Error(`Z-API send error ${response.status}: ${responseText}`)
  }

  return JSON.parse(responseText)
}

export async function POST(request: NextRequest) {
  let body: ZAPIMessage
  try {
    body = await request.json()
  } catch (e) {
    console.error('[ZAPI] Failed to parse request body:', e)
    return NextResponse.json({ status: 'bad_request' }, { status: 400 })
  }

  console.log('[ZAPI] Received webhook:', JSON.stringify(body, null, 2))

  if (body.fromMe) {
    console.log('[ZAPI] Ignoring fromMe message')
    return NextResponse.json({ status: 'ignored_fromMe' })
  }

  if (body.type !== 'ReceivedCallback') {
    console.log('[ZAPI] Ignoring type:', body.type)
    return NextResponse.json({ status: 'ignored_type_' + body.type })
  }

  const text = body.text?.message
  if (!text) {
    console.log('[ZAPI] No text message found in body')
    return NextResponse.json({ status: 'no_text' })
  }

  const customerPhone = body.phone.replace('@s.whatsapp.net', '').replace('@c.us', '')
  const customerName = body.senderName ?? null
  console.log('[ZAPI] Processing message from', customerPhone, ':', text)

  try {
    const supabase = createServiceClient()

    // Find active business
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('active', true)
      .limit(1)

    console.log('[ZAPI] Business query result:', businesses, 'error:', bizError)

    const business = businesses?.[0] as Business | undefined
    if (!business) {
      console.error('[ZAPI] No active business found')
      return NextResponse.json({ status: 'no_business' })
    }

    console.log('[ZAPI] Found business:', business.id, business.name)

    // Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', business.id)
      .eq('phone', customerPhone)
      .maybeSingle()

    if (!customer) {
      console.log('[ZAPI] Creating new customer')
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({ business_id: business.id, phone: customerPhone, name: customerName })
        .select()
        .single()
      if (custError) console.error('[ZAPI] Customer insert error:', custError)
      customer = newCustomer
    } else if (customerName && !customer.name) {
      await supabase.from('customers').update({ name: customerName }).eq('id', customer.id)
    }

    if (!customer) {
      console.error('[ZAPI] Could not find or create customer')
      return NextResponse.json({ status: 'no_customer' })
    }

    console.log('[ZAPI] Customer:', customer.id)

    // Find or create active conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .eq('business_id', business.id)
      .eq('customer_id', customer.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as { data: Conversation | null }

    let conversation = existingConv

    if (!conversation) {
      console.log('[ZAPI] Creating new conversation')
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ business_id: business.id, customer_id: customer.id })
        .select('*, messages(*)')
        .single()
      if (convError) console.error('[ZAPI] Conversation insert error:', convError)
      conversation = newConv as Conversation
    }

    if (!conversation) {
      console.error('[ZAPI] Could not find or create conversation')
      return NextResponse.json({ status: 'no_conversation' })
    }

    console.log('[ZAPI] Conversation:', conversation.id)

    // Save customer message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'customer',
      content: text,
    })

    // Get services
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true) as { data: Service[] | null }

    console.log('[ZAPI] Services found:', services?.length ?? 0)

    // Run AI agent
    console.log('[ZAPI] Running AI agent...')
    const { reply, updatedContext } = await runSchedulingAgent({
      business,
      services: services ?? [],
      conversation,
      customerName,
      customerMessage: text,
    })

    console.log('[ZAPI] AI reply:', reply)

    // Save assistant message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: reply,
    })

    // Update conversation context
    const updates: Record<string, unknown> = {
      context: updatedContext,
      updated_at: new Date().toISOString(),
    }
    if (updatedContext.stage === 'done') updates.status = 'completed'
    await supabase.from('conversations').update(updates).eq('id', conversation.id)

    // Send reply via Z-API
    await sendZAPIMessage(customerPhone, reply)
    console.log('[ZAPI] Reply sent successfully')

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[ZAPI] Unhandled error:', err)
    return NextResponse.json({ status: 'error', message: String(err) }, { status: 500 })
  }
}
