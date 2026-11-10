import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import DocView from "./view";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocView />
    </Suspense>
  );
}
