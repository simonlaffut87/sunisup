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
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          member_type: 'admin' | 'member' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          member_type?: 'admin' | 'member' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          member_type?: 'admin' | 'member' | null
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
          email: string | null
          ean_code: string | null
          commodity_rate: number | null
          entry_date: string | null
          company_number: string | null
          peak_power: number | null
          annual_production: number | null
          annual_consumption: number | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
          shared_energy_price: number | null
          groupe: string | null
        }
        Insert: {
          id?: string
          name: string
          address: string
          type: 'producer' | 'consumer'
          email?: string | null
          ean_code?: string | null
          commodity_rate?: number | null
          entry_date?: string | null
          company_number?: string | null
          peak_power?: number | null
          annual_production?: number | null
          annual_consumption?: number | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
          shared_energy_price?: number | null
          groupe?: string | null
        }
        Update: {
          id?: string
          name?: string
          address?: string
          type?: 'producer' | 'consumer'
          email?: string | null
          ean_code?: string | null
          commodity_rate?: number | null
          entry_date?: string | null
          company_number?: string | null
          peak_power?: number | null
          annual_production?: number | null
          annual_consumption?: number | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
          shared_energy_price?: number | null
          groupe?: string | null
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
    }
  }
}