import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


export interface Profile {
  id: string
  username?: string
  full_name?: string
  phone_number?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  icon?: string
  color: string
  user_id: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  name: string
  amount: number
  period: "weekly" | "monthly" | "yearly"
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
  category?: Category
}

export interface Expense {
  id: string
  user_id: string
  category_id?: string
  budget_id?: string
  amount: number
  description?: string
  notes?: string
  expense_date: string
  created_at: string
  updated_at: string
  category?: Category
  budget?: Budget
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: "budget_alert" | "reminder" | "info"
  is_read: boolean
  created_at: string
}
