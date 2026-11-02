/** Calendar-month calculation with end-of-month clamp; twelve monthly invoices, no thirteenth. */
export function twelfthCycleEnd(anchorSeconds:number):number {
 if(!Number.isSafeInteger(anchorSeconds)||anchorSeconds<1)throw new Error("Ciclo de cobrança inválido.");
 const anchor=new Date(anchorSeconds*1000);
 const month=anchor.getUTCMonth()+12;
 const lastDay=new Date(Date.UTC(anchor.getUTCFullYear(),month+1,0)).getUTCDate();
 const target=Date.UTC(anchor.getUTCFullYear(),month,Math.min(anchor.getUTCDate(),lastDay),
  anchor.getUTCHours(),anchor.getUTCMinutes(),anchor.getUTCSeconds());
 return Math.floor(target/1000);
}
