
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
    <div className="flex flex-1 items-center justify-center bg-secondary p-4"> {/* Changed min-h-screen to flex-1 */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4"> {/* Added space-y-4 */}
           {/* Add the logo here */}
           <div className="flex justify-center">
              <Image
                src="https://i.imgur.com/m4Wcex5.png" // Updated logo URL
                width={80} // Adjust width as needed for login page
                height={80} // Adjust height as needed for login page
                alt="Redocência Logo"
                priority
              />
           </div>
          <CardDescription>Entre para planejar suas aulas com IA</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
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
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Cadastre-se
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

