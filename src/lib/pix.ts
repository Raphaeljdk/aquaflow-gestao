function tlv(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value;
}

function clean(value: string, max: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixPayload({
  chave,
  valor,
  nome,
  cidade = "SAO PAULO",
  txid,
}: {
  chave: string;
  valor: number;
  nome: string;
  cidade?: string;
  txid: string;
}) {
  const key = chave.trim();
  if (!key) return "";
  const merchantAccount = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key);
  const additional = tlv("05", clean(txid || "***", 25) || "***");
  let payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (valor > 0 ? tlv("54", valor.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", clean(nome || "DUCHA ELITTE", 25) || "DUCHA ELITTE") +
    tlv("60", clean(cidade, 15) || "SAO PAULO") +
    tlv("62", additional) +
    "6304";
  return payload + crc16(payload);
}
