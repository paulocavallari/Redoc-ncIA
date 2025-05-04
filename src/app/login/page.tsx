
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image'; // Import next/image
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
       toast({
         title: "Erro de Login",
         description: "Por favor, preencha o usuário e a senha.",
         variant: "destructive",
       });
      return;
    }

    const success = await login(username, password);
    if (success) {
      router.push('/dashboard'); // Redirect to dashboard on successful login
    } else {
      toast({
        title: "Erro de Login",
        description: "Usuário ou senha inválidos.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-secondary p-4 lg:p-8 min-h-0"> {/* Ensure flex item respects parent height */}
       <div className="w-full max-w-md">
         {/* Logo Section */}
         <div className="flex justify-center mb-8">
            <Image
               src="https://i.imgur.com/uo4OdVQ.png" // Logo URL
               width={231} // Increased width by 70% (136 * 1.7 = 231.2 -> 231)
               height={231} // Increased height by 70% (136 * 1.7 = 231.2 -> 231)
               alt="Redocência Logo"
               priority
             />
         </div>

         {/* Card Section */}
         <Card className="shadow-xl border-none rounded-lg overflow-hidden bg-card"> {/* Enhanced card styling */}
            <CardHeader className="p-6"> {/* Consistent padding */}
               <CardTitle className="text-2xl font-bold text-center text-card-foreground flex items-center justify-center gap-2">
                  <LogIn className="h-6 w-6" /> {/* Add Login Icon */}
                  Bem-vindo(a) de volta!
                </CardTitle>
               <CardDescription className="text-center pt-1 text-muted-foreground">
                   Acesse sua conta para continuar
               </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6"> {/* Consistent padding */}
             <form onSubmit={handleLogin} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="username" className="text-card-foreground">Usuário</Label>
                 <Input
                   id="username"
                   type="text"
                   placeholder="Seu nome de usuário"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   required
                   disabled={isLoading}
                   className="text-base bg-background border-border text-foreground" // Ensure text size consistency and colors
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="password" className="text-card-foreground">Senha</Label>
                 <Input
                   id="password"
                   type="password"
                   placeholder="Sua senha"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                   disabled={isLoading}
                   className="text-base bg-background border-border text-foreground" // Ensure text size consistency and colors
                 />
                 {/* Optional: Add Forgot Password link here */}
                 {/* <div className="text-right">
                   <Link href="/forgot-password"
                     className="text-sm text-primary hover:underline font-medium"
                   >
                     Esqueceu a senha?
                   </Link>
                 </div> */}
               </div>
               <Button type="submit" className="w-full text-base py-3 bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={isLoading}>
                 {isLoading ? 'Entrando...' : 'Entrar'}
               </Button>
             </form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm p-4 bg-card border-t border-border"> {/* Footer background and border */}
             <p className="text-muted-foreground">
               Não tem uma conta?{' '}
               <Link href="/register" className="text-primary hover:underline font-semibold">
                 Cadastre-se
               </Link>
             </p>
            </CardFooter>
         </Card>
       </div>
    </div>
  );
}
