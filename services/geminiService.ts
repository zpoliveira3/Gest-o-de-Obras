
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

export async function analyzeFinancials(projects: Project[]): Promise<string> {
  // Acessa a chave através de uma conversão de tipo para evitar erro no build do TypeScript
  const apiKey = (process.env as any).API_KEY;
  
  if (!apiKey) {
    return "Atenção: A variável API_KEY não foi encontrada nas configurações da Vercel. A análise inteligente está desativada.";
  }

  const ai = new GoogleGenAI({ apiKey });

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
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    return "Erro ao conectar com a inteligência artificial. Verifique se a API_KEY está correta e se o projeto possui faturamento ativo no Google Cloud.";
  }
}
