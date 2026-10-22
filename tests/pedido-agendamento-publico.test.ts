import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pedidoPublicoSchema, horarioPermitido, horarioPedido } from "../src/lib/pedido-agendamento";

const pedido={
  nome:"Ana Lima",telefone:"(11) 99999-9999",tipo:"MOTO" as const,
  placa:"ABC1D23",descricaoVeiculo:"CG 160 azul",
  servicoId:"serv-ativo",data:"2026-12-01",horario:"10:00",
  observacoes:"",aceitePrivacidade:true as const,
};
const config={diasSemana:[1,2,3,4,5,6],abertura:"08:00",fechamento:"18:00",intervaloMin:30};
test("cadastro online aceita moto e carro, mas exige placa, WhatsApp e consentimento",()=>{
  assert.equal(pedidoPublicoSchema.safeParse(pedido).success,true);
  assert.equal(pedidoPublicoSchema.safeParse({...pedido,tipo:"CARRO"}).success,true);
  assert.equal(pedidoPublicoSchema.safeParse({...pedido,placa:"ABC"}).success,false);
  assert.equal(pedidoPublicoSchema.safeParse({...pedido,telefone:"1234"}).success,false);
  assert.equal(pedidoPublicoSchema.safeParse({...pedido,aceitePrivacidade:false}).success,false);
});
test("horário respeita dias, expediente, intervalos e duração do serviço",()=>{
  const when=horarioPedido("2026-12-01","10:00");
  const now=new Date("2026-11-30T12:00:00.000Z");
  assert.equal(horarioPermitido(config,when,60,now),true);
  assert.equal(horarioPermitido(config,horarioPedido("2026-12-01","17:30"),60,now),false);
  assert.equal(horarioPermitido(config,horarioPedido("2026-12-01","10:15"),30,now),false);
  assert.equal(horarioPermitido(config,horarioPedido("2026-12-06","10:00"),30,now),false);
});
test("pedido online é pendente; somente acesso autenticado pode confirmar e gerar agendamento",()=>{
  const src=readFileSync("src/app/api/public/empresa/agendamentos/route.ts","utf8");
  const admin=readFileSync("src/app/api/pedidos-agendamento/[id]/route.ts","utf8");
  const inbox=readFileSync("src/components/public-booking-requests.tsx","utf8");
  assert.match(src,/pedidoAgendamentoPublico\.create/);
  assert.match(readFileSync("src/lib/pedido-agendamento.ts","utf8"),/aceitePrivacidade: z\.literal\(true\)/);
  assert.match(src,/limite|count>=3/i);
  assert.match(admin,/currentUser/);
  assert.match(admin,/checkOrigin/);
  assert.match(admin,/pg_advisory_xact_lock/);
  assert.match(admin,/status:"AGENDADO"/);
  assert.match(admin,/status:"CONFIRMADO"/);
  assert.match(inbox,/Confirmar na agenda/);
});
