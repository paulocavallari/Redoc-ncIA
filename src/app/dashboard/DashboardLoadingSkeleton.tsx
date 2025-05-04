
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function DashboardLoadingSkeleton() {
    return (
      <div className="flex min-h-screen flex-col bg-secondary">
         <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
             <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8" /> {/* Placeholder for potential back button */}
                 <Skeleton className="h-10 w-28" /> {/* Placeholder for Logo */}
             </div>
             <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-24 hidden sm:inline" />
                <Skeleton className="h-8 w-8 rounded-full" /> {/* Saved Plans Icon */}
                <Skeleton className="h-8 w-8 rounded-full" /> {/* Settings Icon */}
                <Skeleton className="h-8 w-8 rounded-full" /> {/* Logout Icon */}
             </div>
         </header>
         <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="shadow-md"> <CardHeader> <Skeleton className="h-7 w-48 mb-1" /> <Skeleton className="h-4 w-64" /> </CardHeader> <CardContent className="space-y-4"> {[...Array(9)].map((_, i) => ( <div key={i} className="space-y-2"> <Skeleton className="h-4 w-1/4" /> <Skeleton className={`h-${i === 5 ? 12 : i === 7 ? 20 : 10} w-full`} /> </div> ))} <Skeleton className="h-10 w-full mt-4" /> </CardContent> </Card>
           <Card className="shadow-md flex flex-col"> <CardHeader> <Skeleton className="h-7 w-40 mb-1" /> <Skeleton className="h-4 w-56" /> </CardHeader> <CardContent className="flex-1 overflow-hidden"> <div className="space-y-4"> <Skeleton className="h-4 w-3/4" /> <Skeleton className="h-4 w-1/2" /> <Skeleton className="h-20 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-5/6" /> <Skeleton className="h-4 w-full mt-6 pt-4 border-t" /> <Skeleton className="h-4 w-3/4" /> </div> </CardContent> </Card>
         </main>
      </div>
     );
}
