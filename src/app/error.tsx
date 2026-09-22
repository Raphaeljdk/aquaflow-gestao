"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg p-12">
      <h1 className="text-xl font-semibold">
        Não foi possível abrir esta página.
      </h1>
      <p className="my-4 text-muted-foreground">
        Tente novamente. Os dados já salvos continuam no sistema.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
