export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      participant_metadata: {
        Row: {
          id: string
          participant_id: string
          email: string
          ean_code: string | null
          commodity_rate: number | null
          entry_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          email: string
          ean_code?: string | null
          commodity_rate?: number | null
          entry_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          email?: string
          ean_code?: string | null
          commodity_rate?: number | null
          entry_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          name: string
          address: string
          type: 'producer' | 'consumer'
          peak_power: number
          annual_production: number
          annual_consumption: number
          lat: number
          lng: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          type: 'producer' | 'consumer'
          peak_power?: number
          annual_production?: number
          annual_consumption?: number
          lat: number
          lng: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          type?: 'producer' | 'consumer'
          peak_power?: number
          annual_production?: number
          annual_consumption?: number
          lat?: number
          lng?: number
          created_at?: string
          updated_at?: string
        }
      }
      energy_data: {
        Row: {
          id: string
          user_id: string
          timestamp: string
          consumption: number
          shared_energy: number
          production: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          timestamp: string
          consumption?: number
          shared_energy?: number
          production?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          timestamp?: string
          consumption?: number
          shared_energy?: number
          production?: number | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          member_type: 'consumer' | 'producer'
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          member_type: 'consumer' | 'producer'
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          member_type?: 'consumer' | 'producer'
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}