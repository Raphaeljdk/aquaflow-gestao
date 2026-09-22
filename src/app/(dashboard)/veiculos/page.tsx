import { Suspense } from "react";
import { EntityPage } from "@/components/entities";
export default function Page() {
  return (
    <Suspense fallback={<p>Carregando...</p>}>
      <EntityPage kind="veiculos" />
    </Suspense>
  );
}
