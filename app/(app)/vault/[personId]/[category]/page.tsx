import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeleton";
import FolderView from "./view";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FolderView />
    </Suspense>
  );
}
