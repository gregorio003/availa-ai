export type UserRole = 'super_admin' | 'client'

export type Niche = 'lavajato' | 'sobrancelha' | 'salao' | 'unhas'

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export type ConversationStatus = 'active' | 'completed' | 'abandoned'

export type MessageRole = 'customer' | 'assistant' | 'owner'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
}

export interface Business {
  id: string
  owner_user_id: string | null
  name: string
  phone: string | null
  niche: Niche
  address: string | null
  google_calendar_id: string | null
  google_refresh_token: string | null
  working_hours: WorkingHours
  slot_duration_minutes: number
  // Regras de capacidade
  employee_count: number
  max_appointments_per_hour: number
  // Adiantamento / sinal
  requires_advance: boolean
  advance_amount: number | null
  // Assinatura
  plan: string
  commission_pct: number
  subscription_status: string
  subscription_valid_until: string | null
  // WhatsApp (Z-API / Evolution por estabelecimento)
  zapi_instance_id: string | null
  zapi_token: string | null
  whatsapp_connected: boolean
  active: boolean
  created_at: string
}

export interface BotMessages {
  id: string
  business_id: string
  greeting: string
  service_prompt: string
  date_prompt: string
  time_prompt: string
  confirmation: string
  advance_message: string
  created_at: string
  updated_at: string
}

export interface WorkingHours {
  mon: DayHours | null
  tue: DayHours | null
  wed: DayHours | null
  thu: DayHours | null
  fri: DayHours | null
  sat: DayHours | null
  sun: DayHours | null
}

export interface DayHours {
  start: string  // "08:00"
  end: string    // "18:00"
}

export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  active: boolean
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string | null
  phone: string
  created_at: string
}

export interface Conversation {
  id: string
  business_id: string
  customer_id: string
  status: ConversationStatus
  context: ConversationContext
  created_at: string
  updated_at: string
  customers?: Customer
  messages?: Message[]
}

export interface ConversationContext {
  stage?: 'greeting' | 'service_selection' | 'date_selection' | 'time_selection' | 'confirmation' | 'done'
  selected_service_id?: string
  selected_date?: string
  selected_time?: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  whatsapp_message_id: string | null
  created_at: string
}

export interface Appointment {
  id: string
  business_id: string
  customer_id: string
  service_id: string | null
  conversation_id: string | null
  google_event_id: string | null
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  created_at: string
  customers?: Customer
  services?: Service
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
}

export interface WhatsAppWebhookBody {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: { phone_number_id: string; display_phone_number: string }
        contacts?: Array<{ profile: { name: string }; wa_id: string }>
        messages?: WhatsAppMessage[]
      }
      field: string
    }>
  }>
}
