import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter font for better readability
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/layout/Header'; // Import the new Header component
import { Suspense } from 'react'; // Import Suspense for client components using hooks

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Aula IA', // Updated App Name
  description: 'Planejamento de aulas assistido por IA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Set language to Brazilian Portuguese
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
           {/* Suspense is needed because Header uses hooks like usePathname */}
           <Suspense fallback={<div>Loading Header...</div>}>
            <Header />
           </Suspense>
          <main className="flex-1">{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
