import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
export const TZ = "America/Sao_Paulo";
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export const dateLabel = (s: string | Date, pattern = "dd MMM, HH:mm") =>
  formatInTimeZone(new Date(s), TZ, pattern, { locale: ptBR });
export const dayKey = (d: string | Date) => dateLabel(d, "yyyy-MM-dd");
export const fromLocal = (s: string) => fromZonedTime(s, TZ).toISOString();
export const initials = (s: string) =>
  s
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export const cents = (n: number) => Math.round(n * 100);
export const decimal = (n: number) => Math.round(n) / 100;
