"use client";
import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeferredInstall = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<DeferredInstall | null>(null);
  const [mobile, setMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIos(ios);
    setMobile(phone);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // A interface continua funcionando normalmente se o SW falhar.
      });
    }
    const onInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as DeferredInstall);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!mobile && !deferred)) return null;

  const install = async () => {
    if (!deferred) {
      setHelp((value) => !value);
      return;
    }
    const request = deferred;
    setDeferred(null);
    try {
      await request.prompt();
      await request.userChoice;
    } catch {
      setHelp(true);
    }
  };
  return (
    <div className="mx-auto mt-4 w-full max-w-[450px] rounded-2xl border border-border bg-card/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-xl bg-[#152e43] p-2 text-sky-200"><Smartphone size={20}/></div>
          <div>
            <p className="text-sm font-bold">AquaFlow no seu celular</p>
            <p className="text-xs text-muted-foreground">Acesso rápido pela tela inicial.</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void install()}
          className="shrink-0 rounded-xl">
          <Download size={15}/> Instalar app
        </Button>
      </div>
      {help && (
        <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3 text-xs leading-6" role="status">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {isIos ? <Share2 size={16} className="mt-1 shrink-0"/> : <Download size={16} className="mt-1 shrink-0"/>}
              <p>{isIos
                ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Confirme em Adicionar."
                : "No Chrome, abra o menu de três pontos e escolha Instalar app ou Adicionar à tela inicial."}</p>
            </div>
            <button type="button" aria-label="Fechar instruções" onClick={() => setHelp(false)}>
              <X size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
