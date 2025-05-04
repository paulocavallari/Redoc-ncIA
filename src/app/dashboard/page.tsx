
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot, Clock, CalendarDays } from 'lucide-react';
// Removed getEscopoSequenciaData as we now load from storage or rely on upload
import { getEscopoDataFromStorage, type EscopoSequenciaItem } from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


// Education Level mapping (adjust if needed based on 'anoSerie' values in your XLSX)
const educationLevelMap: Record<string, string> = {
    '1º ano': 'Ensino Fundamental: Anos Iniciais',
    '2º ano': 'Ensino Fundamental: Anos Iniciais',
    '3º ano': 'Ensino Fundamental: Anos Iniciais',
    '4º ano': 'Ensino Fundamental: Anos Iniciais',
    '5º ano': 'Ensino Fundamental: Anos Iniciais',
    '6º ano': 'Ensino Fundamental: Anos Finais',
    '7º ano': 'Ensino Fundamental: Anos Finais',
    '8º ano': 'Ensino Fundamental: Anos Finais',
    '9º ano': 'Ensino Fundamental: Anos Finais',
    '1ª série': 'Ensino Médio',
    '2ª série': 'Ensino Médio',
    '3ª série': 'Ensino Médio',
    // Add specific mapping for Noturno if the file uses a distinct string like "1ª série - Noturno"
    // Example: '1ª série - Noturno': 'Ensino Médio Noturno',
};

const getEducationLevel = (anoSerie: string): string => {
    // Check for explicit "Noturno" level first if it exists in the map keys
    if (educationLevelMap[anoSerie]) {
        return educationLevelMap[anoSerie];
    }
    // Fallback: Check if the string contains "Noturno" and maps to Ensino Médio
    if (anoSerie.toLowerCase().includes('noturno') && (anoSerie.includes('1ª') || anoSerie.includes('2ª') || anoSerie.includes('3ª'))) {
       return 'Ensino Médio Noturno';
    }
    // General mapping for Ensino Médio based on series number
    if (anoSerie.includes('1ª série') || anoSerie.includes('2ª série') || anoSerie.includes('3ª série')) {
        return 'Ensino Médio';
    }
    // Check standard mappings
    for (const key in educationLevelMap) {
        if (anoSerie.startsWith(key.split(' ')[0])) { // Match based on year/series number primarily
            return educationLevelMap[key];
        }
    }
    return 'Desconhecido'; // Default if not found
};


