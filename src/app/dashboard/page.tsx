
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Added Input
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot, Clock, CalendarDays, Layers, Paperclip, AlertTriangle } from 'lucide-react'; // Added Layers, Paperclip, AlertTriangle icons
import {
    getAllEscopoDataFromStorage, // Get data for all levels
    type EscopoSequenciaItem,
    EducationLevel, // Import type
    EDUCATION_LEVELS, // Import level constants
} from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast"; // Import useToast


// Duration options - keep the standard ones for now
const aulaDuracaoOptions: string[] = [
    '1 aula (45/50 min)',
    '2 aulas (90/100 min)',
    '3 aulas (135/150 min)',
];

// Specific duration options for Noturno
const aulaDuracaoNoturnoOptions: string[] = [
    '1 aula Noturno (40 min)',
    '2 aulas Noturno (80 min)',
    // Add more if needed
];

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast(); // Initialize useToast

  // Store data for all levels
  const [allEscopoData, setAllEscopoData] = useState<{ [key in EducationLevel]?: EscopoSequenciaItem[] }>({});
  const [loadingData, setLoadingData] = useState(true);
  const [showDataMissingAlert, setShowDataMissingAlert] = useState(false);
  const [missingLevels, setMissingLevels] = useState<EducationLevel[]>([]);

  // Form State
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | ''>(''); // New state for selected level
  const [yearSeries, setYearSeries] = useState(''); // This is now just the number '6', '1', etc.
  const [subject, setSubject] = useState(''); // 'disciplina' in Portuguese
  const [bimestre, setBimestre] = useState(''); // New state for Bimester number '1', '2', etc.
  const [content, setContent] = useState(''); // 'conteudo' in Portuguese - Now derived from skill
  const [knowledgeObject, setKnowledgeObject] = useState(''); // New state for 'objetosDoConhecimento'
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [aulaDuracao, setAulaDuracao] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedMaterialFile, setSelectedMaterialFile] = useState<File | null>(null); // State for attached file
  const [readingFile, setReadingFile] = useState(false); // State for file reading process
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [suggestingContent, setSuggestingContent] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<string[]>([]);

  // Get the relevant data based on the selected level
  const currentLevelData = useMemo(() => {
    return selectedLevel ? allEscopoData[selectedLevel] ?? [] : [];
  }, [selectedLevel, allEscopoData]);


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
      const data = getAllEscopoDataFromStorage(); // Load data for all levels
      setAllEscopoData(data);

       // Check if *any* level has data
       const hasAnyData = EDUCATION_LEVELS.some(level => data[level] && data[level]!.length > 0);
       const levelsWithoutData = EDUCATION_LEVELS.filter(level => !data[level] || data[level]!.length === 0);
       setMissingLevels(levelsWithoutData);

       if (!hasAnyData && user?.username === 'admin') {
          setShowDataMissingAlert(true); // Show alert if NO data found at all for admin
       } else if (!hasAnyData && user?.username !== 'admin'){
           setShowDataMissingAlert(true); // Show alert if NO data found at all for non-admin
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

  }, [user]); // Add user dependency to re-evaluate alert visibility

  // --- Derived options based on selections ---

  // Available Years/Series (unique values from the current level's data)
   const availableYears = useMemo(() => {
     if (!selectedLevel || !currentLevelData.length) return [];
     // Sort numerically
     const sortedYears = [...new Set(currentLevelData.map(item => item.anoSerie))]
         .sort((a, b) => parseInt(a) - parseInt(b));
     return sortedYears;
   }, [selectedLevel, currentLevelData]);

   // Available Subjects for the selected Level and Year/Series
   const availableSubjects = useMemo(() => {
     if (!selectedLevel || !yearSeries || !currentLevelData.length) return [];
     return [...new Set(currentLevelData.filter(item => item.anoSerie === yearSeries).map(item => item.disciplina))].sort();
   }, [selectedLevel, yearSeries, currentLevelData]);

    // Available Bimestres for the selected Level, Year/Series and Subject
   const availableBimestres = useMemo(() => {
     if (!selectedLevel || !subject || !yearSeries || !currentLevelData.length) return [];
     const bimestres = [...new Set(currentLevelData
       .filter(item => item.anoSerie === yearSeries && item.disciplina === subject)
       .map(item => item.bimestre) // This is already just the number '1', '2', etc.
       )].sort((a, b) => parseInt(a) - parseInt(b)); // Sort numerically
     return bimestres;
   }, [selectedLevel, subject, yearSeries, currentLevelData]);

    // Available Knowledge Objects for the selected Level, Year/Series, Subject, and Bimester
   const availableKnowledgeObjects = useMemo(() => {
     if (!selectedLevel || !bimestre || !subject || !yearSeries || !currentLevelData.length) return [];
     return [...new Set(currentLevelData
        .filter(item => item.anoSerie === yearSeries && item.disciplina === subject && item.bimestre === bimestre)
        .map(item => item.objetosDoConhecimento))]
        .sort();
   }, [selectedLevel, bimestre, subject, yearSeries, currentLevelData]);

  // Available Skills based on Level, Year, Subject, Bimester, and Knowledge Object
  const availableSkills = useMemo(() => {
      if (!selectedLevel || !knowledgeObject || !bimestre || !subject || !yearSeries || !currentLevelData.length) return [];
      // Find items matching the current selection
      const matchingItems = currentLevelData.filter(item =>
          item.anoSerie === yearSeries &&
          item.disciplina === subject &&
          item.bimestre === bimestre && // Filter by bimestre number
          item.objetosDoConhecimento === knowledgeObject
      );
      // Extract unique skills from matching items
      const skillsSet = new Set<string>();
      matchingItems.forEach(item => {
           if (typeof item.habilidade === 'string') {
              skillsSet.add(item.habilidade.trim());
           }
      });
      return Array.from(skillsSet).sort();
  }, [selectedLevel, knowledgeObject, bimestre, subject, yearSeries, currentLevelData]);


   // Derive Content based on the selected Skill
    useEffect(() => {
        if (!selectedSkill || !knowledgeObject || !bimestre || !subject || !yearSeries || !selectedLevel || !currentLevelData.length) {
            setContent('');
            return;
        }
        const matchingItem = currentLevelData.find(item =>
            item.anoSerie === yearSeries &&
            item.disciplina === subject &&
            item.bimestre === bimestre &&
            item.objetosDoConhecimento === knowledgeObject &&
            item.habilidade === selectedSkill // Match based on selected skill now
        );
        setContent(matchingItem?.conteudo || ''); // Set content from the match, or empty if none
    }, [selectedSkill, knowledgeObject, bimestre, subject, yearSeries, selectedLevel, currentLevelData]);


  // --- Reset dependent fields when a higher-level field changes ---
   const handleLevelChange = (value: string) => {
    setSelectedLevel(value as EducationLevel);
    setYearSeries('');
    setSubject('');
    setBimestre('');
    setKnowledgeObject('');
    setSelectedSkill('');
    setContent('');
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
    setSelectedMaterialFile(null); // Reset file
   };

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
    setSelectedMaterialFile(null); // Reset file
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
    setSelectedMaterialFile(null); // Reset file
  };

  const handleBimestreChange = (value: string) => {
      setBimestre(value);
      setKnowledgeObject('');
      setSelectedSkill('');
      setContent('');
      setAulaDuracao('');
      setGeneratedPlan('');
      setSuggestedContent([]);
      setSelectedMaterialFile(null); // Reset file
  };

   const handleKnowledgeObjectChange = (value: string) => {
     setKnowledgeObject(value);
     setSelectedSkill(''); // Reset skills when knowledge object changes
     setContent(''); // Reset content, will be updated by useEffect based on skill
     setAulaDuracao('');
     setGeneratedPlan('');
     setSuggestedContent([]);
     setSelectedMaterialFile(null); // Reset file
   };


  const handleSkillChange = (skill: string) => {
    setSelectedSkill(skill);
     // Content will be updated by the useEffect hook based on the selected skill
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
    setSelectedMaterialFile(null); // Reset file
  };

  const handleDurationChange = (value: string) => {
      setAulaDuracao(value);
      setGeneratedPlan(''); // Reset plan if duration changes
      setSuggestedContent([]); // Reset suggestions if duration changes
      // Keep file selected if duration changes
  };

   // Handle file selection for material digital
   const handleMaterialFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     if (event.target.files && event.target.files.length > 0) {
       const file = event.target.files[0];
       // Basic validation (e.g., size limit, file type) could be added here
       setSelectedMaterialFile(file);
       setGeneratedPlan(''); // Reset plan if file changes
       setSuggestedContent([]); // Reset suggestions if file changes
     } else {
       setSelectedMaterialFile(null);
     }
   };


  // Determine if the current selection is for 'Ensino Médio Noturno'
  const isEnsinoMedioNoturno = useMemo(() => {
      return selectedLevel === 'Ensino Médio Noturno';
  }, [selectedLevel]);

  // Filter aulaDuracaoOptions based on whether it's Ensino Médio Noturno
  const currentAulaDuracaoOptions = useMemo(() => {
      return isEnsinoMedioNoturno ? aulaDuracaoNoturnoOptions : aulaDuracaoOptions;
  }, [isEnsinoMedioNoturno]);

   // Helper function to format Year/Series for display
   const formatYearSeriesDisplay = (year: string, level: EducationLevel | ''): string => {
       if (!year || !level) return year;
       if (level.includes('Anos Iniciais') || level.includes('Anos Finais')) return `${year}º ano`;
       if (level.includes('Ensino Médio')) return `${year}ª série`; // Includes Noturno and Técnico
       return year; // Fallback
   };

    // Helper function to format Bimestre for display
    const formatBimestreDisplay = (bimestreNum: string): string => {
        if (!bimestreNum) return '';
        return `${bimestreNum}º Bimestre`;
    };

    // Full year/series string needed for the AI prompt
    const fullYearSeriesString = useMemo(() => {
        if (!yearSeries || !selectedLevel) return '';
        const yearPart = formatYearSeriesDisplay(yearSeries, selectedLevel);
        let levelPart = '';
        if (selectedLevel.includes('Anos Iniciais')) levelPart = ' do Ensino Fundamental';
        else if (selectedLevel.includes('Anos Finais')) levelPart = ' do Ensino Fundamental';
        else if (selectedLevel.includes('Ensino Médio')) levelPart = ' do Ensino Médio'; // Covers Regular, Noturno, Técnico

        // Add Noturno specifier if applicable
        if (selectedLevel === 'Ensino Médio Noturno') levelPart += ' Noturno';
        // Add Técnico specifier if applicable (might need refinement based on exact needs)
        if (selectedLevel.startsWith('Ensino Médio Técnico')) levelPart += ' Técnico';


        return `${yearPart}${levelPart}`;
    }, [yearSeries, selectedLevel]);

   // Function to read file as Data URI
   const readFileAsDataUri = (file: File): Promise<string> => {
       return new Promise((resolve, reject) => {
           const reader = new FileReader();
           reader.onload = () => resolve(reader.result as string);
           reader.onerror = (error) => reject(error);
           reader.readAsDataURL(file);
       });
   };


  const handleGeneratePlan = async () => {
    if (!selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || !selectedSkill || !aulaDuracao || !content) {
      console.error("Por favor, preencha todos os campos obrigatórios (Nível, Ano/Série, Disciplina, Bimestre, Objeto, Habilidade, Duração). Content: ", content);
      toast({
          title: "Campos Obrigatórios",
          description: "Preencha todos os campos com '*' para gerar o plano.",
          variant: "destructive",
      });
      return;
    }

    setGeneratingPlan(true);
    setReadingFile(true); // Start file reading indication
    setGeneratedPlan('');
    setSuggestingContent(false);
    setSuggestedContent([]);

    let materialDataUri: string | undefined = undefined;
    try {
        if (selectedMaterialFile) {
            materialDataUri = await readFileAsDataUri(selectedMaterialFile);
        }
    } catch (error) {
        console.error("Error reading material file:", error);
        toast({
            title: "Erro ao Ler Arquivo",
            description: "Não foi possível ler o arquivo de material digital anexado.",
            variant: "destructive",
        });
        setReadingFile(false);
        setGeneratingPlan(false);
        return;
    }
    setReadingFile(false); // Finish file reading indication

    const input: GenerateLessonPlanInput = {
      disciplina: subject,
      anoSerie: fullYearSeriesString, // Use the fully constructed string
      habilidade: selectedSkill,
      conteudo: content, // Use the derived content based on skill
      aulaDuracao: aulaDuracao,
      orientacoesAdicionais: additionalInstructions || undefined,
      materialDigitalDataUri: materialDataUri, // Pass the data URI
    };

    try {
      console.log("Sending request to generateLessonPlan with input:", input); // Log before sending
      const response = await generateLessonPlan(input);
      setGeneratedPlan(response.lessonPlan);

      // Suggest additional content based on the derived content and full year string
      handleSuggestContent(input.conteudo, input.anoSerie, input.disciplina, response.lessonPlan);

    } catch (error) {
      console.error("Error generating lesson plan:", error);
      setGeneratedPlan("Erro ao gerar o plano de aula. Verifique sua chave de API, o tamanho do arquivo anexado e tente novamente.");
      toast({ // Add toast for generation error
            title: "Erro na Geração",
            description: "Falha ao gerar o plano. Verifique a chave de API, o arquivo anexado ou tente mais tarde.",
            variant: "destructive",
      });
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
           gradeLevel: gradeLevel, // Use the full year string
           subject: subject,
           currentContent: currentContent
       };
       const response = await suggestAdditionalContent(input);
       setSuggestedContent(response.additionalContentSuggestions);
     } catch (error) {
       console.error("Error suggesting additional content:", error);
       // Optionally show an error message
        toast({
             title: "Erro nas Sugestões",
             description: "Não foi possível buscar sugestões de conteúdo adicional.",
             variant: "destructive",
        });
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

   // Consolidate disabling conditions
   const formDisabled = loadingData || generatingPlan || readingFile || showDataMissingAlert;
   const generateButtonDisabled = formDisabled || !selectedSkill || !aulaDuracao || !content;


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
         {showDataMissingAlert && !loadingData && (
             <div className="lg:col-span-2">
                 <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dados Não Encontrados</AlertTitle>
                  <AlertDescription>
                    {user?.username === 'admin' ? (
                      <>
                       Nenhum dado do Escopo-Sequência foi encontrado no armazenamento local para nenhum nível de ensino. Por favor, vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para fazer o upload dos arquivos XLSX necessários.
                       {missingLevels.length > 0 && <p className="mt-1 text-xs">Níveis faltando: {missingLevels.join(', ')}</p>}
                      </>
                    ) : (
                      "Os dados necessários para gerar planos de aula não estão disponíveis. Entre em contato com o administrador para fazer o upload dos dados."
                    )}
                  </AlertDescription>
                 </Alert>
             </div>
          )}
          {!showDataMissingAlert && missingLevels.length > 0 && user?.username === 'admin' && !loadingData && (
              <div className="lg:col-span-2">
                 <Alert variant="default" className="border-yellow-500 text-yellow-700 [&>svg]:text-yellow-500 dark:border-yellow-600 dark:text-yellow-300 dark:[&>svg]:text-yellow-600 bg-yellow-50 dark:bg-yellow-950">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Dados Incompletos</AlertTitle>
                  <AlertDescription>
                      Dados do Escopo-Sequência estão faltando para os seguintes níveis: <strong>{missingLevels.join(', ')}</strong>. Vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para carregá-los.
                  </AlertDescription>
                 </Alert>
              </div>
          )}


        {/* Left Column: Form */}
        <Card className={`shadow-md ${formDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="h-6 w-6 text-primary" />
              Gerar Plano de Aula
            </CardTitle>
            <CardDescription>Selecione as opções para gerar um plano de aula com IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

             {/* Education Level */}
            <div className="space-y-2">
               <Label htmlFor="levelSelect" className="flex items-center gap-1">
                  <Layers className="h-4 w-4" /> Nível de Ensino *
               </Label>
               <Select
                  value={selectedLevel}
                  onValueChange={handleLevelChange}
                  disabled={formDisabled}
               >
                  <SelectTrigger id="levelSelect">
                     <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o nível"} />
                  </SelectTrigger>
                  <SelectContent>
                     {EDUCATION_LEVELS.map(level => (
                        <SelectItem key={level} value={level} disabled={missingLevels.includes(level)}>
                           {level} {missingLevels.includes(level) ? '(Dados não carregados)' : ''}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            </div>

             {/* Year/Series */}
            <div className="space-y-2">
              <Label htmlFor="yearSeries" className="flex items-center gap-1">
                 <BookCopy className="h-4 w-4" /> Ano/Série *
              </Label>
              <Select
                value={yearSeries}
                onValueChange={handleYearChange}
                disabled={formDisabled || !selectedLevel} // Disable if no level selected
              >
                <SelectTrigger id="yearSeries">
                  <SelectValue placeholder={loadingData ? "Carregando..." : (!selectedLevel ? "Selecione nível primeiro" : "Selecione o ano/série")} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{formatYearSeriesDisplay(year, selectedLevel)}</SelectItem>
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
                disabled={formDisabled || !yearSeries} // Depends on yearSeries
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
                disabled={formDisabled || !subject} // Depends on subject
              >
                <SelectTrigger id="bimestre">
                  <SelectValue placeholder={!subject ? "Selecione a disciplina primeiro" : "Selecione o bimestre"} />
                </SelectTrigger>
                <SelectContent>
                   {availableBimestres.map(bim => (
                     <SelectItem key={bim} value={bim}>{formatBimestreDisplay(bim)}</SelectItem> // Display formatted
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
                disabled={formDisabled || !bimestre} // Depends on bimestre now
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
                        disabled={formDisabled || !knowledgeObject} // Depends on knowledge object
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
                 disabled={formDisabled || !selectedSkill || !content}
               >
                 <SelectTrigger id="aulaDuracao">
                   <SelectValue placeholder={!selectedSkill || !content ? "Selecione uma habilidade primeiro" : "Selecione a duração"} />
                 </SelectTrigger>
                 <SelectContent>
                   {/* Render options based on selected level (Noturno or standard) */}
                   {currentAulaDuracaoOptions.map(dur => (
                     <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
                {/* Optional: Add a note about Noturno duration */}
                {isEnsinoMedioNoturno && <p className="text-xs text-muted-foreground mt-1">Durações específicas para Ensino Médio Noturno.</p>}
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
                disabled={formDisabled}
              />
            </div>

             {/* File Attachment (Material Digital) */}
             <div className="space-y-2">
                <Label htmlFor="materialFile" className="flex items-center gap-1">
                    <Paperclip className="h-4 w-4" /> Anexar Material Digital (Opcional)
                </Label>
                <Input
                    id="materialFile"
                    type="file"
                    // Consider adding accept attribute for specific file types, e.g., accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={handleMaterialFileChange}
                    disabled={formDisabled}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {selectedMaterialFile && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Arquivo selecionado: {selectedMaterialFile.name} ({(selectedMaterialFile.size / 1024 / 1024).toFixed(2)} MB)
                        {/* Simple size limit warning */}
                        {selectedMaterialFile.size > 4 * 1024 * 1024 && // Example: 4MB limit
                           <span className="text-destructive ml-2">(Atenção: Arquivos grandes podem falhar ou demorar)</span>}
                    </p>
                )}
             </div>


            {/* Generate Button */}
            <Button
              onClick={handleGeneratePlan}
              disabled={generateButtonDisabled}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {readingFile ? 'Lendo arquivo...' : generatingPlan ? 'Gerando plano...' : 'Gerar Plano de Aula'}
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
                {generatingPlan || readingFile ? ( // Show skeleton if reading file OR generating
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
                                return (
                                     <li key={index} className="ml-5 list-disc">{line.slice(2)}</li>
                                );
                            }
                             // Numbered lists (e.g., 1.)
                             if (/^\d+\.\s/.test(line)) {
                                 return (
                                     <li key={index} className="ml-5 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>
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
                        ) : !generatingPlan && !readingFile && !suggestingContent && generatedPlan ? ( // Show if no suggestions, not loading, and plan exists
                             <div className="mt-6 border-t pt-4">
                                <p className="text-sm text-muted-foreground">Nenhuma sugestão de conteúdo adicional encontrada.</p>
                             </div>
                        ) : null }

                    </div>
                ) : (
                    <p className="text-muted-foreground">
                        {showDataMissingAlert
                            ? (user?.username === 'admin' ? "Carregue os dados do Escopo-Sequência nas configurações para começar." : "Dados indisponíveis. Contacte o administrador.")
                            : "Selecione as opções e clique em \"Gerar Plano de Aula\". Você pode anexar um arquivo (PDF, DOCX, etc.) para referência."}
                     </p>
                )}
                </ScrollArea>
            </CardContent>
         </Card>

      </main>
    </div>
  );
}

