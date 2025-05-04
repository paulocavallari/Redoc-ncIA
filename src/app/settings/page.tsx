
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Upload, KeyRound, ArrowLeft, BookOpenCheck, AlertTriangle, GraduationCap } from 'lucide-react'; // Added GraduationCap
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { processEscopoFile, saveEscopoDataToStorage, EscopoSequenciaItem, EducationLevel, EDUCATION_LEVELS } from '@/services/escopo-sequencia'; // Import EducationLevel related items
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components


// Local storage key can still be used for display/reference, but the hardcoded key is used by Genkit
const API_KEY_STORAGE_KEY = 'google_genai_api_key';
// Display the currently hardcoded key for reference (masked for security)
const HARDCODED_API_KEY_DISPLAY = 'AIzaSyD...nhUYI'; // Masked version

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | ''>(''); // State for selected education level
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
      // Allow only .xlsx files
      if (file.name.endsWith('.xlsx')) {
         setSelectedFile(file);
      } else {
          toast({
              title: "Arquivo Inválido",
              description: "Por favor, selecione um arquivo .xlsx.",
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
    if (!selectedLevel) {
       toast({
           title: "Nível de Ensino Não Selecionado",
           description: "Por favor, selecione o nível de ensino correspondente ao arquivo.",
           variant: "destructive",
       });
       return;
    }
    if (!selectedFile) {
      toast({
        title: "Nenhum Arquivo Selecionado",
        description: "Por favor, selecione um arquivo .xlsx para upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
        const fileData = await selectedFile.arrayBuffer();
        console.log(`Processing file: ${selectedFile.name}, size: ${fileData.byteLength} bytes for level: ${selectedLevel}`);
        // Pass the selected level to processEscopoFile
        const processedData: EscopoSequenciaItem[] = processEscopoFile(fileData, selectedLevel);

        if (processedData.length > 0) {
            // Pass the selected level to save function
            saveEscopoDataToStorage(selectedLevel, processedData);
            toast({
                title: "Upload Concluído",
                description: `Arquivo "${selectedFile.name}" processado para ${selectedLevel}. ${processedData.length} itens carregados. Os dados anteriores para este nível foram substituídos.`,
            });
             // Dispatch event to notify dashboard to reload data - This should already be handled within saveEscopoDataToStorage

        } else {
             toast({
                title: "Processamento Concluído",
                description: `Nenhum dado válido encontrado no arquivo "${selectedFile.name}" ou as colunas esperadas estão ausentes/incorretas. Verifique o console para mais detalhes. Nenhum dado foi salvo para ${selectedLevel}.`,
                variant: "destructive", // Use destructive for warnings/errors during processing
                duration: 10000, // Longer duration for error messages
            });
        }

        setSelectedFile(null); // Clear selection after processing
        // Clear the file input visually
        const fileInput = document.getElementById('escopoFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Optionally reset level selection after upload? Or keep it? Keep for now.
        // setSelectedLevel('');


    } catch (error) {
        console.error("Error processing XLSX file:", error);
        toast({
          title: "Erro no Upload",
          description: `Falha ao processar o arquivo "${selectedFile.name}". Verifique se o formato está correto. Detalhes: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
          duration: 10000, // Longer duration for error messages
        });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveApiKey = async () => {
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
       description: "A chave no campo foi salva localmente para referência.",
    });
  };

  // Render loading or nothing if auth check is happening or user is not admin
  if (authLoading || !user || user.username !== 'admin') {
    return (
        <div className="flex flex-1 items-center justify-center bg-secondary"> {/* Use flex-1 and background */}
            {/* Optional: Add a loading indicator */}
             <p>Carregando...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-secondary"> {/* Use flex-1 and flex-col */}

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
                Selecione o <strong>Nível de Ensino</strong> e faça o upload do arquivo <strong>.xlsx</strong> correspondente. O upload substituirá os dados existentes para o nível selecionado.
                <br />
                O nome da planilha (worksheet) será usado como o nome da Disciplina (ignore a planilha "Índice").
                 As colunas esperadas (podem ter variações de nome) são: <strong>ANO/SÉRIE</strong> (será lido apenas o número), <strong>BIMESTRE</strong> (será lido apenas o número), <strong>HABILIDADE</strong>, <strong>OBJETOS DO CONHECIMENTO</strong>, <strong>CONTEUDO</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {/* Education Level Selection */}
               <div className="space-y-2">
                  <Label htmlFor="educationLevel" className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" /> Nível de Ensino *
                  </Label>
                  <Select
                    value={selectedLevel}
                    onValueChange={(value) => setSelectedLevel(value as EducationLevel)} // Cast value to EducationLevel
                    disabled={isUploading}
                  >
                    <SelectTrigger id="educationLevel">
                      <SelectValue placeholder="Selecione o nível de ensino do arquivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>

              {/* File Selection */}
              <div className="space-y-2">
                <Label htmlFor="escopoFile">Selecionar Arquivo (.xlsx) *</Label>
                <Input
                  id="escopoFile"
                  type="file"
                  accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" // Accept only .xlsx
                  onChange={handleFileChange}
                  disabled={isUploading}
                   className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                 {selectedFile && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {selectedFile.name}</p>}
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedLevel || isUploading} // Disable if no file OR no level selected
                 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isUploading ? `Processando para ${selectedLevel}...` : 'Fazer Upload e Substituir Dados'}
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
                  <AlertDescription>
                     A chave de API está atualmente codificada diretamente em <code>src/ai/ai-instance.ts</code>. O campo abaixo é apenas para referência. A chave ativa é: <strong>{HARDCODED_API_KEY_DISPLAY}</strong>.
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
