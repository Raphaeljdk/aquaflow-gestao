"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import {
  ArrowUpRight, Building2, Check, CheckCircle2, Clock3, ExternalLink,
  FileClock, Filter, Info, Loader2, LogOut, RefreshCw, Search,
  ShieldCheck, ShieldOff, UsersRound, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Status = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO";
type FilterStatus = Status | "TODAS";
type Section = "solicitacoes" | "acessos";
type Account = { id: string; name: string; email: string; role: string; ativo: boolean; createdAt: string };
type Request = {
  id: string; nomeEmpresa: string; nomeResponsavel: string; email: string;
  whatsapp: string; cidade: string; mensagem: string; status: Status;
  createdAt: string; revisadoEm: string | null; observacoesInternas: string;
};
const labels: Record<Status, string> = {
  PENDENTE: "Pendente", EM_ANALISE: "Em análise",
  APROVADO: "Análise aprovada", REJEITADO: "Rejeitada",
};
const statusColors: Record<Status, string> = {
  PENDENTE: "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  EM_ANALISE: "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  APROVADO: "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
  REJEITADO: "border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-300",
};
const filters: { label: string; value: FilterStatus }[] = [
  { label: "Todas", value: "TODAS" },
  { label: "Pendentes", value: "PENDENTE" },
  { label: "Em análise", value: "EM_ANALISE" },
  { label: "Aprovadas", value: "APROVADO" },
  { label: "Rejeitadas", value: "REJEITADO" },
];
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR", {
  day: "2-digit", month: "short", year: "numeric",
});
const phoneLink = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return "https://wa.me/" + (digits.startsWith("55") ? digits : "55" + digits);
};
export function PlatformDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [platformEmail, setPlatformEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("TODAS");
  const [section, setSection] = useState<Section>("solicitacoes");
  const [confirmation, setConfirmation] = useState<Account | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, usersRes, meRes] = await Promise.all([
        fetch("/api/plataforma/solicitacoes", { cache: "no-store" }),
        fetch("/api/plataforma/usuarios", { cache: "no-store" }),
        fetch("/api/plataforma/me", { cache: "no-store" }),
      ]);
      if (!res.ok || !usersRes.ok || !meRes.ok)
        throw new Error(res.status === 403 || usersRes.status === 403
          ? "Acesso exclusivo ao administrador da plataforma."
          : "Não foi possível carregar o painel. Tente atualizar.");
      const [r, u, me] = await Promise.all([
        res.json() as Promise<{ solicitacoes: Request[] }>,
        usersRes.json() as Promise<{ usuarios: Account[] }>,
        meRes.json() as Promise<{ platformAdmin: boolean; email?: string }>,
      ]);
      if (!me.platformAdmin)
        throw new Error("Não foi possível confirmar o administrador central.");
      setRequests(r.solicitacoes);
      setAccounts(u.usuarios);
      setPlatformEmail((me.email || "").toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    pending: requests.filter((r) => r.status === "PENDENTE").length,
    reviewing: requests.filter((r) => r.status === "EM_ANALISE").length,
    approved: requests.filter((r) => r.status === "APROVADO").length,
    active: accounts.filter((u) => u.ativo).length,
  }), [requests, accounts]);

  const filteredRequests = useMemo(() => requests.filter((item) =>
    (filter === "TODAS" || item.status === filter) &&
    [item.nomeEmpresa, item.nomeResponsavel, item.cidade, item.email]
      .some((part) => part.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))),
  ), [requests, filter, search]);
  const filteredAccounts = useMemo(() => accounts.filter((a) =>
    [a.name, a.email, a.role].some((part) =>
      part.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))),
  ), [accounts, search]);

  async function change(item: Request, status: Status) {
    if (busy) return;
    setBusy(item.id);
    setError("");
    try {
      const res = await fetch("/api/plataforma/solicitacoes/" + encodeURIComponent(item.id), {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, observacoesInternas: item.observacoesInternas }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível atualizar a solicitação.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setBusy(null); }
  }
  async function toggleAccount(account: Account) {
    if (busy || account.email.toLowerCase() === platformEmail) return;
    setBusy(account.id);
    setError("");
    try {
      const res = await fetch("/api/plataforma/usuarios/" + encodeURIComponent(account.id), {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !account.ativo }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error || "Não foi possível alterar o acesso.");
      setConfirmation(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a conta.");
    } finally { setBusy(null); }
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-9">
        <header className="relative overflow-hidden rounded-[26px] border border-slate-700/60 bg-gradient-to-br from-[#101b2b] via-[#111c2e] to-[#22374a] px-5 py-7 text-white shadow-xl shadow-black/10 sm:px-9 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 size-80 rounded-full border-[42px] border-white/[.035]"/>
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-slate-200">
                <ShieldCheck size={14}/> Administração central
              </p>
              <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-4xl">
                Painel da plataforma
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                Gerencie as solicitações de novos lava-rápidos e os acessos desta instância em um só lugar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Atualizar
              </Button>
              <Button type="button" variant="outline" onClick={() => void signOut({ callbackUrl: "/login" })}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <LogOut size={15}/> Sair
              </Button>
            </div>
          </div>
          <div className="relative mt-7 flex items-start gap-3 rounded-xl border border-white/15 bg-white/[.07] p-4 text-xs leading-6 text-slate-200 sm:max-w-3xl">
            <Info size={18} className="mt-0.5 shrink-0 text-amber-300"/>
            <p><strong className="text-white">Etapa de implantação multiempresa.</strong> Aprovar uma solicitação não cria ambiente, banco isolado ou credenciais automaticamente. A lista de usuários abaixo pertence somente a esta instância.</p>
          </div>
        </header>

        <section aria-label="Visão geral" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Aguardando análise", value: stats.pending, icon: FileClock, tone: "text-amber-500" },
            { label: "Em análise", value: stats.reviewing, icon: Clock3, tone: "text-sky-500" },
            { label: "Análises aprovadas", value: stats.approved, icon: Building2, tone: "text-emerald-500" },
            { label: "Logins ativos nesta instância", value: stats.active, icon: UsersRound, tone: "text-primary" },
          ].map((card) => (
            <article key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs leading-5 text-muted-foreground">{card.label}</span>
                <card.icon size={19} className={card.tone}/>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight">{loading ? "—" : card.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <div className="flex gap-2" role="tablist" aria-label="Áreas administrativas">
              <button type="button" role="tab" aria-selected={section === "solicitacoes"}
                className={"border-b-2 px-3 py-3 text-sm font-semibold transition " + (section === "solicitacoes" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                onClick={() => { setSection("solicitacoes"); setSearch(""); }}>
                <Building2 size={16} className="mr-2 inline"/> Solicitações ({requests.length})
              </button>
              <button type="button" role="tab" aria-selected={section === "acessos"}
                className={"border-b-2 px-3 py-3 text-sm font-semibold transition " + (section === "acessos" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
                onClick={() => { setSection("acessos"); setSearch(""); }}>
                <UsersRound size={16} className="mr-2 inline"/> Acessos ({accounts.length})
              </button>
            </div>
          </div>
          {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{section === "solicitacoes" ? "Solicitações de novos estabelecimentos" : "Usuários desta instância"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {section === "solicitacoes" ? "Revise os dados recebidos, registre observações e acompanhe cada decisão." : "Gerencie logins existentes com proteção da conta central e do último administrador."}
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground"/>
              <Input aria-label="Buscar" className="h-11 pl-10" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={section === "solicitacoes" ? "Empresa, responsável ou cidade" : "Nome, e-mail ou perfil"}/>
            </div>
          </div>

          {section === "solicitacoes" && (
            <div role="tabpanel" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={15} className="text-muted-foreground"/>
                {filters.map((item) => (
                  <button type="button" key={item.value} aria-pressed={filter === item.value}
                    onClick={() => setFilter(item.value)}
                    className={"rounded-full border px-3 py-2 text-xs font-semibold transition " +
                      (filter === item.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted")}>
                    {item.label}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"><Loader2 size={19} className="mr-2 inline animate-spin"/> Carregando solicitações...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
                  <Building2 size={30} className="mx-auto text-muted-foreground"/>
                  <p className="mt-3 font-semibold">Nenhuma solicitação encontrada</p>
                  <p className="mt-1 text-sm text-muted-foreground">As novas solicitações aparecerão aqui automaticamente.</p>
                </div>
              ) : (
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  {filteredRequests.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold tracking-tight">{item.nomeEmpresa}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{item.cidade} · {item.nomeResponsavel}</p>
                        </div>
                        <span className={"rounded-full border px-3 py-1.5 text-xs font-semibold " + statusColors[item.status]}>
                          {labels[item.status]}
                        </span>
                      </div>
                      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14}/> Recebida em {date(item.createdAt)}</p>
                      <div className="mt-4 space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
                        <a className="block break-all font-medium hover:underline" href={"mailto:" + item.email}>{item.email} <ArrowUpRight size={13} className="inline"/></a>
                        <a href={phoneLink(item.whatsapp)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 font-medium hover:underline"><ExternalLink size={14}/> {item.whatsapp}</a>
                        {item.mensagem && <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm leading-6">{item.mensagem}</p>}
                      </div>
                      <label className="mt-5 block text-xs font-semibold text-muted-foreground" htmlFor={"notes-" + item.id}>Observações internas</label>
                      <textarea id={"notes-" + item.id} maxLength={1000} rows={3} value={item.observacoesInternas}
                        onChange={(e) => setRequests((prev) => prev.map((r) => r.id === item.id ? { ...r, observacoesInternas: e.target.value } : r))}
                        className="mt-2 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Próximos passos, requisitos ou motivo da decisão..."/>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void change(item, "EM_ANALISE")}>
                          <Clock3 size={14}/> {item.status === "PENDENTE" ? "Iniciar análise" : "Salvar / Em análise"}
                        </Button>
                        <Button size="sm" disabled={busy !== null} onClick={() => void change(item, "APROVADO")}>
                          <Check size={14}/> Aprovar análise
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void change(item, "REJEITADO")}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <X size={14}/> Rejeitar
                        </Button>
                      </div>
                      {item.status === "APROVADO" && <p className="mt-3 text-xs text-muted-foreground">A aprovação não provisiona um lava-rápido automaticamente.</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === "acessos" && (
            <div role="tabpanel" className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary"/>
                <p>As contas listadas pertencem somente ao ambiente atual. A conta central não pode ser desativada, e o servidor impede a remoção do último administrador ativo. Outros estabelecimentos exigirão isolamento próprio antes de habilitar acessos.</p>
              </div>
              {loading ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground"><Loader2 size={19} className="mr-2 inline animate-spin"/> Carregando acessos...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</div>
              ) : (
                <div className="grid gap-3">
                  {filteredAccounts.map((account) => {
                    const central = account.email.toLowerCase() === platformEmail;
                    return (
                      <article key={account.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted"><UsersRound size={20} className="text-muted-foreground"/></div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{account.name}</p>
                            <p className="mt-1 break-all text-xs text-muted-foreground">{account.email}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Criado em {date(account.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold">{central ? "Administrador central" : account.role}</span>
                          <span className={"inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold " + (account.ativo ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300" : "border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-300")}>
                            {account.ativo ? <CheckCircle2 size={12}/> : <ShieldOff size={12}/>}
                            {account.ativo ? "Ativo" : "Desativado"}
                          </span>
                          <Button size="sm" variant="outline" disabled={central || busy !== null}
                            title={central ? "Conta central protegida" : undefined}
                            onClick={() => setConfirmation(account)}>
                            {central ? "Protegida" : account.ativo ? "Desativar" : "Reativar"}
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground">
          AquaFlow · Painel administrativo protegido · Nenhum acesso multiempresa é liberado automaticamente
        </footer>
      </div>
      <AlertDialog open={!!confirmation} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.ativo ? "Desativar" : "Reativar"} este acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.name} · {confirmation?.email}. {confirmation?.ativo
                ? "Esta conta não poderá acessar a instância até ser reativada."
                : "Esta conta voltará a poder entrar na instância com suas credenciais atuais."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>Voltar</AlertDialogCancel>
            <AlertDialogAction disabled={!!busy} onClick={(event) => {
              event.preventDefault();
              if (confirmation) void toggleAccount(confirmation);
            }}>{busy ? "Salvando..." : "Confirmar alteração"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
