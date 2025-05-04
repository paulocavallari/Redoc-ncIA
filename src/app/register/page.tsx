
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
import { UserPlus } from 'lucide-react'; // Import UserPlus icon

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
     if (password.length < 6) { // Basic password length validation
        toast({
            title: "Erro de Cadastro",
            description: "A senha deve ter pelo menos 6 caracteres.",
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
        description: "Não foi possível criar a conta. O nome de usuário ou email pode já existir.",
        variant: "destructive",
        duration: 7000,
      });
    }
  };

  return (
     <div className="flex flex-1 flex-col items-center justify-center bg-secondary p-4 lg:p-8"> {/* Use flex-1 and flex-col */}
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
                        <UserPlus className="h-6 w-6" /> {/* Add UserPlus Icon */}
                        Criar Nova Conta
                    </CardTitle>
                    <CardDescription className="text-center pt-1 text-muted-foreground">
                        Preencha os campos abaixo para se registrar
                    </CardDescription>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6"> {/* Consistent padding */}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-card-foreground">Nome Completo</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isLoading}
                        className="text-base bg-background border-border text-foreground" // Ensure text size consistency and colors
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-card-foreground">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        className="text-base bg-background border-border text-foreground" // Ensure text size consistency and colors
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-card-foreground">Usuário</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Escolha um nome de usuário"
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
                        placeholder="Crie uma senha (mín. 6 caracteres)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={isLoading}
                        className="text-base bg-background border-border text-foreground" // Ensure text size consistency and colors
                      />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-card-foreground">Confirmar Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirme sua senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={isLoading}
                        className="text-base bg-background border-border text-foreground" // Ensure text size consistency and colors
                      />
                    </div>
                    <Button type="submit" className="w-full text-base py-3 bg-primary hover:bg-primary/90 text-primary-foreground mt-4" disabled={isLoading}>
                      {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                    </Button>
                  </form>
                 </CardContent>
                 <CardFooter className="flex justify-center text-sm p-4 bg-card border-t border-border"> {/* Footer background and border */}
                  <p className="text-muted-foreground">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-primary hover:underline font-semibold">
                      Faça Login
                    </Link>
                  </p>
                 </CardFooter>
             </Card>
        </div>
     </div>
  );
}
