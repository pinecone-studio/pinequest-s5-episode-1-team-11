import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-12 w-52" />
      <Skeleton className="h-14 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((key) => (
          <Skeleton key={key} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
