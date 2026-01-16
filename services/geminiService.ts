
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

/**
 * Analisa a saúde financeira geral da empreiteira com foco em rentabilidade e custos de obra
 */
export async function analyzeFinancials(projects: Project[]): Promise<string> {
  if (projects.length === 0) {
    return "Nenhum dado de obra encontrado. Cadastre um projeto e realize lançamentos para iniciar a auditoria.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Preparação de dados rica para a IA
    const dataSummary = projects.map(p => {
      const totalExpenses = p.expenses.reduce((acc, e) => acc + e.amount, 0);
      const totalRevenue = p.revenues.reduce((acc, r) => acc + r.amount, 0);
      const profit = p.budget - totalExpenses;
      
      return {
        nome_da_obra: p.name,
        contratante: p.client,
        valor_global: p.budget,
        total_despesas_pagas: totalExpenses,
        total_medicoes_recebidas: totalRevenue,
        lucro_estimado_atual: profit,
        percentual_custo: ((totalExpenses / p.budget) * 100).toFixed(2) + "%",
        categorias_de_gasto: p.expenses.reduce((acc: any, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {})
      };
    });

    const prompt = `
      Aja como um CFO (Diretor Financeiro) e Auditor de Engenharia Civil. 
      Analise os dados financeiros das obras da minha empreiteira listados abaixo:
      
      ${JSON.stringify(dataSummary, null, 2)}
      
      Sua missão é entregar um diagnóstico crítico e estratégico em Português (Brasil):
      1. Saúde do Lucro: Avalie o "Lucro Estimado" de cada obra. Alguma obra está consumindo o orçamento rápido demais?
      2. Alerta de Insumos: Compare gastos de 'Material' vs 'Mão de Obra'. A proporção está saudável (geralmente 40/60 ou 50/50)?
      3. Fluxo de Caixa: Analise o gap entre "Total Medido" e "Total Gasto". Estamos financiando a obra para o cliente?
      4. Recomendação: Dê 3 passos acionáveis para aumentar a margem de lucro no próximo mês.
      
      Use Markdown para formatar (negrito, listas, títulos). Seja direto e técnico.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7, // Equilíbrio entre precisão e criatividade analítica
        topP: 0.95,
      }
    });

    return response.text || "Ocorreu um erro ao processar a análise da IA.";
  } catch (error) {
    console.error("Erro crítico na Auditoria Gemini:", error);
    return "Falha técnica: Não foi possível conectar ao motor de inteligência artificial. Verifique se sua conexão está ativa.";
  }
}

/**
 * Extrai dados financeiros de PDFs ou Imagens usando Gemini 3 Pro
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
            text: `Você é um Analista de Contratos de Engenharia. Extraia os dados deste documento para JSON.
            Campos obrigatórios: 'name' (Obra), 'client' (Contratante), 'budget' (Valor Total), 'startDate' (YYYY-MM-DD).
            Identifique também se houver tabelas de itens de medição e extraia para o array 'expenses' com 'description', 'amount' e a 'category' mais adequada.
            
            Retorne APENAS o JSON puro.`
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
    console.error("Erro no processamento Pro:", error);
    return null;
  }
}
