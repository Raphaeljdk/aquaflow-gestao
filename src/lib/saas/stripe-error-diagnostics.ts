/** Safe, actionable Stripe API diagnostics.
 * Only provider status, parameter name, error code and request ID are reported.
 * Never log or return provider messages, request bodies, emails or API credentials.
 */
export function safeStripeDiagnostic(input:unknown):string|undefined {
 if(typeof input!=="string")return undefined;
 const value=input.trim();
 if(/(?:sk_(?:live|test)_|rk_(?:live|test)_|pk_(?:live|test)_|whsec_)/i.test(value))return undefined;
 return value.length<=120 && /^[a-zA-Z0-9_.\[\]/-]+$/.test(value) ? value : undefined;
}
export function stripeFailureDescription(status:number, code?:string, param?:string):string {
 const detail=param?` Parâmetro: ${param}.`:"";
 const reference=code?` Código Stripe: ${code}.`:"";
 if(status===401)return "A Stripe recusou a chave secreta configurada (HTTP 401). Revise a STRIPE_SECRET_KEY live na Vercel.";
 if(status===403)return "A Stripe negou permissão para criar o checkout (HTTP 403). Verifique as permissões da chave e as restrições da conta.";
 if(status===400||status===422)return `A Stripe rejeitou os dados do checkout (HTTP ${status}).${detail}${reference} Confira Workbench → Logs da API na Stripe.`;
 if(status===429)return "A Stripe limitou temporariamente as requisições (HTTP 429). Tente novamente mais tarde.";
 if(status>=500)return `O serviço da Stripe está indisponível no momento (HTTP ${status}). Nenhum pagamento foi iniciado.`;
 return `A Stripe não conseguiu criar o checkout (HTTP ${status}). Consulte Workbench → Logs da API.`;
}
