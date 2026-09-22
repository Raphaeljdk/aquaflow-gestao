import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
