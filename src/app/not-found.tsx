import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <span className="text-6xl font-semibold text-primary">404</span>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <Link href="/dashboard" className="text-primary underline">
        Voltar para a visão geral
      </Link>
    </main>
  );
}
