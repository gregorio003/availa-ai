import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code) {
    return NextResponse.redirect(`${appUrl}/configuracoes?error=no_code`)
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const { tokens } = await auth.getToken(code)
  auth.setCredentials(tokens)

  // Get the primary calendar ID
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarList = await calendar.calendarList.get({ calendarId: 'primary' })
  const calendarId = calendarList.data.id ?? 'primary'

  // Save refresh token to the business (using first business for now)
  const supabase = createServiceClient()
  await supabase
    .from('businesses')
    .update({
      google_refresh_token: tokens.refresh_token,
      google_calendar_id: calendarId,
    })
    .eq('id', '11111111-1111-1111-1111-111111111111')

  return NextResponse.redirect(`${appUrl}/configuracoes?calendar=connected`)
}
