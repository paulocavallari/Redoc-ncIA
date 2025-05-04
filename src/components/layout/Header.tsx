'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, List, ArrowLeft } from 'lucide-react';

export default function Header() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Define pages where the header should not be shown or should be minimal
  const noHeaderPages = ['/login', '/register'];
  const minimalHeaderPages = ['/']; // Add any pages needing only the title

  if (noHeaderPages.includes(pathname) || (authLoading && !user && !minimalHeaderPages.includes(pathname))) {
    // Don't render header on specified pages or while loading and not logged in (except for minimal pages)
    return null;
  }

  const showFullHeader = !minimalHeaderPages.includes(pathname);
  const showBackButton = ['/settings', '/saved-plans'].includes(pathname);

  const handleBack = () => {
      router.back(); // Go back to the previous page
  };


  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {showBackButton && (
             <Button variant="outline" size="icon" onClick={handleBack} aria-label="Voltar">
               <ArrowLeft className="h-5 w-5" />
             </Button>
        )}
        <Link href={user ? "/dashboard" : "/login"} className="flex items-center gap-2" aria-label="Página Inicial">
          <BookOpenCheck className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-semibold text-primary">redocêncIA</h1>
        </Link>
      </div>

      {showFullHeader && (
        <div className="flex items-center gap-4">
          {authLoading ? (
            <>
              <Skeleton className="h-5 w-24 hidden sm:inline" />
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
            // Optional: Add login/register buttons if user is not logged in and header is shown
             <>
              <Link href="/login" passHref>
                 <Button variant="outline" size="sm">Entrar</Button>
               </Link>
               <Link href="/register" passHref>
                 <Button variant="default" size="sm">Cadastrar</Button>
               </Link>
             </>
          )}
        </div>
      )}
    </header>
  );
}
