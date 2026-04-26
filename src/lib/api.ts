import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.MINIMAX_API_KEY,
      baseURL: "https://api.minimaxi.com/v1",
    });
  }
  return client;
}

const COACH_PROMPT = `你是一个严格但友善的社交教练。你的职责是帮助用户提升社交技能，特别是约会和职场社交。

你的风格：
- 诚实、直接、但有建设性
- 不会只顺着用户说"你很棒"
- 给出具体的改进建议
- 当用户表达不确定时，引导他们分析问题

规则：
1. 永远不要只说好话——要给出真实的、有用的反馈
2. 当用户问"我该怎么说"时，给出具体的话术建议
3. 当用户分享尴尬经历时，先认可他们的勇气，然后给出下次可以做得不同的地方
4. 保持温暖但专业——你是教练，不是啦啦队

用户现在要和你说话。请用中文回复。`;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function coachResponse(messages: Message[]): Promise<string> {
  const systemMsg = { role: "system" as const, content: COACH_PROMPT };
  
  const conversation = [systemMsg, ...messages.map(m => ({
    role: m.role,
    content: m.content
  }))];

  const response = await getClient().chat.completions.create({
    model: "MiniMax-M2.7",
    messages: conversation,
    max_tokens: 1000,
  });

  return response.choices?.[0]?.message?.content || "抱歉，我没能理解你的意思，请再说一遍。";
}
