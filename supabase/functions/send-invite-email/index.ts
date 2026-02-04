import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteEmailRequest {
  to: string
  inviterName: string
  projectName: string
  inviteUrl: string
  role: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, inviterName, projectName, inviteUrl, role }: InviteEmailRequest = await req.json()

    if (!to || !inviterName || !projectName || !inviteUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <span style="font-size:20px;font-weight:700;color:#111827;">haus note</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;color:#111827;line-height:1.3;">
                You've been invited to collaborate
              </h1>
              <p style="margin:0 0 24px 0;font-size:15px;color:#4b5563;line-height:1.6;">
                <strong>${inviterName}</strong> invited you to join <strong>"${projectName}"</strong> as ${role === 'editor' ? 'an' : 'a'} <strong>${role}</strong> on haus note — a collaborative apartment hunting app where you can track listings, share notes, and find your next home together.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="background-color:#2563eb;border-radius:8px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Accept Invite
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by haus note
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'haus note <onboarding@resend.dev>',
        to: [to],
        subject: `${inviterName} invited you to "${projectName}" on haus note`,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to send email' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
