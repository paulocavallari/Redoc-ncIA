
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

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { register, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !username || !password || !confirmPassword) {
      toast({
        title: "Erro de Cadastro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
       toast({
         title: "Erro de Cadastro",
         description: "As senhas não coincidem.",
         variant: "destructive",
       });
      return;
    }

    const success = await register(name, email, username, password);
    if (success) {
       toast({
         title: "Cadastro Realizado",
         description: "Sua conta foi criada com sucesso! Faça o login.",
         variant: "default", // Use default variant for success
       });
      router.push('/login'); // Redirect to login page after successful registration
    } else {
      toast({
        title: "Erro de Cadastro",
        description: "Não foi possível criar a conta. O nome de usuário pode já existir.",
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
                src="https://i.imgur.com/uo4OdVQ.png" // Use the new logo URL
                width={136} // Increased width by 70% (80 * 1.7)
                height={136} // Increased height by 70% (80 * 1.7)
                alt="Redocência Logo"
                priority
              />
           </div>
           <CardDescription>Crie sua conta para começar</CardDescription>
         </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Escolha um nome de usuário"
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
                placeholder="Crie uma senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              {isLoading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Faça Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
