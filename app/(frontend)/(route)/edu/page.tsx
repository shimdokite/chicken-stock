import { Suspense } from "react";
import EduContent from "../../components/edu/edu-content";
import EduPageFallback from "../../components/edu/edu-page-fallback";

export default function Edu() {
  return (
    <Suspense fallback={<EduPageFallback />}>
      <EduContent />
    </Suspense>
  );
}
