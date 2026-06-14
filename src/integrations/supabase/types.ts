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
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}