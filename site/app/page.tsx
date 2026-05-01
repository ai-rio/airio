const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://seo.ai.rio.br'

const PROBLEMS = [
  { icon: '🤖', text: 'Crawlers de IA bloqueados no robots.txt' },
  { icon: '📄', text: 'Site sem llms.txt — invisível para ChatGPT' },
  { icon: '🏷️', text: 'Falta de schema markup (FAQ, HowTo, Entity)' },
  { icon: '✍️', text: 'Conteúdo não estruturado para citação por IA' },
]

const FIXES = [
  { file: 'llms.txt', desc: 'Gerado automaticamente para seu domínio' },
  { file: 'robots.txt patch', desc: 'Desbloqueia GPTBot, ClaudeBot, PerplexityBot' },
  { file: 'Schema JSON-LD', desc: 'FAQ, HowTo e Entity para cada página' },
  { file: 'Trechos reescritos', desc: 'Conteúdo otimizado para ser citado por IA' },
]

const PLANS = [
  { name: '10 créditos', price: 'R$49', unit: 'R$4,90/auditoria', highlight: false },
  { name: '30 créditos', price: 'R$99', unit: 'R$3,30/auditoria', highlight: true },
  { name: '100 créditos', price: 'R$249', unit: 'R$2,49/auditoria', highlight: false },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-bold text-lg">Tagsmith</span>
        <a
          href={DASHBOARD_URL}
          className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium"
        >
          Auditar meu site
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-black text-white text-xs px-3 py-1 rounded-full mb-6 font-medium">
          Primeira ferramenta de AEO do Brasil
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Por que seu concorrente aparece no ChatGPT e{' '}
          <span className="underline decoration-4 underline-offset-4">você não?</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Tagsmith audita seu site em 60 segundos, identifica os problemas que te deixam invisível
          para IA e gera todos os arquivos de correção prontos para usar.
        </p>
        <a
          href={DASHBOARD_URL}
          className="inline-block bg-black text-white px-8 py-4 rounded-xl text-base font-semibold"
        >
          Auditar gratuitamente →
        </a>
        <p className="text-sm text-gray-400 mt-3">1 auditoria grátis. Sem cartão.</p>
      </section>

      {/* Problems */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            O que impede sua empresa de aparecer nas respostas de IA
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {PROBLEMS.map(p => (
              <div key={p.text} className="bg-white border rounded-xl p-5 flex gap-4 items-start">
                <span className="text-2xl">{p.icon}</span>
                <p className="text-sm text-gray-700">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">
            Não apenas um score. Arquivos prontos para corrigir.
          </h2>
          <p className="text-center text-gray-500 mb-12 text-sm">
            Outros tools te mostram o problema. Tagsmith te dá a correção.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FIXES.map(f => (
              <div key={f.file} className="border rounded-xl p-5">
                <p className="font-semibold font-mono text-sm mb-1">{f.file}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
                <p className="text-xs text-blue-600 mt-3">↓ Download imediato</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">Preços simples</h2>
          <p className="text-center text-gray-500 text-sm mb-12">
            Pague por auditoria. Sem assinatura obrigatória.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border ${plan.highlight ? 'bg-black text-white border-black' : 'bg-white'}`}
              >
                <p className={`text-sm font-medium mb-4 ${plan.highlight ? 'text-gray-300' : 'text-gray-500'}`}>
                  {plan.name}
                </p>
                <p className="text-3xl font-bold mb-1">{plan.price}</p>
                <p className={`text-xs mb-6 ${plan.highlight ? 'text-gray-400' : 'text-gray-400'}`}>
                  {plan.unit}
                </p>
                <a
                  href={`${DASHBOARD_URL}/billing`}
                  className={`block text-center py-2.5 rounded-lg text-sm font-medium ${plan.highlight
                      ? 'bg-white text-black'
                      : 'bg-black text-white'
                    }`}
                >
                  Comprar
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Comece agora. Resultados em 60 segundos.
        </h2>
        <p className="text-gray-500 mb-8">
          Sua primeira auditoria é gratuita. Sem cartão de crédito.
        </p>
        <a
          href={DASHBOARD_URL}
          className="inline-block bg-black text-white px-8 py-4 rounded-xl text-base font-semibold"
        >
          Auditar meu site →
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-xs text-gray-400">
        <p>Tagsmith © {new Date().getFullYear()} · <a href="/termos" className="underline">Termos</a> · <a href="/privacidade" className="underline">Privacidade</a></p>
      </footer>
    </main>
  )
}
