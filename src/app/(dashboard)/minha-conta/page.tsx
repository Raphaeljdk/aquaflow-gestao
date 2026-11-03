import {ChangePasswordCard} from "@/components/change-password-card";
import Link from "next/link";
export default function MinhaConta(){
 return <div className="max-w-3xl space-y-3">
   <h1 className="text-2xl font-bold">Minha conta</h1>
   <p className="text-sm text-muted-foreground">Gerencie a segurança do seu acesso à Ducha Elitte.</p>
   <ChangePasswordCard/>
   <p className="text-sm text-muted-foreground">Não lembra a senha atual? <Link href="/recuperar-acesso" className="font-semibold text-primary underline">Recuperar por e-mail</Link></p>
 </div>;
}
