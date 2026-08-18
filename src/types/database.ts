export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  hr: {
    Tables: {
      attendance: {
        Row: {
          clock_in_lat: number | null
          clock_in_lng: number | null
          clock_in_photo_url: string | null
          clock_in_time: string | null
          clock_out_lat: number | null
          clock_out_lng: number | null
          clock_out_photo_url: string | null
          clock_out_time: string | null
          created_at: string | null
          date: string
          id: string
          is_flagged: boolean | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_photo_url?: string | null
          clock_in_time?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_photo_url?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          date: string
          id?: string
          is_flagged?: boolean | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          clock_in_lat?: number | null
          clock_in_lng?: number | null
          clock_in_photo_url?: string | null
          clock_in_time?: string | null
          clock_out_lat?: number | null
          clock_out_lng?: number | null
          clock_out_photo_url?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          date?: string
          id?: string
          is_flagged?: boolean | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          id: string
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          type?: string | null
        }
        Relationships: []
      }
      kasbon: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string | null
          id: string
          reason: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kasbon_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kasbon_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          basic_salary: number
          created_at: string | null
          id: string
          incentives: number | null
          kasbon_deduction: number | null
          net_salary: number
          period: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          basic_salary?: number
          created_at?: string | null
          id?: string
          incentives?: number | null
          kasbon_deduction?: number | null
          net_salary?: number
          period: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          basic_salary?: number
          created_at?: string | null
          id?: string
          incentives?: number | null
          kasbon_deduction?: number | null
          net_salary?: number
          period?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          dept: string | null
          emp_id: string
          id: string
          kasbon_limit: number | null
          name: string
          role: string | null
          salary: number | null
          status: string | null
          email: string | null
          phone: string | null
          address: string | null
          jabatan: string | null
          shift: string | null
          must_change_password: boolean | null
        }
        Insert: {
          created_at?: string | null
          dept?: string | null
          emp_id: string
          id?: string
          kasbon_limit?: number | null
          name: string
          role?: string | null
          salary?: number | null
          status?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          jabatan?: string | null
          shift?: string | null
          must_change_password?: boolean | null
        }
        Update: {
          created_at?: string | null
          dept?: string | null
          emp_id?: string
          id?: string
          kasbon_limit?: number | null
          name?: string
          role?: string | null
          salary?: number | null
          status?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          jabatan?: string | null
          shift?: string | null
          must_change_password?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
