
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
    <div className="flex grow items-center justify-center bg-secondary p-4 lg:p-8"> {/* Use secondary background */}
       <div className="w-full max-w-md">
         {/* Logo Section */}
         <div className="flex justify-center mb-8">
            <Image
               src="https://i.imgur.com/uo4OdVQ.png" // Logo URL
               width={136} // Original size
               height={136} // Original size
               alt="Redocência Logo"
               priority
             />
         </div>

         {/* Card Section */}
         <Card className="shadow-xl border-none rounded-lg overflow-hidden"> {/* Enhanced card styling */}
            <CardHeader className="bg-card p-6"> {/* Header background */}
               <CardTitle className="text-2xl font-bold text-center text-card-foreground flex items-center justify-center gap-2">
                  <LogIn className="h-6 w-6" /> {/* Add Login Icon */}
                  Bem-vindo(a) de volta!
                </CardTitle>
               <CardDescription className="text-center pt-1 text-muted-foreground">
                   Acesse sua conta para continuar
               </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 bg-background"> {/* Content background */}
             <form onSubmit={handleLogin} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="username">Usuário</Label>
                 <Input
                   id="username"
                   type="text"
                   placeholder="Seu nome de usuário"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   required
                   disabled={isLoading}
                   className="text-base" // Ensure text size consistency
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="password">Senha</Label>
                 <Input
                   id="password"
                   type="password"
                   placeholder="Sua senha"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   required
                   disabled={isLoading}
                   className="text-base" // Ensure text size consistency
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
            <CardFooter className="flex justify-center text-sm p-4 bg-muted/50"> {/* Footer background */}
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
