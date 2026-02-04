import { supabase } from '../lib/supabase'

export const emailService = {
  async sendInviteEmail(data: {
    to: string
    inviterName: string
    projectName: string
    inviteUrl: string
    role: string
  }) {
    const { data: result, error } = await supabase.functions.invoke('send-invite-email', {
      body: data,
    })

    if (error) throw error
    return result
  },
}
