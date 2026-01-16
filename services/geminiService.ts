
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

// Removed global initialization to ensure the function always uses the most up-to-date environment config
export async function analyzeFinancials(projects: Project[]): Promise<string> {
  // Always use the recommended initialization with named parameter and create a new instance before call
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
    Como um consultor financeiro especializado em construção civil e obras públicas no Brasil, analise os seguintes dados da minha empreiteira:
    ${JSON.stringify(dataSummary, null, 2)}

    Por favor, forneça:
    1. Uma análise rápida da saúde financeira geral considerando o Valor da Obra vs Gastos.
    2. Identificação de gargalos (onde estou gastando demais?).
    3. Sugestões práticas para aumentar a margem de lucro.
    4. Alertas sobre projetos que podem estar saindo do valor contratado.
    Responda de forma profissional e direta em Português do Brasil, formatado em Markdown.
  `;

  try {
    // Using gemini-3-pro-preview for complex reasoning and financial analysis tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    
    // Correctly accessing the .text property from GenerateContentResponse
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    return "Erro ao conectar com a inteligência artificial para análise financeira. Verifique sua conexão e tente novamente.";
  }
}
