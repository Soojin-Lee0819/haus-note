// src/services/authService.ts
import { supabase } from '../lib/supabase'

export const authService = {
  // Sign up with email and password
  async signUp(email: string, password: string, name?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0]
        }
      }
    })

    if (error) throw error
    return data
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Sign in with Google
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) throw error
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Update user profile
  async updateProfile(updates: { name?: string; phone?: string; avatar_url?: string }) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user profile
  async getProfile(userId?: string) {
    const id = userId || (await this.getCurrentUser())?.id
    if (!id) throw new Error('No user ID provided')

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Update email (sends confirmation to new address)
  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/dashboard` }
    )
    if (error) throw error
    return data
  },

  // Delete current user's account via server-side RPC
  async deleteAccount() {
    const { error } = await supabase.rpc('delete_user')
    if (error) throw error
  }
}