const aulaDuracaoOptions: string[] = [
    '1 aula (45/50 min)',
    '2 aulas (90/100 min)',
    '3 aulas (135/150 min)',
    // Add specific Noturno options if they differ, e.g.:
    // '1 aula Noturno (40 min)',
    // '2 aulas Noturno (80 min)',
];

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [escopoData, setEscopoData] = useState<EscopoSequenciaItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showDataMissingAlert, setShowDataMissingAlert] = useState(false);

  // Form State
  const [yearSeries, setYearSeries] = useState('');
  const [subject, setSubject] = useState(''); // 'disciplina' in Portuguese
  const [bimestre, setBimestre] = useState(''); // New state for Bimester
  const [content, setContent] = useState(''); // 'conteudo' in Portuguese - Now derived from knowledge object
  const [knowledgeObject, setKnowledgeObject] = useState(''); // New state for 'objetosDoConhecimento'
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [aulaDuracao, setAulaDuracao] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [suggestingContent, setSuggestingContent] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<string[]>([]);


  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Load Escopo-Sequencia data from localStorage on mount (client-side only)
    const loadData = () => {
      setLoadingData(true);
      const data = getEscopoDataFromStorage();
      setEscopoData(data);
       if (data.length === 0) {
         setShowDataMissingAlert(true); // Show alert if no data found
       } else {
         setShowDataMissingAlert(false);
       }
      setLoadingData(false);
    };

    // Ensure this runs only on the client
    if (typeof window !== 'undefined') {
      loadData();
       // Optional: Add event listener to reload data if it's updated elsewhere (e.g., after upload)
       window.addEventListener('escopoDataUpdated', loadData);
       return () => window.removeEventListener('escopoDataUpdated', loadData);
    } else {
      setLoadingData(false); // Set loading false on server
       setShowDataMissingAlert(true); // Assume no data on server
    }

  }, []); // Empty dependency array ensures this runs once on mount/client load

  // --- Derived options based on selections ---

  // Available Years/Series (unique values from the loaded data)
   const availableYears = useMemo(() => {
     if (!escopoData.length) return [];
     // Sort based on typical school order
     const sortedYears = [...new Set(escopoData.map(item => item.anoSerie))]
         .sort((a, b) => {
             const numA = parseInt(a.match(/\d+/)?.[0] || '0');
             const numB = parseInt(b.match(/\d+/)?.[0] || '0');
             const typeA = a.includes('série') ? 1 : (a.includes('ano') ? 0 : 2); // 0 for ano, 1 for série, 2 otherwise
             const typeB = b.includes('série') ? 1 : (b.includes('ano') ? 0 : 2);

             if (typeA !== typeB) return typeA - typeB; // Group 'ano' then 'série'
             return numA - numB;
         });
     return sortedYears;
   }, [escopoData]);

   // Available Subjects for the selected Year/Series
   const availableSubjects = useMemo(() => {
     if (!yearSeries || !escopoData.length) return [];
     return [...new Set(escopoData.filter(item => item.anoSerie === yearSeries).map(item => item.disciplina))].sort();
   }, [yearSeries, escopoData]);

    // Available Bimestres for the selected Year/Series and Subject
   const availableBimestres = useMemo(() => {
     if (!subject || !yearSeries || !escopoData.length) return [];
     const bimestres = [...new Set(escopoData
       .filter(item => item.anoSerie === yearSeries && item.disciplina === subject)
       .map(item => item.bimestre)
       )].sort((a, b) => {
         // Sort bimestres numerically (1º, 2º, 3º, 4º)
         const numA = parseInt(a.match(/\d+/)?.[0] || '0');
         const numB = parseInt(b.match(/\d+/)?.[0] || '0');
         return numA - numB;
       });
     return bimestres;
   }, [subject, yearSeries, escopoData]);

    // Available Knowledge Objects for the selected Year/Series, Subject, and Bimester
   const availableKnowledgeObjects = useMemo(() => {
     if (!bimestre || !subject || !yearSeries || !escopoData.length) return [];
     return [...new Set(escopoData
        .filter(item => item.anoSerie === yearSeries && item.disciplina === subject && item.bimestre === bimestre)
        .map(item => item.objetosDoConhecimento))]
        .sort();
   }, [bimestre, subject, yearSeries, escopoData]);

  // Available Skills based on Year, Subject, Bimester, and Knowledge Object
  const availableSkills = useMemo(() => {
      if (!knowledgeObject || !bimestre || !subject || !yearSeries || !escopoData.length) return [];
      // Find items matching the current selection
      const matchingItems = escopoData.filter(item =>
          item.anoSerie === yearSeries &&
          item.disciplina === subject &&
          item.bimestre === bimestre && // Filter by bimestre
          item.objetosDoConhecimento === knowledgeObject
      );
      // Extract unique skills from matching items
      const skillsSet = new Set<string>();
      matchingItems.forEach(item => {
           // Handle potential variations in how skills are stored (string vs array)
           if (typeof item.habilidade === 'string') {
              skillsSet.add(item.habilidade.trim());
           }
           // If 'habilidades' array exists and is used, handle it here:
           // else if (Array.isArray(item.habilidades)) {
           //    item.habilidades.forEach(skill => skillsSet.add(skill.trim()));
           // }
      });
      return Array.from(skillsSet).sort();
  }, [knowledgeObject, bimestre, subject, yearSeries, escopoData]);


   // Derive Content based on the selected Skill (find the first matching content)
    useEffect(() => {
        if (!selectedSkill || !knowledgeObject || !bimestre || !subject || !yearSeries || !escopoData.length) {
            setContent('');
            return;
        }
        const matchingItem = escopoData.find(item =>
            item.anoSerie === yearSeries &&
            item.disciplina === subject &&
            item.bimestre === bimestre &&
            item.objetosDoConhecimento === knowledgeObject &&
            item.habilidade === selectedSkill // Match based on selected skill now
        );
        setContent(matchingItem?.conteudo || ''); // Set content from the match, or empty if none
    }, [selectedSkill, knowledgeObject, bimestre, subject, yearSeries, escopoData]);


  // --- Reset dependent fields when a higher-level field changes ---
  const handleYearChange = (value: string) => {
    setYearSeries(value);
    setSubject('');
    setBimestre('');
    setKnowledgeObject('');
    setSelectedSkill('');
    setContent('');
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setBimestre('');
    setKnowledgeObject('');
    setSelectedSkill('');
    setContent('');
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
  };

  const handleBimestreChange = (value: string) => {
      setBimestre(value);
      setKnowledgeObject('');
      setSelectedSkill('');
      setContent('');
      setAulaDuracao('');
      setGeneratedPlan('');
      setSuggestedContent([]);
  };

   const handleKnowledgeObjectChange = (value: string) => {
     setKnowledgeObject(value);
     setSelectedSkill(''); // Reset skills when knowledge object changes
     setContent(''); // Reset content, will be updated by useEffect based on skill
     setAulaDuracao('');
     setGeneratedPlan('');
     setSuggestedContent([]);
   };


  const handleSkillChange = (skill: string) => {
    setSelectedSkill(skill);
     // Content will be updated by the useEffect hook based on the selected skill
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
  };

  const handleDurationChange = (value: string) => {
      setAulaDuracao(value);
      setGeneratedPlan('');
      setSuggestedContent([]);
  };

  // Determine if the current selection is for 'Ensino Médio Noturno'
  const isEnsinoMedioNoturno = useMemo(() => {
      return getEducationLevel(yearSeries) === 'Ensino Médio Noturno';
  }, [yearSeries]);

  // Filter aulaDuracaoOptions based on whether it's Ensino Médio Noturno
  const filteredAulaDuracaoOptions = useMemo(() => {
      // In a real scenario, you might have specific options for Noturno, e.g.:
      // if (isEnsinoMedioNoturno) {
      //     return ['1 aula Noturno (40 min)', '2 aulas Noturno (80 min)'];
      // }
      // For now, just return the standard options, but the logic is here
      return aulaDuracaoOptions;
  }, [isEnsinoMedioNoturno]);


  const handleGeneratePlan = async () => {
    if (!subject || !yearSeries || !bimestre || !knowledgeObject || !selectedSkill || !aulaDuracao || !content) {
      console.error("Por favor, preencha todos os campos obrigatórios (Ano/Série, Disciplina, Bimestre, Objeto de Conhecimento, Habilidade, Duração). Content: ", content);
      // TODO: Show toast message
      return;
    }

    setGeneratingPlan(true);
    setGeneratedPlan('');
    setSuggestingContent(false);
    setSuggestedContent([]);

    const input: GenerateLessonPlanInput = {
      disciplina: subject,
      anoSerie: yearSeries,
      habilidade: selectedSkill,
      conteudo: content, // Use the derived content based on skill
      aulaDuracao: aulaDuracao,
      orientacoesAdicionais: additionalInstructions || undefined,
    };

    try {
      const response = await generateLessonPlan(input);
      setGeneratedPlan(response.lessonPlan);

      // Suggest additional content based on the derived content
      handleSuggestContent(input.conteudo, input.anoSerie, input.disciplina, response.lessonPlan);

    } catch (error) {
      console.error("Error generating lesson plan:", error);
      setGeneratedPlan("Erro ao gerar o plano de aula. Verifique sua chave de API e tente novamente.");
      // Handle error (e.g., show toast)
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Function to handle suggesting additional content
   const handleSuggestContent = async (topic: string, gradeLevel: string, subject: string, currentContent: string) => {
     setSuggestingContent(true);
     setSuggestedContent([]);
     try {
       const input: SuggestAdditionalContentInput = {
           topic: topic, // Use the derived content as the topic
           gradeLevel: gradeLevel,
           subject: subject,
           currentContent: currentContent
       };
       const response = await suggestAdditionalContent(input);
       setSuggestedContent(response.additionalContentSuggestions);
     } catch (error) {
       console.error("Error suggesting additional content:", error);
       // Optionally show an error message
     } finally {
       setSuggestingContent(false);
     }
   };


  if (authLoading || !user) {
    // Show loading state or redirect handled in useEffect
    return (
       <div className="flex min-h-screen items-center justify-center">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-[250px] ml-4" />
       </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
         <div className="flex items-center gap-2">
            <BookOpenCheck className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-semibold text-primary">redocêncIA</h1>
         </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">Olá, {user.name}!</span>
          {user.username === 'admin' && (
            <Link href="/settings" passHref>
              <Button variant="ghost" size="icon" aria-label="Configurações">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
       <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

         {/* Data Missing Alert */}
         {showDataMissingAlert && !loadingData && user?.username === 'admin' && (
            <div className="lg:col-span-2">
                <Alert variant="destructive">
                 <AlertTriangle className="h-4 w-4" />
                 <AlertTitle>Dados Não Encontrados</AlertTitle>
                 <AlertDescription>
                   Os dados do Escopo-Sequência não foram encontrados no armazenamento local. Por favor, vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para fazer o upload do arquivo XLSX.
                 </AlertDescription>
                </Alert>
            </div>
         )}
          {showDataMissingAlert && !loadingData && user?.username !== 'admin' && (
            <div className="lg:col-span-2">
                <Alert variant="destructive">
                 <AlertTriangle className="h-4 w-4" />
                 <AlertTitle>Dados Não Disponíveis</AlertTitle>
                 <AlertDescription>
                   Os dados necessários para gerar planos de aula não estão disponíveis. Entre em contato com o administrador para fazer o upload dos dados.
                 </AlertDescription>
                </Alert>
            </div>
         )}


        {/* Left Column: Form */}
        <Card className={`shadow-md ${showDataMissingAlert ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="h-6 w-6 text-primary" />
              Gerar Plano de Aula
            </CardTitle>
            <CardDescription>Selecione as opções para gerar um plano de aula com IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

             {/* Year/Series */}
            <div className="space-y-2">
              <Label htmlFor="yearSeries" className="flex items-center gap-1">
                 <BookCopy className="h-4 w-4" /> Ano/Série *
              </Label>
              <Select
                value={yearSeries}
                onValueChange={handleYearChange}
                disabled={loadingData || generatingPlan || escopoData.length === 0}
              >
                <SelectTrigger id="yearSeries">
                  <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o ano/série"} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year} ({getEducationLevel(year)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject (Disciplina) */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="flex items-center gap-1">
                 <BookCopy className="h-4 w-4" /> Disciplina *
              </Label>
              <Select
                value={subject}
                onValueChange={handleSubjectChange}
                disabled={!yearSeries || loadingData || generatingPlan || escopoData.length === 0}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder={!yearSeries ? "Selecione ano/série primeiro" : "Selecione a disciplina"} />
                </SelectTrigger>
                <SelectContent>
                   <ScrollArea className="h-[200px]">
                      {availableSubjects.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                   </ScrollArea>
                </SelectContent>
              </Select>
            </div>

             {/* Bimester (Bimestre) */}
            <div className="space-y-2">
              <Label htmlFor="bimestre" className="flex items-center gap-1">
                 <CalendarDays className="h-4 w-4" /> Bimestre *
              </Label>
              <Select
                value={bimestre}
                onValueChange={handleBimestreChange}
                disabled={!subject || loadingData || generatingPlan || escopoData.length === 0}
              >
                <SelectTrigger id="bimestre">
                  <SelectValue placeholder={!subject ? "Selecione a disciplina primeiro" : "Selecione o bimestre"} />
                </SelectTrigger>
                <SelectContent>
                   {availableBimestres.map(bim => (
                     <SelectItem key={bim} value={bim}>{bim}</SelectItem>
                   ))}
                </SelectContent>
              </Select>
            </div>

            {/* Knowledge Object (Objetos do Conhecimento) */}
            <div className="space-y-2">
              <Label htmlFor="knowledgeObject" className="flex items-center gap-1">
                 <Target className="h-4 w-4" /> Objeto de Conhecimento *
              </Label>
              <Select
                value={knowledgeObject}
                onValueChange={handleKnowledgeObjectChange}
                disabled={!bimestre || loadingData || generatingPlan || escopoData.length === 0} // Depends on bimestre now
              >
                <SelectTrigger id="knowledgeObject">
                  <SelectValue placeholder={!bimestre ? "Selecione o bimestre primeiro" : "Selecione o objeto de conhecimento"} />
                </SelectTrigger>
                <SelectContent>
                   <ScrollArea className="h-[200px]"> {/* Scroll for long lists */}
                     {availableKnowledgeObjects.map(obj => (
                       <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                     ))}
                   </ScrollArea>
                </SelectContent>
              </Select>
            </div>

             {/* Skills (Habilidade) - RadioGroup */}
             {availableSkills.length > 0 && (
               <div className="space-y-2">
                 <Label className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> Habilidade *</Label>
                 <Card className="p-4 bg-muted/50 border border-input">
                   <ScrollArea className="h-[150px]">
                     <RadioGroup
                        value={selectedSkill}
                        onValueChange={handleSkillChange}
                        disabled={generatingPlan || escopoData.length === 0 || !knowledgeObject} // Depends on knowledge object
                        className="space-y-2"
                     >
                       {availableSkills.map(skill => (
                         <div key={skill} className="flex items-center space-x-2">
                           <RadioGroupItem value={skill} id={`skill-${skill}`} />
                           <Label htmlFor={`skill-${skill}`} className="text-sm font-normal cursor-pointer">
                             {skill}
                           </Label>
                         </div>
                       ))}
                     </RadioGroup>
                   </ScrollArea>
                 </Card>
               </div>
             )}

             {/* Derived Content Display (Read-only) */}
             {content && (
                 <div className="space-y-1 rounded-md border border-input bg-secondary p-3 text-sm text-secondary-foreground">
                     <Label className="text-xs font-medium text-muted-foreground">Conteúdo Derivado:</Label>
                     <p>{content}</p>
                 </div>
             )}


            {/* Lesson Duration (Duração da Aula) */}
             <div className="space-y-2">
               <Label htmlFor="aulaDuracao" className="flex items-center gap-1">
                 <Clock className="h-4 w-4" /> Duração da Aula *
               </Label>
               <Select
                 value={aulaDuracao}
                 onValueChange={handleDurationChange}
                 // Enable when a skill is selected and content is derived
                 disabled={!selectedSkill || !content || loadingData || generatingPlan || escopoData.length === 0}
               >
                 <SelectTrigger id="aulaDuracao">
                   <SelectValue placeholder={!selectedSkill || !content ? "Selecione uma habilidade primeiro" : "Selecione a duração"} />
                 </SelectTrigger>
                 <SelectContent>
                   {/* Render only filtered options */}
                   {filteredAulaDuracaoOptions.map(dur => (
                     <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
                {/* Optional: Add a note about Noturno duration */}
                {/* {isEnsinoMedioNoturno && <p className="text-xs text-muted-foreground mt-1">Durações específicas para Ensino Médio Noturno.</p>} */}
             </div>


            {/* Additional Instructions (Orientações Adicionais) */}
            <div className="space-y-2">
              <Label htmlFor="additionalInstructions" className="flex items-center gap-1">
                 <MessageSquare className="h-4 w-4" /> Orientações Adicionais
              </Label>
              <Textarea
                id="additionalInstructions"
                placeholder="Ex: turma com dificuldades de leitura, usar recursos audiovisuais..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
                disabled={generatingPlan || escopoData.length === 0}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGeneratePlan}
              disabled={!selectedSkill || !aulaDuracao || !content || loadingData || generatingPlan || escopoData.length === 0} // Check all required fields including content
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {generatingPlan ? 'Gerando...' : 'Gerar Plano de Aula'}
            </Button>
          </CardContent>
        </Card>

         {/* Right Column: AI Response */}
         <Card className="shadow-md flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-6 w-6 text-primary" />
                Sugestão da IA
                </CardTitle>
                <CardDescription>Aqui será exibido o plano de aula gerado.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden"> {/* Make content area scrollable */}
                <ScrollArea className="h-full pr-4"> {/* Adjust height as needed */}
                {generatingPlan ? (
                    <div className="space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    </div>
                ) : generatedPlan ? (
                   // Enhanced rendering for markdown-like structure
                   <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                       {generatedPlan.split('\n').map((line, index) => {
                            line = line.trim(); // Trim whitespace

                            // Section Headers (bold or ##, check for following colon or end of line)
                             if ((line.startsWith('**') && line.endsWith('**')) || line.startsWith('## ')) {
                                 const headerText = line.replace(/^\*\*|^\## |\*\*$/g, '');
                                 // Only treat as H3 if it doesn't end with a colon (sub-headers have colons)
                                if (!headerText.endsWith(':') && headerText.length > 0) {
                                    return <h3 key={index} className="font-semibold text-lg my-3 pt-3 border-t first:border-t-0 first:pt-0">{headerText}</h3>;
                                }
                             }
                             // Sub-headers (bold within sections, ending with :)
                            if (line.startsWith('**') && line.endsWith('**:')) {
                                return <p key={index} className="font-semibold my-1">{line.slice(2, -2)}:</p>;
                            }
                            // Bullet points (* or -)
                             if (line.startsWith('* ') || line.startsWith('- ')) {
                                // Check if it's inside a list already, rudimentary check
                                const prevLine = index > 0 ? generatedPlan.split('\n')[index - 1].trim() : '';
                                const isListItem = prevLine.startsWith('* ') || prevLine.startsWith('- ');
                                const Tag = isListItem ? React.Fragment : 'ul'; // Wrap first item in ul
                                return (
                                    //<Tag key={index}> {/* Simple wrap, might nest incorrectly */}
                                        <li key={index} className="ml-5 list-disc">{line.slice(2)}</li>
                                    //</Tag>
                                );
                            }
                             // Numbered lists (e.g., 1.)
                             if (/^\d+\.\s/.test(line)) {
                                 const prevLine = index > 0 ? generatedPlan.split('\n')[index - 1].trim() : '';
                                 const isListItem = /^\d+\.\s/.test(prevLine);
                                 const Tag = isListItem ? React.Fragment : 'ol';
                                 return (
                                    //<Tag key={index}> {/* Simple wrap */}
                                        <li key={index} className="ml-5 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>
                                    //</Tag>
                                 );
                             }
                             // Estimated time in parentheses
                             if (line.startsWith('(') && line.endsWith(')')) {
                                 return <p key={index} className="text-xs text-muted-foreground italic my-1">{line}</p>;
                             }
                            // Regular paragraph - only render if line is not empty
                            if (line) {
                                return <p key={index} className="my-1">{line}</p>;
                            }
                            return null; // Don't render empty lines as paragraphs
                       })}

                        {/* Display Suggested Content */}
                        {suggestingContent ? (
                             <div className="mt-6 space-y-2 border-t pt-4">
                                <p className="font-semibold text-md">Sugerindo conteúdo adicional...</p>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : suggestedContent.length > 0 ? (
                             <div className="mt-6 border-t pt-4">
                                <p className="font-semibold text-md mb-2">Sugestões de Conteúdo Adicional:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    {suggestedContent.map((suggestion, idx) => (
                                        <li key={idx} className="text-sm">{suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : !generatingPlan && !suggestingContent && generatedPlan ? ( // Show if no suggestions, not loading, and plan exists
                             <div className="mt-6 border-t pt-4">
                                <p className="text-sm text-muted-foreground">Nenhuma sugestão de conteúdo adicional encontrada.</p>
                             </div>
                        ) : null }

                    </div>
                ) : (
                    <p className="text-muted-foreground">
                        {escopoData.length === 0 && !loadingData
                            ? "Carregue os dados do Escopo-Sequência nas configurações para começar."
                            : "Selecione as opções e clique em \"Gerar Plano de Aula\"."}
                     </p>
                )}
                </ScrollArea>
            </CardContent>
         </Card>

      </main>
    </div>
  );
}

