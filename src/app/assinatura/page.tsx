import Link from "next/link";
import {CreditCard,Clock3,ShieldCheck} from "lucide-react";
export const dynamic="force-dynamic";
export default function AssinaturaPage(){
 const offers=[
  {name:"Mensal",value:"R$ 80 / mês",detail:"Cartão de crédito recorrente pela Stripe, após contratação."},
  {name:"Anual",value:"R$ 960 / ano",detail:"Contrato anual: 12 cobranças de R$ 80 no cartão de crédito."},
  {name:"Anual à vista",value:"R$ 790",detail:"Pix (se a Stripe liberar na conta) ou cartão de crédito em 1x."},
 ];
 return <main className="min-h-dvh bg-background px-4 py-12 text-foreground">
  <div className="mx-auto max-w-4xl space-y-8">
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm font-bold text-primary"><ShieldCheck size={18}/> Ducha Elitte</p>
      <h1 className="text-3xl font-black sm:text-4xl">Continuar usando seu lava-rápido</h1>
      <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
        Seu teste ou assinatura pode ter vencido. Seus clientes, comandas e registros não são apagados.
        Para continuar, solicite a regularização da licença. Não efetuamos nenhuma cobrança sem autorização e confirmação do pagamento pela Stripe.
      </p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
    {offers.map(offer=><article key={offer.name} className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="text-base font-bold">{offer.name}</h2>
      <p className="text-2xl font-black">{offer.value}</p>
      <p className="text-sm leading-6 text-muted-foreground">{offer.detail}</p>
    </article>)}</div>
    <div className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Clock3 size={19}/> Como reativar?</h2>
      <p className="text-sm leading-6 text-muted-foreground">A integração Stripe ainda está em homologação. Entre em contato com a administração da plataforma, informando o nome do seu estabelecimento. O acesso será liberado somente após a confirmação do pagamento, sem apagar seu histórico.</p>
      <div className="flex flex-wrap gap-3">
        <a href="mailto:plataforma@duchaelitte.com.br?subject=Regularizacao%20de%20assinatura%20Ducha%20Elitte"
           className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">
           <CreditCard size={17}/> Solicitar regularização
        </a>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl border px-5 py-2 text-sm font-semibold">Voltar ao login</Link>
      </div>
    </div>
  </div>
 </main>;
}
