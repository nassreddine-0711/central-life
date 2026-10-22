export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_data: {
        Row: {
          id: string
          user_id: string
          module: string
          data: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          module: string
          data: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          module?: string
          data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_data_history: {
        Row: {
          id: number
          user_id: string
          module: string
          data: Json
          archived_at: string
        }
        Insert: {
          id?: number
          user_id: string
          module: string
          data?: Json
          archived_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          module?: string
          data?: Json
          archived_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}