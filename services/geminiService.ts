
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

/**
 * Analisa a saúde financeira geral dos projetos
 */
export async function analyzeFinancials(projects: Project[]): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const dataSummary = projects.map(p => ({
      nome: p.name,
      valor_obra: p.budget,
      totalGasto: p.expenses.reduce((acc, e) => acc + e.amount, 0),
      totalRecebido: p.revenues.reduce((acc, r) => acc + r.amount, 0),
      categorias: p.expenses.reduce((acc: any, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {})
    }));

    const prompt = `
      Como um consultor financeiro especializado em construção civil no Brasil, analise os dados desta empreiteira:
      ${JSON.stringify(dataSummary, null, 2)}
      Forneça uma análise rápida em Markdown sobre lucros, gastos excessivos e sugestões de melhoria.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    return response.text || "Análise indisponível no momento.";
  } catch (error) {
    console.error("Erro Gemini Financials:", error);
    return "Erro ao conectar com a IA para auditoria.";
  }
}

/**
 * Extrai dados financeiros de PDFs ou Imagens de medições/contratos
 */
export async function analyzeProjectDocument(base64Data: string, mimeType: string): Promise<Partial<Project> | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Analise este documento de engenharia/construção. Extraia:
            1. Nome da Obra
            2. Cliente
            3. Valor Total do Contrato (Budget)
            4. Data de Início (YYYY-MM-DD)
            5. Lista de Gastos e Medições presentes no documento.
            
            Retorne APENAS um JSON:
            {
              "name": string,
              "client": string,
              "budget": number,
              "startDate": "YYYY-MM-DD",
              "revenues": [{"description": string, "amount": number, "date": "YYYY-MM-DD"}],
              "plannedRevenues": [{"description": string, "amount": number, "date": "YYYY-MM-DD"}],
              "expenses": [{"description": string, "amount": number, "date": "YYYY-MM-DD", "category": "Material" | "Mão de Obra" | "Impostos" | "Outros"}]
            }`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.replace(/```json|```/gi, "").trim());
  } catch (error) {
    console.error("Erro crítico no upload/processamento:", error);
    return null;
  }
}
