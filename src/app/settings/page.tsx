'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Upload, KeyRound, ArrowLeft, BookOpenCheck } from 'lucide-react';
import Link from 'next/link';

const API_KEY_STORAGE_KEY = 'openai_api_key'; // Separate key for API key

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  useEffect(() => {
    // Redirect non-admin users or if not logged in
    if (!authLoading && (!user || user.username !== 'admin')) {
      router.push('/dashboard'); // Redirect non-admins to dashboard
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Load saved API key from localStorage on mount (client-side only)
    if (typeof window !== 'undefined') {
        const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (savedKey) {
          setApiKey(savedKey);
        }
    }
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      // Basic validation (optional: check file type, size)
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
         setSelectedFile(file);
      } else {
          toast({
              title: "Arquivo Inválido",
              description: "Por favor, selecione um arquivo .csv ou .xlsx.",
              variant: "destructive",
          });
          event.target.value = ''; // Clear the input
          setSelectedFile(null);
      }

    } else {
        setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Nenhum Arquivo Selecionado",
        description: "Por favor, selecione um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    // Simulate upload process
    console.log("Simulating upload of:", selectedFile.name);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

    // In a real app, you would process the file here (e.g., send to backend, parse data)
    // For now, just show a success message

    setIsUploading(false);
    setSelectedFile(null); // Clear selection after simulated upload
    // Clear the file input visually
    const fileInput = document.getElementById('escopoFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';

    toast({
      title: "Upload Simulado",
      description: `Arquivo "${selectedFile.name}" recebido e dados "atualizados" (simulação).`,
    });
     // Potentially trigger a data refresh in the dashboard if needed
  };

  const handleSaveApiKey = async () => {
     if (!apiKey.trim()) {
        toast({
           title: "Chave API Inválida",
           description: "Por favor, insira uma chave de API válida.",
           variant: "destructive",
         });
         return;
     }
    setIsSavingKey(true);
    // Simulate saving process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Save to localStorage (client-side only)
     if (typeof window !== 'undefined') {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
     }


    setIsSavingKey(false);
    toast({
      title: "Chave API Salva",
      description: "A chave da API OpenAI foi salva com sucesso (simulação).",
    });
  };

  // Render loading or nothing if auth check is happening or user is not admin
  if (authLoading || !user || user.username !== 'admin') {
    return (
        <div className="flex min-h-screen items-center justify-center">
            {/* Optional: Add a loading indicator */}
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
         {/* Header */}
       <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
         <div className="flex items-center gap-4">
           <Link href="/dashboard" passHref>
             <Button variant="outline" size="icon" aria-label="Voltar para Dashboard">
               <ArrowLeft className="h-5 w-5" />
             </Button>
           </Link>
            <div className="flex items-center gap-2">
               <BookOpenCheck className="h-7 w-7 text-primary" />
               <h1 className="text-xl font-semibold text-primary">redocêncIA - Configurações</h1>
            </div>
         </div>
         {/* Optional: Add logout or other header items if needed */}
       </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-6">
          {/* Upload Escopo-Sequência Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Upload className="h-6 w-6 text-primary" />
                Upload do Escopo-Sequência
              </CardTitle>
              <CardDescription>
                Faça o upload do arquivo (.csv ou .xlsx) contendo os dados de disciplinas, anos, conteúdos e habilidades.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="escopoFile">Selecionar Arquivo</Label>
                <Input
                  id="escopoFile"
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" // Accept CSV and Excel types
                  onChange={handleFileChange}
                  disabled={isUploading}
                   className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                 {selectedFile && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {selectedFile.name}</p>}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isUploading ? 'Enviando...' : 'Fazer Upload'}
              </Button>
            </CardContent>
          </Card>

          {/* API Key Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <KeyRound className="h-6 w-6 text-primary" />
                Chave de API OpenAI
              </CardTitle>
              <CardDescription>
                Insira ou modifique sua chave de API da OpenAI para habilitar a geração de planos de aula.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Chave da API</Label>
                <Input
                  id="apiKey"
                  type="password" // Use password type to mask the key
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                   disabled={isSavingKey}
                />
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={isSavingKey}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90" // Use accent color for save
              >
                 {isSavingKey ? 'Salvando...' : 'Salvar Chave'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
