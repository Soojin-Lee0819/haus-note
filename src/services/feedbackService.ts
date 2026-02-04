import { supabase } from '../lib/supabase'
import { Feedback, FeedbackComment } from '../types/database'

const FEEDBACK_BUCKET = 'feedback-images'

function addImageUrl(feedback: Feedback): Feedback {
  if (!feedback.image_path) return feedback
  const { data } = supabase.storage.from(FEEDBACK_BUCKET).getPublicUrl(feedback.image_path)
  return { ...feedback, image_url: data.publicUrl }
}

export const feedbackService = {
  async getAll(sort: 'votes' | 'newest' = 'votes', category?: string) {
    let query = supabase
      .from('feedback')
      .select('*, feedback_comments(count)')

    if (category) {
      query = query.eq('category', category)
    }

    if (sort === 'votes') {
      query = query.order('vote_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []).map((row: any) => {
      const count = row.feedback_comments?.[0]?.count ?? 0
      const { feedback_comments, ...rest } = row
      return addImageUrl({ ...rest, comment_count: count } as Feedback)
    })
  },

  async create(data: {
    title: string
    description?: string
    category: string
    anonymous: boolean
    image?: File
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let displayName: string | null = null

    if (!data.anonymous) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      displayName = profile?.name || user.email?.split('@')[0] || null
    }

    // Upload image if provided
    let imagePath: string | null = null
    if (data.image) {
      const fileExt = data.image.name.split('.').pop()
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from(FEEDBACK_BUCKET)
        .upload(fileName, data.image, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError
      imagePath = fileName
    }

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        display_name: displayName,
        title: data.title,
        description: data.description || null,
        category: data.category,
        image_path: imagePath,
      })
      .select()
      .single()

    if (error) throw error
    return addImageUrl(feedback as Feedback)
  },

  async update(feedbackId: string, data: {
    title?: string
    description?: string
    category?: string
  }) {
    const { data: feedback, error } = await supabase
      .from('feedback')
      .update(data)
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) throw error
    return addImageUrl(feedback as Feedback)
  },

  async delete(feedbackId: string) {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', feedbackId)

    if (error) throw error
  },

  async toggleVote(feedbackId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Check if vote exists
    const { data: existing } = await supabase
      .from('feedback_votes')
      .select('feedback_id')
      .eq('feedback_id', feedbackId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // Remove vote and decrement count
      const { error: deleteError } = await supabase
        .from('feedback_votes')
        .delete()
        .eq('feedback_id', feedbackId)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      // Update vote_count by re-counting
      const { count } = await supabase
        .from('feedback_votes')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_id', feedbackId)

      await supabase
        .from('feedback')
        .update({ vote_count: count || 0 })
        .eq('id', feedbackId)

      return false // vote removed
    } else {
      // Add vote and increment count
      const { error: insertError } = await supabase
        .from('feedback_votes')
        .insert({ feedback_id: feedbackId, user_id: user.id })

      if (insertError) throw insertError

      // Update vote_count by re-counting
      const { count } = await supabase
        .from('feedback_votes')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_id', feedbackId)

      await supabase
        .from('feedback')
        .update({ vote_count: count || 0 })
        .eq('id', feedbackId)

      return true // vote added
    }
  },

  async getUserVotes(): Promise<Set<string>> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Set()

    const { data, error } = await supabase
      .from('feedback_votes')
      .select('feedback_id')
      .eq('user_id', user.id)

    if (error) throw error
    return new Set((data || []).map(v => v.feedback_id))
  },

  async getComments(feedbackId: string): Promise<FeedbackComment[]> {
    const { data, error } = await supabase
      .from('feedback_comments')
      .select('*, user_profile:user_profiles(id, name, avatar_url)')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []) as FeedbackComment[]
  },

  async addComment(feedbackId: string, comment: string): Promise<FeedbackComment> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('feedback_comments')
      .insert({ feedback_id: feedbackId, user_id: user.id, comment })
      .select('*, user_profile:user_profiles(id, name, avatar_url)')
      .single()

    if (error) throw error
    return data as FeedbackComment
  },

  async updateComment(commentId: string, comment: string): Promise<FeedbackComment> {
    const { data, error } = await supabase
      .from('feedback_comments')
      .update({ comment, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, user_profile:user_profiles(id, name, avatar_url)')
      .single()

    if (error) throw error
    return data as FeedbackComment
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('feedback_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  },
}
