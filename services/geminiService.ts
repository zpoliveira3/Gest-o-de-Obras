
import { GoogleGenAI, Type } from "@google/genai";
import { Project } from "../types";

/**
 * Analisa a saúde financeira geral da empreiteira
 */
export async function analyzeFinancials(projects: Project[]): Promise<string> {
  // Inicialização dentro da função para garantir que o process.env esteja disponível
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = projects.map(p => ({
    nome: p.name,
    contrato: p.budget,
    totalGasto: p.expenses.reduce((acc, e) => acc + e.amount, 0),
    totalRecebido: p.revenues.reduce((acc, r) => acc + r.amount, 0),
    categorias: p.expenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  }));

  const prompt = `
    Você é um CFO especializado em Engenharia Civil e Obras Públicas no Brasil. 
    Analise os seguintes dados da minha empreiteira e forneça um relatório executivo:
    ${JSON.stringify(dataSummary, null, 2)}
    
    Foque em:
    1. Lucratividade por obra.
    2. Alerta sobre custos de Mão de Obra vs Materiais.
    3. Sugestões de economia e otimização de fluxo de caixa.
    
    Retorne em Português (Brasil) formatado em Markdown profissional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Relatório não gerado.";
  } catch (error) {
    console.error("Erro na Auditoria IA:", error);
    return "Falha ao conectar com o Auditor Virtual.";
  }
}

/**
 * Extrai dados de Medições e Contratos (PDF/Imagem)
 */
export async function analyzeProjectDocument(base64Data: string, mimeType: string): Promise<Partial<Project> | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Modelo Pro para leitura complexa de documentos
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Aja como um engenheiro de orçamentos. Extraia os dados deste documento de medição ou contrato para JSON.
            Campos: Nome da Obra, Cliente, Valor Total, Data Início (YYYY-MM-DD), e uma lista de Despesas encontradas.
            
            Retorne RIGOROSAMENTE neste formato JSON:
            {
              "name": "nome da obra",
              "client": "órgão ou empresa",
              "budget": 0000.00,
              "startDate": "YYYY-MM-DD",
              "expenses": [{"description": "item", "amount": 0, "date": "YYYY-MM-DD", "category": "Material"}]
            }
            Categorias permitidas: Material, Mão de Obra, Impostos, Logística, Outros.`
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
    console.error("Erro no processamento do documento:", error);
    return null;
  }
}
