import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-12 w-full max-w-xl rounded-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
