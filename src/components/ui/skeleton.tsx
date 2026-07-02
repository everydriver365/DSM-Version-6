import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("cf-skeleton", className)} {...props}>
      <div className="cf-skeleton-shine" />
    </div>
  );
}

export { Skeleton };
