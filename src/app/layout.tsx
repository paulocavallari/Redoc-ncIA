import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter font for better readability
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

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
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
