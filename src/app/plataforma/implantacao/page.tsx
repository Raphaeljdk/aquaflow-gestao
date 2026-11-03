import {redirect} from "next/navigation";
import {requirePlatformAdmin} from "@/lib/platform-admin";
import {ImplantacaoProgress} from "@/components/implantacao-progress";
export const dynamic="force-dynamic";
export default async function ImplantacaoPage({searchParams}:{searchParams:Promise<{solicitacao?:string;iniciar?:string}>}){
 try{await requirePlatformAdmin()}catch{redirect("/login")}
 const p=await searchParams;
 if(!p.solicitacao||!/^[a-zA-Z0-9_-]{12,80}$/.test(p.solicitacao))redirect("/plataforma");
 return <ImplantacaoProgress requestId={p.solicitacao} autoStart={p.iniciar==="1"}/>;
}