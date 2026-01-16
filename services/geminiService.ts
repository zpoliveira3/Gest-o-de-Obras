
import { GoogleGenAI, Type } from "@google/genai";
import { Project, ExpenseCategory } from "../types";

const apiKey = (process.env as any).API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function analyzeFinancials(projects: Project[]): Promise<string> {
  if (!ai) {
    return "Atenção: A variável API_KEY não foi encontrada. A análise inteligente está desativada.";
  }

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
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    return "Erro ao conectar com a inteligência artificial.";
  }
}

export async function analyzeInvoice(base64Data: string, mimeType: string): Promise<{
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
} | null> {
  if (!ai) return null;

  // Remover o prefixo data:image/...;base64, se existir
  const cleanBase64 = base64Data.split(',')[1] || base64Data;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: "Extraia as informações desta Nota Fiscal ou recibo de obra. Retorne apenas um objeto JSON com: 'description' (resumo do que foi comprado), 'amount' (valor total numérico), 'date' (data no formato YYYY-MM-DD) e 'category' (escolha a mais adequada entre: 'Material', 'Mão de Obra', 'Equipamentos', 'Serviços Terceiros', 'Outros')."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["description", "amount", "date", "category"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Erro ao analisar nota fiscal:", error);
    return null;
  }
}
