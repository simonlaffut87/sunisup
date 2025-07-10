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
          peak_power: number | null
          annual_production: number | null
          annual_consumption: number | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
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
          peak_power?: number | null
          annual_production?: number | null
          annual_consumption?: number | null
          lat?: number | null
          lng?: number | null
          created_at?: string
          updated_at?: string
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
          peak_power?: number | null
          annual_production?: number | null
          annual_consumption?: number | null
          lat?: number | null
          lng?: number | null
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
    }
  }
}