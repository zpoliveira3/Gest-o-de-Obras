
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

export async function analyzeFinancials(projects: Project[]): Promise<string> {
  if (projects.length === 0) return "Nenhum dado de obra encontrado para auditoria.";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const dataSummary = projects.map(p => {
      const totalExpenses = p.expenses.reduce((acc, e) => acc + e.amount, 0);
      const totalRevenue = p.revenues.reduce((acc, r) => acc + r.amount, 0);
      return {
        obra: p.name,
        orcamento_global: p.budget,
        gasto_atual: totalExpenses,
        receita_medida: totalRevenue,
        saldo_orcamentario: p.budget - totalExpenses,
        quebra_por_categoria: p.expenses.reduce((acc: any, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {})
      };
    });

    const prompt = `
      Você é um Engenheiro de Custos e Auditor Especialista em Obras Públicas e Privadas.
      Analise os dados abaixo e forneça um RELATÓRIO DE RISCO PREDITIVO:
      ${JSON.stringify(dataSummary, null, 2)}
      
      Diretrizes do Diagnóstico:
      1. Risco de Estouro: Com base no orçamentado vs gasto, qual obra corre mais risco de ficar sem verba?
      2. Anomalias de Custo: Identifique se categorias como 'Mão de Obra' ou 'Material' estão desbalanceadas.
      3. Projeção de Fluxo: Analise se a empresa está "financiando a obra" (Gastos > Medições).
      4. Recomendação Estratégica: O que o dono da empreiteira deve fazer AGORA para salvar as margens.
      
      Formate em Markdown elegante com títulos e emojis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Pro para análise profunda
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text || "Erro na geração do relatório.";
  } catch (error) {
    return "Falha na auditoria inteligente: Verifique sua conexão.";
  }
}

export async function analyzeProjectDocument(base64Data: string, mimeType: string): Promise<Partial<Project> | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: "Extraia Nome da Obra, Cliente, Valor Total (budget) e Data de Início em JSON puro." }
        ]
      },
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}
