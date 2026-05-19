import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { runSchedulingAgent } from '@/lib/agent/scheduler'
import type { WhatsAppWebhookBody, Business, Service, Conversation } from '@/types'

// Webhook verification (Meta requires this)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Receive messages
export async function POST(request: NextRequest) {
  const body: WhatsAppWebhookBody = await request.json()

  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' })
  }

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue

      const value = change.value
      const messages = value.messages ?? []
      const contacts = value.contacts ?? []
      const phoneNumberId = value.metadata.phone_number_id

      for (const message of messages) {
        if (message.type !== 'text') continue

        const customerPhone = message.from
        const customerName = contacts.find(c => c.wa_id === customerPhone)?.profile.name ?? null
        const text = message.text?.body ?? ''

        await handleIncomingMessage({
          businessPhoneNumberId: phoneNumberId,
          customerPhone,
          customerName,
          text,
          whatsappMessageId: message.id,
          replyPhoneNumberId: phoneNumberId,
        })
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}

async function handleIncomingMessage({
  businessPhoneNumberId,
  customerPhone,
  customerName,
  text,
  whatsappMessageId,
  replyPhoneNumberId,
}: {
  businessPhoneNumberId: string
  customerPhone: string
  customerName: string | null
  text: string
  whatsappMessageId: string
  replyPhoneNumberId: string
}) {
  const supabase = createServiceClient()

  // Find business by phone number ID
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('active', true)
    .single() as { data: Business | null }

  if (!business) return

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

  if (!customer) return

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

  if (!conversation) return

  // Save customer message
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    role: 'customer',
    content: text,
    whatsapp_message_id: whatsappMessageId,
  })

  // Get services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true) as { data: Service[] | null }

  // Run AI agent
  const { reply, updatedContext, appointmentCreated } = await runSchedulingAgent({
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

  // Create appointment if booking was confirmed
  if (appointmentCreated) {
    await supabase.from('appointments').insert({
      business_id: business.id,
      customer_id: customer.id,
      service_id: appointmentCreated.service_id,
      conversation_id: conversation.id,
      google_event_id: appointmentCreated.google_event_id,
      scheduled_at: appointmentCreated.scheduled_at,
      duration_minutes: appointmentCreated.duration_minutes,
    })
  }

  // Send reply via WhatsApp (use same phone number ID that received the message)
  await sendWhatsAppMessage(customerPhone, reply, replyPhoneNumberId)
}
