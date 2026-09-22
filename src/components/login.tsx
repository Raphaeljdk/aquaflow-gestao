"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Droplets,
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
      if (result?.error)
        setError(
          "E-mail ou senha inválidos. Após muitas tentativas, aguarde 15 minutos.",
        );
      else window.location.href = "/dashboard";
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  });
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[#103e55] p-14 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <Droplets size={33} className="text-cyan-300" />
          <span className="text-3xl font-semibold tracking-tight">
            aquaflow
          </span>
        </Link>
        <div className="max-w-md">
          <p className="mb-5 text-xs font-medium uppercase tracking-[.2em] text-cyan-300">
            Gestão de lava rápido
          </p>
          <h1 className="text-[48px] font-semibold leading-[1.12] tracking-tight">
            Mais cuidado.
            <br />
            Menos complicação.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-sky-100/65">
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
                className="flex items-center gap-3 text-sm text-sky-100/80"
                key={x.text}
              >
                <x.icon size={18} className="text-cyan-300" />
                {x.text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-sky-100/45">
          AquaFlow · Cada detalhe sob controle.
        </p>
      </section>
      <section className="flex items-center justify-center bg-card px-6 py-12">
        <div className="w-full max-w-[370px]">
          <div className="mb-12 flex items-center gap-2 text-2xl font-semibold lg:hidden">
            <Droplets className="text-primary" />
            aquaflow
          </div>
          <div className="mb-7 inline-flex rounded-xl bg-accent p-3 text-primary">
            <Droplets size={26} />
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
