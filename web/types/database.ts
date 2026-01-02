export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Account {
  id: string
  name: string
  type: 'bank' | 'credit_card' | 'securities' | 'pension' | 'wallet' | 'point' | 'liability_other'
  is_liability: boolean
  include_in_net_worth: boolean
  icon_url: string | null
  card_brand: string | null
  created_at: string
}

export interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
  keywords: string[] | null
  created_at: string
}

export interface Transaction {
  id: string
  date: string
  amount: number
  description: string | null
  type: 'income' | 'expense' | 'transfer'
  from_account_id: string | null
  to_account_id: string | null
  category_id: number | null
  status: 'pending' | 'confirmed' | 'ignore'
  is_subscription: boolean
  source: string | null
  raw_data: Json | null
  created_at: string
}