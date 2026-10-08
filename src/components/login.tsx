"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  CarFront,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { loginRedirectPath } from "@/lib/permissions";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { DEMO } from "@/hooks/use-store";
import { ErrorText } from "./forms/order-form";
export function Login() {
  const [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    form = useForm<{ email: string; password: string }>({
      resolver: zodResolver(loginSchema),
      defaultValues: { email: "", password: "" },
    });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    setPending(true);
    try {
      const result = await signIn("credentials", {
        ...values,
        redirect: false,
      });
      if (!result?.ok || result.error)
        setError(
          "E-mail ou senha inválidos. Após muitas tentativas, aguarde 15 minutos.",
        );
      else {
        const session = await getSession();
        if (!session?.user) throw new Error("Sessão indisponível.");
        const callback = new URLSearchParams(window.location.search).get("callbackUrl");
        window.location.href = loginRedirectPath(session.user.role, callback);
      }
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  });
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-black p-14 text-white lg:flex">
        <Link href="/" className="block">
          <img
            src="/ducha-elitte-logo.jpg"
            alt="Ducha Elitte Lava Rápido App"
            className="w-72 rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
          />
        </Link>
        <div className="max-w-md">
          <p className="mb-5 text-xs font-medium uppercase tracking-[.2em] text-yellow-300">
            Gestão de lava rápido
          </p>
          <h1 className="text-[48px] font-semibold leading-[1.12] tracking-tight">
            Mais cuidado.
            <br />
            Menos complicação.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-white/65">
            Da primeira chegada à última entrega, sua operação flui melhor
            quando tudo está no lugar.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: CarFront, text: "Cada veículo no seu ritmo." },
              { icon: Clock3, text: "Sua agenda sem desencontros." },
              { icon: CheckCircle2, text: "Seus resultados sempre à vista." },
            ].map((x) => (
              <div
                className="flex items-center gap-3 text-sm text-white/80"
                key={x.text}
              >
                <x.icon size={18} className="text-yellow-300" />
                {x.text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/45">
          Ducha Elitte · Cada detalhe sob controle.
        </p>
      </section>
      <section className="flex items-center justify-center bg-card px-6 py-12">
        <div className="w-full max-w-[370px]">
          <div className="mb-7 flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-sm">
            <img
              src="/ducha-elitte-logo.jpg"
              alt="Logo completa Ducha Elitte"
              className="h-auto max-h-40 w-full object-contain"
            />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">
            Bom ter você aqui.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {DEMO
              ? "Explore a gestão do seu lava rápido."
              : "Entre para acompanhar sua operação."}
          </p>
          {DEMO ? (
            <div className="mt-8">
              <div className="mb-6 rounded-xl border border-border bg-background p-5">
                <h3 className="text-sm font-semibold">
                  Ambiente de demonstração
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Experimente todos os módulos com dados fictícios. As
                  alterações desta demonstração são temporárias e reiniciam ao
                  recarregar.
                </p>
              </div>
              <Button asChild className="h-11 w-full">
                <Link href="/dashboard">
                  Explorar demonstração
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                O projeto completo inclui login por e-mail e senha, perfis de
                acesso e banco PostgreSQL.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  autoComplete="username"
                  placeholder="voce@empresa.com.br"
                  type="email"
                  className="h-11"
                  {...form.register("email")}
                />
                <ErrorText message={form.formState.errors.email?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    autoComplete="current-password"
                    type={visible ? "text" : "password"}
                    className="h-11 pr-11"
                    {...form.register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1"
                    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                <ErrorText message={form.formState.errors.password?.message} />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <Button type="submit" disabled={pending} className="h-11 w-full">
                {pending ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <>
                    Entrar no sistema
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Precisa de acesso? Fale com o administrador.
              </p>
            </form>
          )}
          <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} />
            {DEMO
              ? "Dados de exemplo · nenhum login necessário"
              : "Acesso seguro para você e sua equipe"}
          </p>
        </div>
      </section>
    </main>
  );
}
