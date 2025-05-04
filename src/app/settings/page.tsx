'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Upload, KeyRound, ArrowLeft, BookOpenCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';


// Local storage key can still be used for display/reference, but the hardcoded key is used by Genkit
const API_KEY_STORAGE_KEY = 'google_genai_api_key';
// Display the currently hardcoded key for reference (masked for security)
const HARDCODED_API_KEY_DISPLAY = 'AIzaSyD...nhUYI'; // Masked version

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  // State now primarily for display or potential future overrides
  const [apiKeyInput, setApiKeyInput] = useState('');
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
    // Load saved API key from localStorage on mount for the input field (display only)
    if (typeof window !== 'undefined') {
        const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        setApiKeyInput(savedKey || ''); // Pre-fill input if a key was previously saved
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
     // Saving to localStorage is now less critical as the key is hardcoded
     // This function might be kept for future flexibility or removed.
     // For now, it just updates the localStorage value.
     if (!apiKeyInput.trim()) {
        toast({
           title: "Chave API Inválida",
           description: "Por favor, insira uma chave de API válida no campo (para referência).",
           variant: "destructive",
         });
         return;
     }
    setIsSavingKey(true);
    await new Promise(resolve => setTimeout(resolve, 500));

     if (typeof window !== 'undefined') {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput);
     }

    setIsSavingKey(false);
    toast({
      title: "Chave API Atualizada (Localmente)",
       description: "A chave no campo foi salva localmente para referência.", // Updated text
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
                Faça o upload do arquivo (.csv ou .xlsx) contendo os dados de disciplinas, anos, conteúdos e habilidades (funcionalidade simulada).
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
                {isUploading ? 'Enviando...' : 'Fazer Upload (Simulado)'}
              </Button>
            </CardContent>
          </Card>

           {/* Google GenAI API Key Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <KeyRound className="h-6 w-6 text-primary" />
                Chave de API Google GenAI (Gemini)
              </CardTitle>
               <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  {/* <AlertTitle>Atenção</AlertTitle> */}
                  <AlertDescription>
                     A chave de API está atualmente codificada diretamente em <code>src/ai/ai-instance.ts</code>. O campo abaixo é apenas para referência ou futuras modificações. A chave ativa é: <strong>{HARDCODED_API_KEY_DISPLAY}</strong>.
                  </AlertDescription>
                </Alert>
              <CardDescription className="pt-2">
                Para alterar a chave ativa, edite o arquivo <code>src/ai/ai-instance.ts</code>. Salvar aqui apenas atualiza o valor localmente para referência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKeyInput">Chave da API (Referência)</Label>
                <Input
                  id="apiKeyInput"
                  type="password" // Keep as password for masking
                  placeholder="Chave salva localmente (se houver)..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                   disabled={isSavingKey}
                />
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={isSavingKey}
                 className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                 {isSavingKey ? 'Salvando Localmente...' : 'Salvar Chave (Localmente)'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
