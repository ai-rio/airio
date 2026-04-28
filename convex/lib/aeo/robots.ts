const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Amazonbot',
  'Diffbot',
  'Bytespider',
  'cohere-ai',
];

export function analyzeRobotsTxt(robotsTxt: string | null): {
  blocked: string[];
  patch: string;
} {
  if (!robotsTxt) {
    return {
      blocked: [],
      patch: '# Nenhum arquivo robots.txt encontrado. Crie um para controle explícito de crawlers.',
    };
  }

  const blocked: string[] = [];
  const lines = robotsTxt.split('\n');
  let currentAgent = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('User-agent:')) {
      currentAgent = trimmed.replace('User-agent:', '').trim();
    }
    if (trimmed.startsWith('Disallow: /') && AI_CRAWLERS.includes(currentAgent)) {
      blocked.push(currentAgent);
    }
  }

  const patch =
    blocked.length === 0
      ? '# Nenhuma correção necessária. Todos os crawlers de IA estão permitidos.'
      : blocked
          .map(
            (bot) =>
              `# Remova ou altere esta regra:\n# User-agent: ${bot}\n# Disallow: /\n# Para:\nUser-agent: ${bot}\nAllow: /`
          )
          .join('\n\n');

  return { blocked, patch };
}
