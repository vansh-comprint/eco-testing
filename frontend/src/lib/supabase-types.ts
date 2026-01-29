/**
 * Supabase Database Types
 *
 * This file will be auto-generated once you set up Supabase.
 * For now, it contains placeholder types.
 *
 * To generate this file from your Supabase project:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase-types.ts
 */

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
      enterprises: {
        Row: {
          id: string
          name: string
          legal_name: string | null
          gst_number: string | null
          pan_number: string | null
          address: Json | null
          industry: string | null
          employee_count: number | null
          contact_person: string | null
          contact_email: string | null
          contact_phone: string | null
          status: 'active' | 'inactive' | 'suspended'
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          legal_name?: string | null
          gst_number?: string | null
          pan_number?: string | null
          address?: Json | null
          industry?: string | null
          employee_count?: number | null
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          legal_name?: string | null
          gst_number?: string | null
          pan_number?: string | null
          address?: Json | null
          industry?: string | null
          employee_count?: number | null
          contact_person?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          created_at?: string
          updated_at?: string | null
        }
      }
      assets: {
        Row: {
          id: string
          enterprise_id: string
          batch_id: string | null
          branch_id: string | null
          it_admin_id: string | null
          serial_number: string
          brand: string
          model: string
          asset_tag: string | null
          device_type: string | null
          specs: Json | null
          purchase_date: string | null
          assigned_sub_user_id: string | null
          assigned_user_id: string | null
          is_self_assigned: boolean | null
          assigned_at: string | null
          status: string
          grade: string | null
          base_price: number | null
          final_price: number | null
          treatment_outcome: string | null
          treatment_date: string | null
          recycler_partner_id: string | null
          weight_kg: number | null
          epr_certificate_id: string | null
          qc_report: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          enterprise_id: string
          batch_id?: string | null
          branch_id?: string | null
          it_admin_id?: string | null
          serial_number: string
          brand: string
          model: string
          asset_tag?: string | null
          device_type?: string | null
          specs?: Json | null
          purchase_date?: string | null
          assigned_sub_user_id?: string | null
          assigned_user_id?: string | null
          is_self_assigned?: boolean | null
          assigned_at?: string | null
          status?: string
          grade?: string | null
          base_price?: number | null
          final_price?: number | null
          treatment_outcome?: string | null
          treatment_date?: string | null
          recycler_partner_id?: string | null
          weight_kg?: number | null
          epr_certificate_id?: string | null
          qc_report?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          enterprise_id?: string
          batch_id?: string | null
          branch_id?: string | null
          it_admin_id?: string | null
          serial_number?: string
          brand?: string
          model?: string
          asset_tag?: string | null
          device_type?: string | null
          specs?: Json | null
          purchase_date?: string | null
          assigned_sub_user_id?: string | null
          assigned_user_id?: string | null
          is_self_assigned?: boolean | null
          assigned_at?: string | null
          status?: string
          grade?: string | null
          base_price?: number | null
          final_price?: number | null
          treatment_outcome?: string | null
          treatment_date?: string | null
          recycler_partner_id?: string | null
          weight_kg?: number | null
          epr_certificate_id?: string | null
          qc_report?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      // Add other tables as needed
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'super_admin' | 'main_admin' | 'it_admin' | 'org_admin' | 'sub_user' | 'logistics_admin' | 'logistics_user'
      asset_status: 'pending_assignment' | 'assigned' | 'check_in_started' | 'submitted' | 'remote_review' | 'conditionally_accepted' | 'remote_rejected' | 'disputed' | 'ready_for_pickup' | 'pickup_requested' | 'pickup_scheduled' | 'pickup_failed_qc' | 'picked_up' | 'in_transit' | 'facility_qc' | 'final_accepted' | 'final_rejected' | 'payout_pending' | 'completed'
      asset_grade: 'A' | 'B' | 'C' | 'D'
      [key: string]: any
    }
  }
}
