'use server'

import { supabase } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

// --- 1. 未承認データの取得 ---
export async function getPendingTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      accounts!from_account_id(name),
      categories(name)
    `)
    .eq('status', 'pending')
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

// --- 2. データの承認・更新 ---
export async function updateTransaction(id: string, updates: any) {
  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  
  // 画面を更新
  revalidatePath('/')
  return { success: true }
}

// --- 3. AIによるカテゴリ推論 ---
export async function predictCategories(descriptions: string[]) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return {}

  // カテゴリマスタを取得
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, keywords')
  
  if (!categories) return {}

  // プロンプト作成
  const catText = categories.map(c => 
    `ID:${c.id}, Name:${c.name}, Keywords:${c.keywords?.join(',')}`
  ).join('\n')

  const prompt = `
    あなたは家計簿のAIアシスタントです。
    以下の「カテゴリリスト」に基づき、「対象の摘要」に適切な「カテゴリID」を推測してください。
    
    # カテゴリリスト
    ${catText}
    
    # 対象の摘要
    ${JSON.stringify(descriptions)}
    
    # 制約
    出力は以下のJSONフォーマットのみ。Markdown不要。確信がなければID: null。
    {"SUKIYA": 2, "AMAZON": 5}
  `

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" })
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch (e) {
    console.error("AI Error:", e)
    return {}
  }
}

// --- 4. カテゴリ一覧の取得 (UI表示用) ---
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('id')
  
  if (error) return []
  return data
}