/** Normaliza números brasileiros, mantendo somente dígitos para wa.me. */
export function normalizeWhatsappPhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(digits)) return digits;
  if (/^\d{10,11}$/.test(digits)) return "55" + digits;
  return null;
}

/** Monta um link de WhatsApp seguro e codificado, sem criar agendamento automático. */
export function whatsappLink(phone: string | null | undefined, message: string): string | null {
  const digits = normalizeWhatsappPhone(phone);
  return digits ? "https://wa.me/" + digits + "?text=" + encodeURIComponent(message) : null;
}
