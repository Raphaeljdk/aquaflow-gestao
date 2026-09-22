"use client";
import {
  Search,
  Plus,
  ChevronDown,
  Inbox,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { statusLabels, type Status } from "@/types";
import { cn } from "@/lib/utils";
export function PageTitle({
  title,
  description,
  action,
  actionLabel = "Adicionar",
  children,
}: {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {children}
        {action && (
          <Button
            onClick={action}
            className="h-11 gap-2 rounded-lg px-4 font-medium shadow-sm shadow-primary/10"
          >
            <Plus size={17} />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap rounded-md border-0 px-2.5 py-1 text-xs font-medium",
        status === "AGUARDANDO"
          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          : status === "EM_LAVAGEM"
            ? "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
            : status === "FINALIZADO"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : status === "CANCELADO"
                ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
                : "bg-muted text-muted-foreground",
      )}
    >
      <span className="mr-1 size-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </Badge>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-0">
      <Search
        size={16}
        className="absolute left-3 top-3 text-muted-foreground"
      />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg bg-card pl-9 text-sm shadow-none"
      />
    </div>
  );
}
export function Choice({
  value,
  onChange,
  options,
  placeholder = "Selecione",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={placeholder}
        className="h-10! w-full rounded-lg bg-card shadow-none"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Picker({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label={placeholder}
          aria-expanded={open}
          className="h-10 w-full justify-between overflow-hidden rounded-lg font-normal shadow-none"
        >
          <span className="truncate">
            {options.find((o) => o.value === value)?.label ?? placeholder}
          </span>
          <ChevronsUpDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,85vw)] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Nenhum registro encontrado.</CommandEmpty>
            {options.map((o) => (
              <CommandItem
                key={o.value}
                value={o.label}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "size-4",
                    o.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {o.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
export function Empty({
  title = "Nenhum registro encontrado",
  text = "Tente outra busca ou adicione um novo registro.",
  action,
}: {
  title?: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-4 rounded-2xl bg-muted p-4">
        <Inbox className="text-muted-foreground" size={25} />
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  const colors = [
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    "bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
  ];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        colors[index % 3],
      )}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function PanelHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
