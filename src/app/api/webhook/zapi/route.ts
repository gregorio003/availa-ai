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

  const response = await fetch(
    `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Z-API error: ${error}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  const body: ZAPIMessage = await request.json()

  // Ignore messages sent by the bot itself
  if (body.fromMe) return NextResponse.json({ status: 'ignored' })

  // Only handle text messages
  if (body.type !== 'ReceivedCallback') return NextResponse.json({ status: 'ignored' })

  const text = body.text?.message
  if (!text) return NextResponse.json({ status: 'ignored' })

  const customerPhone = body.phone.replace('@s.whatsapp.net', '').replace('@c.us', '')
  const customerName = body.senderName ?? null

  const supabase = createServiceClient()

  // Find active business
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('active', true)
    .single() as { data: Business | null }

  if (!business) return NextResponse.json({ status: 'no business' })

  // Find or create customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business.id)
    .eq('phone', customerPhone)
    .single()

  if (!customer) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({ business_id: business.id, phone: customerPhone, name: customerName })
      .select()
      .single()
    customer = newCustomer
  } else if (customerName && !customer.name) {
    await supabase.from('customers').update({ name: customerName }).eq('id', customer.id)
  }

  if (!customer) return NextResponse.json({ status: 'no customer' })

  // Find or create active conversation
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*, messages(*)')
    .eq('business_id', business.id)
    .eq('customer_id', customer.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: Conversation | null }

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ business_id: business.id, customer_id: customer.id })
      .select('*, messages(*)')
      .single()
    conversation = newConv as Conversation
  }

  if (!conversation) return NextResponse.json({ status: 'no conversation' })

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

  // Run AI agent
  const { reply, updatedContext } = await runSchedulingAgent({
    business,
    services: services ?? [],
    conversation,
    customerName,
    customerMessage: text,
  })

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

  return NextResponse.json({ status: 'ok' })
}
