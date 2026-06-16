import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'super_admin' | 'employee'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  role: UserRole
  created_at: string
}

export interface Branch {
  id: number
  name: string
}

export interface InventoryGroup {
  id: number
  name: string
}

export interface InventoryCount {
  id: number
  branch_id: number
  inventory_group_id: number
  created_by_id: string | null
  created_by?: string | null
  total_items: number
  matching_items: number
  mismatch_items: number
  new_items: number
  total_increase: number
  total_decrease: number
  accuracy_rate: number
  name: string | null
  created_at: string
  branches?: { name: string }
  inventory_groups?: { name: string }
  profiles?: { full_name: string } | null
}

export interface InventoryItem {
  id?: number
  inventory_id: number
  barcode: string
  name: string
  color: string
  size: string
  system_qty: number
  actual_qty: number
  difference: number
  status: string
  status_type: 'matched' | 'increase' | 'decrease' | 'new'
}

export type InventoryResultItem = {
  barcode: string
  name: string
  color: string
  size: string
  systemQty: number
  actualQty: number
  difference: number
  status: string
  statusClass: string
  statusType: 'matched' | 'increase' | 'decrease' | 'new'
}

export interface CurrentInventoryResults {
  branchId: number
  inventoryGroupId: number
  results: InventoryResultItem[]
}
