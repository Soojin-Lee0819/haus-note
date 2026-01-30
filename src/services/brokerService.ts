// src/services/brokerService.ts
import { supabase } from '../lib/supabase'
import { Broker } from '../types/database'

export const brokerService = {
  // Get all brokers for a project
  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .eq('project_id', projectId)
      .order('name', { ascending: true })

    if (error) throw error
    return data as Broker[]
  },

  // Get single broker
  async getById(brokerId: string) {
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .eq('id', brokerId)
      .single()

    if (error) throw error
    return data as Broker
  },

  // Create new broker
  async create(broker: {
    project_id: string
    name: string
    email?: string
    phone?: string
    company?: string
  }) {
    const { data, error } = await supabase
      .from('brokers')
      .insert(broker)
      .select()
      .single()

    if (error) throw error
    return data as Broker
  },

  // Update broker
  async update(brokerId: string, updates: Partial<Broker>) {
    const { data, error } = await supabase
      .from('brokers')
      .update(updates)
      .eq('id', brokerId)
      .select()
      .single()

    if (error) throw error
    return data as Broker
  },

  // Delete broker
  async delete(brokerId: string) {
    const { error } = await supabase
      .from('brokers')
      .delete()
      .eq('id', brokerId)

    if (error) throw error
  },

  // Search brokers by name or company
  async search(projectId: string, query: string) {
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .eq('project_id', projectId)
      .or(`name.ilike.%${query}%,company.ilike.%${query}%`)
      .order('name', { ascending: true })

    if (error) throw error
    return data as Broker[]
  }
}
