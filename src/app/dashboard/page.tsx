
import { Suspense } from 'react';
import DashboardPageContent from './DashboardPageContent'; // Import the new client component
import DashboardLoadingSkeleton from './DashboardLoadingSkeleton'; // Import the skeleton component

// This remains a Server Component
export default function DashboardPage() {
  // It correctly wraps the Client Component (using useSearchParams) with Suspense
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
