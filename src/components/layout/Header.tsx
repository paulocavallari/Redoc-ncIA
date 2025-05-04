
'use client';

import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, List, ArrowLeft } from 'lucide-react';
import Image from 'next/image'; // Import next/image

export default function Header() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false); // State to track client-side mount

  useEffect(() => {
    setIsClient(true); // Set to true only on the client after mounting
  }, []);

  // Define pages where the header should not be shown or should be minimal
  const noHeaderPages = ['/login', '/register'];
  const minimalHeaderPages = ['/']; // Add any pages needing only the title

  // Determine visibility based on client-side state and pathname
  const showFullHeader = isClient && !minimalHeaderPages.includes(pathname) && !noHeaderPages.includes(pathname);
  const showBackButton = isClient && ['/settings', '/saved-plans'].includes(pathname);

  const handleBack = () => {
      router.back(); // Go back to the previous page
  };

  // Render a consistent header structure for SSR to avoid hydration mismatch
  // Content visibility will be handled client-side.
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Back button placeholder (conditionally rendered client-side) */}
        {showBackButton && isClient && (
             <Button variant="outline" size="icon" onClick={handleBack} aria-label="Voltar">
               <ArrowLeft className="h-5 w-5" />
             </Button>
        )}
        {/* Logo */}
        <Link href={isClient && user ? "/dashboard" : "/login"} className="flex items-center gap-2" aria-label="Página Inicial">
           <Image
              src="https://i.imgur.com/uo4OdVQ.png" // Use the Imgur logo path
              width={150} // Adjust width as needed
              height={40} // Adjust height as needed (maintain aspect ratio)
              alt="Redocência Logo"
              priority // Prioritize loading the logo
            />
        </Link>
      </div>

      {/* Right side content */}
      <div className="flex items-center gap-4">
        {/* Conditional rendering based on client-side state */}
        {isClient && showFullHeader ? (
          authLoading ? (
            <>
              <Skeleton className="h-5 w-24 hidden sm:inline" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </>
          ) : user ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, {user.name}!
              </span>
               <Link href="/saved-plans" passHref>
                 <Button variant="ghost" size="icon" aria-label="Planos Salvos">
                   <List className="h-5 w-5" />
                 </Button>
               </Link>
              {user.username === 'admin' && (
                <Link href="/settings" passHref>
                  <Button variant="ghost" size="icon" aria-label="Configurações">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
             <>
              <Link href="/login" passHref>
                 <Button variant="outline" size="sm">Entrar</Button>
               </Link>
               <Link href="/register" passHref>
                 <Button variant="default" size="sm">Cadastrar</Button>
               </Link>
             </>
          )
        ) : isClient && !showFullHeader ? (
            // Render login/register buttons on login/register pages if needed
            // Or render nothing if it's a minimal header page
            !noHeaderPages.includes(pathname) ? (
                <>
                 <Link href="/login" passHref>
                    <Button variant="outline" size="sm">Entrar</Button>
                  </Link>
                  <Link href="/register" passHref>
                    <Button variant="default" size="sm">Cadastrar</Button>
                  </Link>
                </>
            ) : null
        ) : (
          // SSR/Loading Skeleton for the right side
          <>
            <Skeleton className="h-5 w-24 hidden sm:inline" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </>
        )}
      </div>
    </header>
  );
}

