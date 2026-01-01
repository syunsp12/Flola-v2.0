import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "@/types/ui";

// Note: In a real Next.js app, avoid exposing API keys on the client.
// Ideally, this should be a Server Action or Route Handler.
// For prototype migration, we keep it as is but be aware of the risk.

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY || "missing-api-key";
const ai = new GoogleGenAI({ apiKey });

export const classifyTransaction = async (description: string, categories: Category[]) => {
  if (apiKey === "missing-api-key") {
    console.warn("Gemini API Key is missing. Returning default classification.");
    return { 
      category_id: categories[0]?.id || 1, 
      normalized_merchant: description, 
      is_subscription: false,
      reasoning: "APIキーが設定されていないため、解析をスキップしました。"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // Updated to latest model available in SDK if needed, or stick to preview
      contents: `You are a Japanese financial assistant. Classify this transaction description into the most relevant category.
      Also, provide a "normalized_merchant" name (e.g. "SEVEN-ELEVEN SHIBUURA" becomes "セブン-イレブン").
      Identify if it is a subscription.
      
      Categories: ${categories.map(c => `${c.id}: ${c.name}`).join(', ')}.
      Description: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category_id: { type: Type.INTEGER },
            normalized_merchant: { type: Type.STRING },
            reasoning: { type: Type.STRING, description: "Why this category/subscription was chosen (in Japanese)" },
            is_subscription: { type: Type.BOOLEAN }
          },
          required: ["category_id", "normalized_merchant", "is_subscription", "reasoning"]
        }
      }
    });

    const text = response.text ? response.text : "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    return { 
      category_id: categories[0]?.id || 1, 
      normalized_merchant: description, 
      is_subscription: false,
      reasoning: "AI解析が失敗したため、デフォルト値を適用しました。"
    };
  }
};

export const analyzeSalarySlip = async (base64Image: string) => {
  if (apiKey === "missing-api-key") {
    alert("APIキーが設定されていないため、給与明細の解析ができません。");
    throw new Error("API Key missing");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image,
            },
          },
          {
            text: `Analyze this salary slip image and extract the following details in JSON format.
            - base_pay: Basic salary amount
            - overtime_pay: Overtime payment amount
            - tax: Total taxes (Income tax, Resident tax, etc.)
            - social_insurance: Total social insurance premiums
            - net_pay: Final take-home pay amount
            - date: Payment date in YYYY-MM-DD format
            If an amount is not found, use 0.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            base_pay: { type: Type.NUMBER },
            overtime_pay: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            social_insurance: { type: Type.NUMBER },
            net_pay: { type: Type.NUMBER },
            date: { type: Type.STRING }
          },
          required: ["base_pay", "net_pay", "date"]
        }
      }
    });

    const text = response.text ? response.text : "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Salary Analysis Error:", error);
    throw error;
  }
};