
import { GoogleGenAI, Type } from "@google/genai";
import { Project } from "../types";

// Inicialização segura com a chave de ambiente
const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });

/**
 * Analisa a saúde financeira geral dos projetos
 */
export async function analyzeFinancials(projects: Project[]): Promise<string> {
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
    Como um consultor financeiro especializado em construção civil e obras públicas no Brasil, analise os seguintes dados da minha empreiteira:
    ${JSON.stringify(dataSummary, null, 2)}

    Por favor, forneça uma análise profissional e direta em Português do Brasil, formatada em Markdown, focando em lucratividade e controle de custos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    return "Erro ao conectar com a inteligência artificial para auditoria.";
  }
}

/**
 * Extrai dados financeiros de PDFs ou Imagens de medições/contratos
 */
export async function analyzeProjectDocument(base64Data: string, mimeType: string): Promise<Partial<Project> | null> {
  // Limpa o prefixo data:mime/type;base64, se existir
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Modelo Pro para extração de dados complexos em tabelas
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Você é um especialista em auditoria de obras. Analise este documento e extraia os dados financeiros para um sistema ERP.
            
            Campos obrigatórios:
            - Nome da Obra
            - Cliente (Órgão Público ou Empresa)
            - Valor Total do Contrato (Budget)
            - Data de Início (YYYY-MM-DD)
            - Lista de Gastos/Despesas (mapeie para: 'Material', 'Mão de Obra', 'Logística', 'Equipamentos', 'Impostos', 'Serviços Terceiros', 'Comissão', 'Outros')
            - Lista de Receitas/Medições (pagas ou previstas)
            
            Retorne APENAS o JSON puro seguindo exatamente esta estrutura:
            {
              "name": string,
              "client": string,
              "budget": number,
              "startDate": "YYYY-MM-DD",
              "revenues": [{"description": string, "amount": number, "date": "YYYY-MM-DD"}],
              "plannedRevenues": [{"description": string, "amount": number, "date": "YYYY-MM-DD"}],
              "expenses": [{"description": string, "amount": number, "date": "YYYY-MM-DD", "category": string}]
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

    // Remove possíveis blocos de código Markdown que o modelo possa ter inserido
    const jsonString = text.replace(/```json|```/gi, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erro crítico ao analisar documento:", error);
    return null;
  }
}
