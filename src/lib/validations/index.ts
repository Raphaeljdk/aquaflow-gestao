import { z } from "zod";
const text = z.string().trim();
const id = text.min(1, "Selecione uma opção.");
const email = text.email("E-mail inválido.").or(z.literal("")).default("");
export const clienteSchema = z.object({
  nome: text.min(2, "Informe o nome completo.").max(120),
  telefone: text
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().min(10, "Telefone deve ter DDD.").max(13)),
  email,
  cpfCnpj: text
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => !v || v.length === 11 || v.length === 14,
      "Informe 11 ou 14 dígitos.",
    )
    .default(""),
  endereco: text.max(300).default(""),
});
export const veiculoSchema = z.object({
  clienteId: id,
  placa: text
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/,
          "Placa inválida. Use ABC1D23 ou ABC1234.",
        ),
    ),
  marca: text.min(2),
  modelo: text.min(1),
  cor: text.min(2),
  ano: z.coerce
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 1),
  tipo: z.enum(["CARRO", "MOTO", "CAMINHONETE"]),
});
export const servicoSchema = z.object({
  nome: text.min(3).max(100),
  descricao: text.max(500).default(""),
  preco: z.coerce
    .number()
    .positive("Informe um valor maior que zero.")
    .max(100000),
  duracaoMin: z.coerce.number().int().min(15).max(600),
  ativo: z.boolean().default(true),
});
export const funcionarioSchema = z
  .object({
    nome: text.min(3).max(120),
    email,
    cargo: z.enum(["ADMIN", "GERENTE", "ATENDENTE", "LAVADOR"]),
    comissao: z.coerce.number().min(0).max(100),
    ativo: z.boolean().default(true),
    password: z
      .string()
      .min(10, "A senha deve ter ao menos 10 caracteres.")
      .max(128)
      .or(z.literal(""))
      .optional(),
  })
  .refine((v) => !v.password || !!v.email, {
    path: ["email"],
    message: "Informe o e-mail para criar o acesso.",
  });
export const comandaSchema = z.object({
  clienteId: id,
  veiculoId: id,
  servicoIds: z.array(id).min(1, "Selecione ao menos um serviço.").max(20),
  quantidades: z.record(z.coerce.number().int().min(1).max(20)).optional(),
  funcionarioId: text.nullable().optional(),
  desconto: z.coerce.number().min(0).max(100000).default(0),
  formaPagamento: z
    .enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO"])
    .nullable()
    .optional(),
  observacoes: text.max(1000).default(""),
});
export const statusSchema = z.object({
  status: z.enum([
    "AGUARDANDO",
    "EM_LAVAGEM",
    "FINALIZADO",
    "ENTREGUE",
    "CANCELADO",
  ]),
  formaPagamento: z
    .enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO"])
    .nullable()
    .optional(),
  funcionarioId: text.nullable().optional(),
});
export const agendamentoSchema = z.object({
  clienteId: id,
  veiculoId: id,
  dataHora: z.string().datetime({ offset: true }),
  servicoIds: z.array(id).min(1, "Selecione um serviço.").max(20),
  observacoes: text.max(1000).default(""),
});
const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const configuracaoSchema = z
  .object({
    nome: text.min(2).max(120),
    cnpj: text.max(18),
    endereco: text.max(300),
    telefone: text.max(30),
    logo: text
      .max(500000)
      .refine(
        (v) => !v || /^data:image\/(png|jpeg|webp);base64,/.test(v),
        "Envie PNG, JPG ou WebP.",
      ),
    abertura: hour,
    fechamento: hour,
    intervaloMin: z.coerce.number().int().min(15).max(120),
    diasSemana: z.array(z.number().int().min(0).max(6)).min(1),
    timezone: z.literal("America/Sao_Paulo"),
  })
  .refine((v) => v.abertura < v.fechamento, {
    message: "Fechamento deve ser após a abertura.",
    path: ["fechamento"],
  });
export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(128),
});
export const materialSchema = z.object({
  nome: text.min(2, "Informe o nome do material.").max(120),
  unidade: z.enum(["un", "L", "ml", "kg", "g"]),
  minimo: z.coerce.number().min(0).max(1000000),
  custoUnitario: z.coerce.number().min(0).max(1000000),
  ativo: z.boolean().default(true),
});
export const movimentoEstoqueSchema = z.object({
  materialId: id,
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  quantidade: z.coerce.number().positive("Informe uma quantidade maior que zero.").max(1000000),
  observacao: text.max(300).default(""),
});
