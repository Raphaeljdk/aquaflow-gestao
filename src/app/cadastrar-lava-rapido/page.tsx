"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PLATFORM_ANNUAL_STANDARD_CENTS, PLATFORM_ANNUAL_UPFRONT_CENTS, PLATFORM_ANNUAL_SAVINGS_CENTS, formatPlatformPrice, type PlatformPlan, type PlatformPaymentMethod } from "@/lib/platform-billing";
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
type Fields = { nomeEmpresa: string; cnpj: string; razaoSocial: string; nomeResponsavel: string; email: string; whatsapp: string; cidade: string; mensagem: string; site: string };
export default function CadastroEmpresaPage() {
  const [form, setForm] = useState<Fields>({
    nomeEmpresa:"", cnpj:"", razaoSocial:"", nomeResponsavel:"", email:"", whatsapp:"", cidade:"", mensagem:"",site:"",
  });
  const [consent, setConsent] = useState(false);
  const [cienteCondicoesComerciais, setCienteCondicoesComerciais] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planoPagamento, setPlanoPagamento] = useState<PlatformPlan>("ANUAL_AVISTA");
  const [metodoPagamento, setMetodoPagamento] = useState<PlatformPaymentMethod>("PIX_INTER");
  function escolherPlano(plano: PlatformPlan) {
    setPlanoPagamento(plano);
    setMetodoPagamento(plano === "ANUAL_AVISTA" ? "PIX_INTER" : "CARTAO_DEBITO");
  }
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [cnpjMensagem, setCnpjMensagem] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  function edit(key: keyof Fields, value: string) { setForm(v => ({...v,[key]:value})); }
  async function consultarCnpj() {
    setCnpjMensagem(""); setConsultandoCnpj(true);
    try {
      const clean = form.cnpj.replace(/\D/g, "");
      const res = await fetch("/api/public/cnpj/" + encodeURIComponent(clean), { cache: "no-store" });
      const dados = await res.json() as {
        error?: string; razaoSocial?: string; nomeFantasia?: string; cidade?: string; situacao?: string;
      };
      if (!res.ok) throw new Error(dados.error || "Não foi possível consultar.");
      setForm((atual) => ({
        ...atual,
        razaoSocial: dados.razaoSocial || atual.razaoSocial,
        nomeEmpresa: dados.nomeFantasia || dados.razaoSocial || atual.nomeEmpresa,
        cidade: dados.cidade || atual.cidade,
      }));
      setCnpjMensagem("Dados encontrados. Confira e ajuste antes de enviar.");
    } catch (e) {
      setCnpjMensagem(e instanceof Error ? e.message : "Não foi possível consultar. Preencha manualmente.");
    } finally { setConsultandoCnpj(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/solicitacoes", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...form, planoPagamento, metodoPagamento, aceitePrivacidade: consent, cienteCondicoesComerciais}),
      });
      const data = await response.json() as {error?:string};
      if(!response.ok) {setError(data.error || "Não foi possível enviar.");return;}
      setSuccess(true);
    } catch {setError("Falha de conexão. Tente novamente.");}
    finally {setBusy(false);}
  }
  const input = (label:string,name:keyof Fields,placeholder:string,required=true) => (
    <label className="block space-y-2 text-sm font-semibold" key={name}>
      <span>{label}</span>
      <input required={required} maxLength={name==="email"?150:120} value={form[name]} onChange={e=>edit(name,e.target.value)}
        type={name==="email"?"email":name==="whatsapp"?"tel":"text"}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
  );
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-8">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={17}/> Voltar ao login</Link>
      <div className="mt-10 grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
        <section className="space-y-6 lg:pt-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-wider"><Building2 size={15}/> Para proprietários</div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Seu lava-rápido com gestão profissional.</h1>
          <p className="text-base leading-8 text-muted-foreground">Solicite acesso à plataforma. Nossa equipe analisa o cadastro e entra em contato antes de ativar sua empresa.</p>
          <div className="space-y-3 text-sm">
            {["Cadastre seu estabelecimento sem compromisso","Aguarde a análise do administrador","Receba orientações para ativar seu painel"].map(x=><p key={x} className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={20}/>{x}</p>)}
          </div>
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ShieldCheck size={18} className="mt-1 shrink-0"/> Uma solicitação não cria uma conta, não gera cobrança e não permite acesso aos dados de outros estabelecimentos.</p>
        </section>
        <section className="rounded-3xl border border-border bg-card p-5 shadow-lg sm:p-8">
          {success ? <div role="status" className="space-y-5 py-12 text-center">
            <CheckCircle2 size={52} className="mx-auto text-primary"/>
            <h2 className="text-2xl font-bold">Solicitação recebida!</h2>
            <p className="text-sm leading-7 text-muted-foreground">Seus dados foram enviados para avaliação. Você receberá o próximo contato por e-mail ou WhatsApp.</p>
            <Link href="/login" className="inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Voltar ao início</Link>
          </div> : <>
            <h2 className="text-2xl font-bold">Solicitar cadastro</h2>
            <p className="mb-7 mt-2 text-sm text-muted-foreground">Preencha os dados do responsável e do estabelecimento.</p>
            <form onSubmit={submit} className="space-y-5">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <label htmlFor="cnpj-consulta" className="block text-sm font-semibold">CNPJ do estabelecimento (opcional)</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input id="cnpj-consulta" value={form.cnpj} maxLength={18}
                    onChange={(e) => edit("cnpj", e.target.value)} placeholder="00.000.000/0001-00" inputMode="numeric"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  <button type="button" onClick={() => void consultarCnpj()} disabled={consultandoCnpj || !form.cnpj.trim()}
                    className="h-12 rounded-xl border border-primary/40 px-4 text-sm font-semibold disabled:opacity-50">
                    {consultandoCnpj ? "Consultando..." : "Buscar dados do CNPJ"}
                  </button>
                </div>
                {cnpjMensagem && <p role="status" className="mt-2 text-xs leading-5 text-muted-foreground">{cnpjMensagem}</p>}
                <p className="mt-2 text-xs text-muted-foreground">A consulta traz somente dados públicos. Confira o cadastro; o preenchimento manual continua disponível.</p>
              </div>
              {form.razaoSocial && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Razão social consultada: {form.razaoSocial}</p>}
              {input("Nome do lava-rápido","nomeEmpresa","Ex.: Lava Rápido Central")}
              {input("Nome do proprietário","nomeResponsavel","Nome completo")}
              <div className="grid gap-5 sm:grid-cols-2">
                {input("E-mail de contato","email","nome@empresa.com.br")}
                {input("WhatsApp com DDD","whatsapp","(11) 99999-9999")}
              </div>
              {input("Cidade / região","cidade","Ex.: Itapevi, SP")}
              <label className="block space-y-2 text-sm font-semibold">
                <span>Informações adicionais (opcional)</span>
                <textarea maxLength={500} value={form.mensagem} onChange={e=>edit("mensagem",e.target.value)} rows={3}
                  className="w-full rounded-xl border border-input bg-background p-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Quantos funcionários? O que precisa organizar?" />
              </label>
              <section aria-labelledby="condicoes-comerciais" className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Wallet size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>
                  <div>
                    <h3 id="condicoes-comerciais" className="text-base font-bold">Escolha seu plano anual</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">As duas opções incluem 12 meses de uso do sistema. A contratação será concluída somente após aprovação.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Condição de pagamento do plano anual">
                  <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${planoPagamento === "ANUAL_MENSAL" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <input type="radio" name="planoPagamento" value="ANUAL_MENSAL" checked={planoPagamento === "ANUAL_MENSAL"} onChange={()=>escolherPlano("ANUAL_MENSAL")} className="accent-yellow-400"/>
                      Anual em mensalidades
                    </span>
                    <span className="mt-3 block text-xl font-bold">{formatPlatformPrice(PLATFORM_ANNUAL_STANDARD_CENTS)}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">12 mensalidades de R$ 80,00. Compromisso anual.</span>
                  </label>
                  <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${planoPagamento === "ANUAL_AVISTA" ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <input type="radio" name="planoPagamento" value="ANUAL_AVISTA" checked={planoPagamento === "ANUAL_AVISTA"} onChange={()=>escolherPlano("ANUAL_AVISTA")} className="accent-yellow-400"/>
                      Anual à vista
                    </span>
                    <span className="mt-3 block text-xl font-bold">{formatPlatformPrice(PLATFORM_ANNUAL_UPFRONT_CENTS)}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">Economize {formatPlatformPrice(PLATFORM_ANNUAL_SAVINGS_CENTS)} pagando uma única vez.</span>
                  </label>
                </div>
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold">Forma de pagamento</p>
                  {planoPagamento === "ANUAL_AVISTA" ? (
                    <fieldset className="grid gap-2 sm:grid-cols-2">
                      <legend className="sr-only">Escolha como pagar os R$ 790,00 à vista</legend>
                      <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold">
                        <input type="radio" name="metodoPagamento" value="PIX_INTER" checked={metodoPagamento === "PIX_INTER"} onChange={()=>setMetodoPagamento("PIX_INTER")} className="accent-yellow-400"/>
                        Pix — R$ 790,00
                      </label>
                      <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold">
                        <input type="radio" name="metodoPagamento" value="CARTAO_CREDITO_1X" checked={metodoPagamento === "CARTAO_CREDITO_1X"} onChange={()=>setMetodoPagamento("CARTAO_CREDITO_1X")} className="accent-yellow-400"/>
                        <CreditCard size={17} aria-hidden="true"/> Crédito — 1x de R$ 790,00
                      </label>
                    </fieldset>
                  ) : (
                    <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm font-semibold">Cartão de débito — 12 mensalidades de R$ 80,00</div>
                  )}
                  <p className="text-xs leading-5 text-muted-foreground">
                    {planoPagamento === "ANUAL_AVISTA"
                      ? "O cartão de crédito é exclusivamente à vista, em 1 parcela. Sem parcelamento."
                      : "As 12 mensalidades formam um contrato anual de R$ 960,00. O processamento recorrente depende de um provedor habilitado."}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Taxa de implantação</p>
                  <p className="mt-1 text-sm font-bold">Se aplicável, valor informado antes da contratação</p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">A assinatura da plataforma é independente dos pagamentos recebidos por cada lava-rápido por suas lavagens e serviços.</p>
                <p className="text-xs leading-5 text-muted-foreground">Esta página apenas solicita o cadastro: não coleta cartão, não gera Pix e não realiza cobrança. Os meios de pagamento serão habilitados após a integração bancária.</p>
              </section>
              <label className="sr-only" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={form.site} onChange={e=>edit("site",e.target.value)}/></label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input type="checkbox" required checked={cienteCondicoesComerciais} onChange={e=>setCienteCondicoesComerciais(e.target.checked)} className="mt-1 size-4 accent-yellow-400" />
                <span>Estou ciente das condições do plano anual selecionado, da forma de pagamento escolhida e de que eventual taxa de implantação será informada antes da contratação ou cobrança.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4 accent-yellow-400" />
                <span>Autorizo o uso destes dados para avaliar meu cadastro e entrar em contato sobre a plataforma, conforme a LGPD.</span>
              </label>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60">
                {busy && <Loader2 size={17} className="animate-spin"/>} Enviar solicitação
              </button>
            </form>
          </>}
        </section>
      </div>
    </div>
  </main>;
}
