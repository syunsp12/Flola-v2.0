import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import pdf from 'pdf-parse'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 400 })
    }

    // 1. PDFからテキスト抽出
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const pdfData = await pdf(buffer)
    const text = pdfData.text

    // 2. Geminiで構造化データに変換
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error("API Key missing")

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })

    const prompt = `
      以下の給与明細テキストから、主要な金額情報を抽出してJSONで返してください。
      
      # 抽出項目
      - date: 支給年月 (YYYY-MM-DD形式。通常は支給日)
      - base_pay: 基本給
      - overtime_pay: 残業手当 (時間外手当など)
      - tax: 所得税 + 住民税 の合計
      - social_insurance: 健康保険 + 厚生年金 + 雇用保険 の合計
      - total_payment: 差引支給額 (振込額)
      - stock_deduction: 持株会拠出金 (あれば)
      
      # テキスト
      ${text.slice(0, 3000)} // 長すぎるとエラーになるので制限

      # 出力形式 (JSONのみ)
      { "date": "2024-01-25", "base_pay": 300000, ... }
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().replace(/```json|```/g, '').trim()
    const data = JSON.parse(responseText)

    return NextResponse.json(data)

  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}