
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

/**
 * Analisa a saúde financeira geral da empreiteira com foco em obras públicas
 */
export async function analyzeFinancials(projects: Project[]): Promise<string> {
  // Inicialização interna para evitar erros de referência global ao process.env
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = projects.map(p => ({
    nome: p.name,
    valor_contrato: p.budget,
    total_gasto: p.expenses.reduce((acc, e) => acc + e.amount, 0),
    total_recebido: p.revenues.reduce((acc, r) => acc + r.amount, 0),
    distribuicao_custos: p.expenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  }));

  const prompt = `
    Você é um Consultor Financeiro Sênior e Auditor de Obras Públicas. 
    Analise os dados financeiros da minha empreiteira:
    ${JSON.stringify(dataSummary, null, 2)}
    
    Seu objetivo é fornecer um relatório estratégico em Português (Brasil) usando Markdown:
    1. Identifique quais obras estão com margem de lucro perigosa.
    2. Analise se os gastos com 'Mão de Obra' estão proporcionais aos 'Materiais'.
    3. Dê 3 conselhos práticos para melhorar o fluxo de caixa baseado nos recebimentos vs gastos.
    
    Seja direto, profissional e use um tom de autoridade técnica.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro na Auditoria IA:", error);
    return "O Auditor Virtual está temporariamente indisponível. Verifique sua conexão.";
  }
}

/**
 * Extrai dados financeiros de PDFs ou Imagens de medições e contratos
 */
export async function analyzeProjectDocument(base64Data: string, mimeType: string): Promise<Partial<Project> | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limpa o prefixo data:application/pdf;base64, se existir
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Modelo Pro para leitura de documentos complexos
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Você é um Engenheiro Orçamentista. Extraia os dados deste documento (Contrato ou Medição) para o formato JSON.
            
            Mapeie os gastos encontrados para estas categorias: 'Material', 'Mão de Obra', 'Logística', 'Equipamentos', 'Impostos', 'Serviços Terceiros', 'Comissão', 'Outros'.
            
            Retorne APENAS o JSON puro, sem markdown:
            {
              "name": "Nome da Obra",
              "client": "Nome do Órgão ou Cliente",
              "budget": 0.0,
              "startDate": "YYYY-MM-DD",
              "expenses": [{"description": "item", "amount": 0.0, "date": "YYYY-MM-DD", "category": "Material"}],
              "revenues": [{"description": "item", "amount": 0.0, "date": "YYYY-MM-DD"}]
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
    
    // Garantir que pegamos apenas o conteúdo JSON
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erro no processamento do documento pelo Gemini:", error);
    return null;
  }
}
