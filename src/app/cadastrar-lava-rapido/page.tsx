"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PLATFORM_MONTHLY_PRICE_LABEL } from "@/lib/platform-billing";
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
type Fields = { nomeEmpresa: string; cnpj: string; razaoSocial: string; nomeResponsavel: string; email: string; whatsapp: string; cidade: string; mensagem: string; site: string };
export default function CadastroEmpresaPage() {
  const [form, setForm] = useState<Fields>({
    nomeEmpresa:"", cnpj:"", razaoSocial:"", nomeResponsavel:"", email:"", whatsapp:"", cidade:"", mensagem:"",site:"",
  });
  const [consent, setConsent] = useState(false);
  const [cienteCondicoesComerciais, setCienteCondicoesComerciais] = useState(false);
  const [busy, setBusy] = useState(false);
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
        body:JSON.stringify({...form, aceitePrivacidade: consent, cienteCondicoesComerciais}),
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
                    <h3 id="condicoes-comerciais" className="text-base font-bold">Investimento e forma de pagamento</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Condições para contratar o sistema após a aprovação do cadastro.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground">Taxa inicial do sistema</p>
                    <p className="mt-2 text-lg font-bold">Valor a definir</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Pagamento único pela implantação e configuração.</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground">Plano mensal fixo</p>
                    <p className="mt-2 text-lg font-bold">{PLATFORM_MONTHLY_PRICE_LABEL}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Assinatura para uso e manutenção da plataforma, independentemente das receitas das lavagens.</p>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Forma de pagamento da assinatura</p>
                  <div className="flex min-h-12 items-center gap-3 rounded-lg border border-primary/30 bg-background px-4 py-3">
                    <CreditCard size={21} className="shrink-0 text-primary" aria-hidden="true"/>
                    <div>
                      <p className="text-sm font-bold">Cartão de débito</p>
                      <p className="text-xs text-muted-foreground">Única opção prevista para a mensalidade do sistema.</p>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">O processamento por cartão será disponibilizado somente após a integração com um provedor habilitado. Não informe dados do cartão nesta página.</p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Os pagamentos que cada lava-rápido recebe pelas lavagens são independentes da mensalidade da plataforma e seguem as configurações do próprio estabelecimento.</p>
                <p className="text-xs leading-5 text-muted-foreground">Nenhuma cobrança é realizada nesta página. A taxa de implantação (se aplicável), o vencimento e as condições serão apresentados antes da contratação.</p>
              </section>
              <label className="sr-only" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={form.site} onChange={e=>edit("site",e.target.value)}/></label>
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input type="checkbox" required checked={cienteCondicoesComerciais} onChange={e=>setCienteCondicoesComerciais(e.target.checked)} className="mt-1 size-4 accent-yellow-400" />
                <span>Estou ciente da mensalidade fixa de R$ 80,00, da forma prevista de pagamento por cartão de débito e de que eventual taxa inicial será informada antes da contratação ou cobrança.</span>
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
