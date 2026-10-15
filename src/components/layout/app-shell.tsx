"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  CalendarDays,
  UserRoundCog,
  ChartNoAxesCombined,
  Settings2,
  Search,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Building2,
  ArrowUpRight,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore, DEMO } from "@/hooks/use-store";
import { pagesForUser } from "@/lib/permissions";
import { roleLabels, type Comanda } from "@/types";
import { OrderForm, OrderDetail } from "@/components/forms/order-form";
import { SearchInput } from "@/components/common";
import { cn } from "@/lib/utils";
import { WebMCPTools } from "@/components/webmcp-tools";
const links = [
  { path: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { path: "clientes", label: "Clientes atendidos", icon: Users },
  { path: "comandas", label: "Comandas", icon: ClipboardList },
  { path: "agendamentos", label: "Agendamentos", icon: CalendarDays },
  { path: "servicos", label: "Serviços", icon: CheckCircle2 },
  { path: "estoque", label: "Estoque", icon: Package },
  { path: "funcionarios", label: "Funcionários", icon: UserRoundCog },
  { path: "relatorios", label: "Faturamento", icon: ChartNoAxesCombined },
  { path: "configuracoes", label: "Configurações", icon: Settings2 },
];
const Actions = createContext<{
  newOrder: (clientId?: string) => void;
  showOrder: (id: string) => void;
}>({ newOrder: () => {}, showOrder: () => {} });
export const useActions = () => useContext(Actions);
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    { data, user, loading, error, refresh } = useStore(),
    { theme, setTheme } = useTheme();
  const [orderOpen, setOrderOpen] = useState(false),
    [orderClientId, setOrderClientId] = useState<string | undefined>(),
    [orderId, setOrderId] = useState<string | null>(null),
    [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (!user) return;
    const page = path.split("/")[1] || "dashboard";
    const visible = pagesForUser(user);
    if (!visible.includes(page)) router.replace("/" + (visible[0] ?? "comandas"));
  }, [user, path, router]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((x) => !x);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const current = links.find((l) => path.includes(l.path)) ?? links[0],
    queue =
      data?.comandas.filter((o) =>
        ["AGUARDANDO", "EM_LAVAGEM"].includes(o.status),
      ).length ?? 0;
  const allowed = pagesForUser(user ?? { role: "FUNCIONARIO" }),
    title = data?.configuracao.nome ?? "Ducha Elitte";
  const matches =
    data?.comandas
      .filter((order) => {
        const q = query.trim().toLowerCase();
        const client = data?.clientes.find((item) => item.id === order.clienteId);
        return [order.nomeCliente, client?.nome, client?.telefone, order.placa, String(order.numero)].some(
          (value) => value?.toLowerCase().includes(q),
        );
      })
      .slice(0, 8) ?? [];
  return (
    <Actions.Provider
      value={{
        newOrder: (clientId?: string) => {
          setOrderClientId(clientId);
          setOrderOpen(true);
        },
        showOrder: setOrderId,
      }}
    >
      <SidebarProvider
        style={{ "--sidebar-width": "238px" } as React.CSSProperties}
      >
        <WebMCPTools />
        <Sidebar className="border-r border-border" collapsible="offcanvas">
          <SidebarHeader className="px-5 pb-6 pt-6">
            <Link
              href="/comandas"
              className="block"
              aria-label={title + " · Comandas"}
            >
              <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-2">
                <img
                  src={data?.configuracao.logo || "/ducha-elitte-app.jpg"}
                  alt={title + " · logo"}
                  className="size-12 shrink-0 rounded-xl object-contain"
                  width={48}
                  height={48}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{title}</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    Gestão do lava-rápido
                  </span>
                </span>
              </div>
            </Link>
            <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">
              Gestão do lava-rápido
            </p>
          </SidebarHeader>
          <SidebarContent className="gap-6 px-3">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="mb-2 px-4 text-xs tracking-[.16em] text-muted-foreground">
                OPERAÇÃO
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {links
                  .slice(0, 4)
                  .filter((l) => allowed.includes(l.path))
                  .map((l) => (
                    <SidebarMenuItem key={l.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={current.path === l.path}
                        className="h-11 rounded-lg px-4 text-[14px] font-medium data-[active=true]:font-semibold"
                      >
                        <Link href={"/" + l.path}>
                          <l.icon className="mr-1 size-[18px]!" />
                          <span>{l.label}</span>
                          {l.path === "comandas" && queue > 0 && (
                            <span className="ml-auto rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                              {queue}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroup>
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="mb-2 px-4 text-xs tracking-[.16em] text-muted-foreground">
                GESTÃO
              </SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {links
                  .slice(4)
                  .filter((l) => allowed.includes(l.path))
                  .map((l) => (
                    <SidebarMenuItem key={l.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={current.path === l.path}
                        className="h-11 rounded-lg px-4 text-[14px] font-medium"
                      >
                        <Link href={"/" + l.path}>
                          <l.icon className="mr-1 size-[18px]!" />
                          <span>{l.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-4 p-4">
            <div className="rounded-xl border border-border bg-background p-3.5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
                <Building2 size={14} className="text-primary" />
                {title}
              </div>
              <p className="text-xs text-muted-foreground">Unidade principal</p>
              <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                <CheckCircle2 size={12} className="text-primary" />
                {DEMO ? "Ambiente de demonstração" : "Gestão conectada"}
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex size-9 items-center justify-center rounded-full bg-[#e7f0f8] text-xs font-semibold text-[#416581]">
                {user?.name
                  ?.split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("") ?? "DE"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user?.name ?? "Carregando..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[user?.role ?? "ADMIN"]}
                </p>
              </div>
              {!DEMO && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sair"
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                >
                  <LogOut size={15} />
                </Button>
              )}
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-5 md:h-[76px] md:px-8">
            <div className="flex items-center gap-2 text-sm">
              <SidebarTrigger className="mr-2 md:hidden" />
              <span className="hidden text-muted-foreground sm:inline">
                Operação
              </span>
              <ChevronRight
                size={13}
                className="hidden text-muted-foreground/60 sm:block"
              />
              <span className="font-medium">{current.label}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-4">
              {allowed.includes("comandas") && (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg px-2.5 text-xs font-bold sm:px-4"
                  onClick={() => {
                    setOrderClientId(undefined);
                    setOrderOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Receber veículo</span>
                  <span className="sm:hidden">Receber</span>
                </Button>
              )}
              <div className="h-5 border-l border-border" />
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
                }
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </Button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1600px] min-w-0 px-3 py-5 sm:px-4 sm:py-7 md:px-8 md:py-8">
            <div className="page-enter" key={path}>
              {loading ? (
                <div className="space-y-6">
                  <Skeleton className="h-10 w-64" />
                  <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-36 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-80 w-full rounded-xl" />
                </div>
              ) : error ? (
                <div className="panel p-8">
                  <h2 className="font-semibold">
                    Não foi possível carregar o sistema
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                  <Button onClick={() => void refresh()} className="mt-5">
                    Tentar novamente
                  </Button>
                </div>
              ) : (
                children
              )}
            </div>
            <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
              <span>
                © {new Date().getFullYear()} {title} · Cada detalhe sob
                controle.
              </span>
              <span>
                {DEMO
                  ? "Demonstração · alterações temporárias, reiniciadas ao recarregar"
                  : title + " Gestão"}
              </span>
            </footer>
          </main>
        </div>
        {data && (
          <>
            <OrderForm
              open={orderOpen}
              initialClientId={orderClientId}
              onClose={() => {
                setOrderOpen(false);
                setOrderClientId(undefined);
              }}
            />
            <OrderDetail id={orderId} onClose={() => setOrderId(null)} />
          </>
        )}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Busca rápida</DialogTitle>
              <DialogDescription>
                Encontre atendimentos por nome, placa ou número da comanda.
              </DialogDescription>
            </DialogHeader>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Nome, placa ou comanda..."
            />
            <div className="max-h-80 overflow-auto">
              {matches.map((c) => (
                <button
                  key={c.id}
                  className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-muted"
                  onClick={() => {
                    setOrderId(c.id);
                    setSearchOpen(false);
                  }}
                >
                  <span>
                    <span className="block text-sm font-medium">
                      {c.nomeCliente || "Atendimento"} · #{c.numero}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.placa || "Sem placa"}
                    </span>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
              {matches.length === 0 && (
                <p className="p-5 text-center text-sm text-muted-foreground">
                  Nenhum atendimento encontrado.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </Actions.Provider>
  );
}
