"use client";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { useStore } from "@/hooks/use-store";
import { useActions } from "./layout/app-shell";
type Context = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function WebMCPTools() {
  const store = useStore(),
    actions = useActions(),
    ref = useRef({ store, actions });
  ref.current = { store, actions };
  useEffect(() => {
    const context = (document as Document & { modelContext?: Context })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const empty = z.object({}).strict();
    const register = (tool: Parameters<Context["registerTool"]>[0]) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: "read_vehicle_queue",
      description: "Lê as comandas ativas visíveis ao usuário atual.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        empty.parse(input);
        const d = ref.current.store.data;
        if (!d) throw Error("Dados indisponíveis.");
        return {
          comandas: d.comandas
            .filter((o) =>
              ["AGUARDANDO", "EM_LAVAGEM", "FINALIZADO"].includes(o.status),
            )
            .map((o) => ({
              numero: o.numero,
              status: o.status,
              placa: d.veiculos.find((v) => v.id === o.veiculoId)?.placa,
            })),
        };
      },
    });
    register({
      name: "start_order_creation",
      description:
        "Abre o formulário de nova comanda. Não cria nem salva uma comanda.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        empty.parse(input);
        if (
          !ref.current.store.user ||
          ref.current.store.user.role === "LAVADOR"
        )
          throw Error("Sem permissão.");
        ref.current.actions.newOrder();
        return { formularioAberto: true };
      },
    });
    return () => lifecycle.abort();
  }, []);
  return null;
}
