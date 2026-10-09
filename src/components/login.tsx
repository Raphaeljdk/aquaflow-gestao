"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSession, signIn } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  ArrowRight, Eye, EyeOff, Loader2, ShieldCheck,
  CarFront, Clock3, CheckCircle2, Moon, Sun, LockKeyhole,
} from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { DEMO } from "@/hooks/use-store";
import { ErrorText } from "./forms/order-form";

export function Login() {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const form = useForm<{ email: string; password: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    setPending(true);
    try {
      const result = await signIn("credentials", { ...values, redirect: false });
      if (!result?.ok || result.error) {
        setError("E-mail ou senha inválidos. Confira os dados e tente novamente. Após muitas tentativas, aguarde 15 minutos.");
        return;
      }
      const session = await getSession();
      window.location.assign(session?.user?.role === "ADMIN" ? "/dashboard" : "/clientes");
    } catch {
      setError("Não foi possível conectar ao sistema. Tente novamente.");
    } finally {
      setPending(false);
    }
  });

  return (
    <main className="grid min-h-dvh overflow-x-hidden bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(460px,1fr)]">
      <section className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-[#080e16] px-10 py-12 text-white lg:flex xl:px-16 xl:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-1/4 size-[570px] rounded-full bg-[#2c4660]/20 blur-[100px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-32 bottom-[-170px] size-[400px] rounded-full bg-[#facc15]/10 blur-[90px]" />
        <Link href="/login" className="relative inline-flex w-fit rounded-2xl border border-white/15 bg-white p-2 shadow-2xl shadow-black/30">
          <img src="/ducha-elitte-logo.jpg" alt="Ducha Elitte Lava Rápido" className="h-24 w-56 rounded-lg object-contain" />
        </Link>
        <div className="relative max-w-lg py-16">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#facc15]/20 bg-[#facc15]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.17em] text-[#fde68a]">
            <span className="size-2 rounded-full bg-[#facc15]" />
            Central de gestão
          </div>
          <h1 className="text-[clamp(2.7rem,4.2vw,4.8rem)] font-bold leading-[1.08] tracking-[-.055em]">
            Sua operação, <br />
            <span className="text-[#facc15]">sempre em ordem.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-8 text-white/65">
            Atendimento, agenda, comandas e resultados em um só lugar.
            Mais agilidade para sua equipe e cuidado em cada detalhe.
          </p>
          <div className="mt-12 grid max-w-lg gap-4 sm:grid-cols-3">
            {[
              { icon: CarFront, title: "Clientes", detail: "Tudo conectado" },
              { icon: Clock3, title: "Agenda", detail: "Sem desencontros" },
              { icon: CheckCircle2, title: "Controle", detail: "Do início ao fim" },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[.045] p-4 backdrop-blur-sm">
                <Icon size={21} className="mb-4 text-[#facc15]" />
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45">
          <span>© {new Date().getFullYear()} Ducha Elitte</span>
          <span>Mais cuidado. Menos complicação.</span>
        </div>
      </section>

      <section className="relative flex min-h-dvh flex-col bg-background px-4 py-6 sm:px-8 sm:py-9 lg:px-12 xl:px-20">
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">Ducha Elitte • Gestão</p>
          <Button type="button" variant="outline" size="sm"
            aria-label={mounted && resolvedTheme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-10 gap-2 rounded-full px-4">
            {mounted && resolvedTheme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-xs">{mounted && resolvedTheme === "light" ? "Escuro" : "Claro"}</span>
          </Button>
        </div>

        <div className="mx-auto flex w-full max-w-[450px] flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,.35)] sm:p-9">
            <div className="mb-8 flex justify-center">
              <div className="flex w-full max-w-[330px] justify-center rounded-2xl border border-border bg-white p-3 shadow-sm">
                <img src="/ducha-elitte-logo.jpg" alt="Logo completa da Ducha Elitte" className="h-28 w-full rounded-lg object-contain sm:h-32" />
              </div>
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-muted-foreground">Portal da equipe</p>
            <h2 className="text-[clamp(1.65rem,4vw,2.05rem)] font-bold tracking-[-.04em]">Bom ter você aqui.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {DEMO ? "Explore a gestão do seu lava rápido." : "Entre com sua conta para acompanhar a operação."}
            </p>

            {DEMO ? (
              <div className="mt-7">
                <p className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  Ambiente de demonstração: dados fictícios e alterações temporárias.
                </p>
                <Button asChild className="mt-5 h-12 w-full rounded-xl font-semibold">
                  <Link href="/dashboard">Explorar demonstração <ArrowRight size={16} /></Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
                  <Input id="email" autoComplete="username" placeholder="seuemail@empresa.com.br" type="email"
                    className="h-12 rounded-xl bg-background px-4 text-base sm:text-sm" {...form.register("email")} />
                  <ErrorText message={form.formState.errors.email?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
                  <div className="relative">
                    <Input id="password" autoComplete="current-password" type={visible ? "text" : "password"}
                      className="h-12 rounded-xl bg-background px-4 pr-12 text-base sm:text-sm" {...form.register("password")} />
                    <Button type="button" variant="ghost" size="icon"
                      className="absolute right-1 top-1 size-10 rounded-lg"
                      aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={visible}
                      onClick={() => setVisible((v) => !v)}>
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                  <ErrorText message={form.formState.errors.password?.message} />
                </div>
                {error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/10">
                  {pending ? <><Loader2 className="animate-spin" size={17} /> Entrando...</> : <>Entrar no sistema <ArrowRight size={18} /></>}
                </Button>
                <p className="text-center text-xs leading-5 text-muted-foreground">Precisa de acesso? Fale com o administrador da Ducha Elitte.</p>
              </form>
            )}
            <div className="mt-8 flex items-center justify-center gap-2 border-t border-border pt-6 text-center text-xs text-muted-foreground">
              {DEMO ? <ShieldCheck size={15} /> : <LockKeyhole size={15} />}
              {DEMO ? "Demonstração com dados fictícios" : "Ambiente protegido para sua equipe"}
            </div>
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">Ducha Elitte · Tecnologia para uma operação melhor.</p>
        </div>
      </section>
    </main>
  );
}
