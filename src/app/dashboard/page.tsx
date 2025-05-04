
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
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot, Clock, CalendarDays, Layers, Paperclip, AlertTriangle, Library, Save, List } from 'lucide-react'; // Added Save, List icons
import {
    getAllEscopoDataFromStorage, // Get data for all levels
    type EscopoSequenciaItem,
    EducationLevel, // Import type
    EDUCATION_LEVELS, // Import level constants
} from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content';
import { savePlan, type SavedPlanDetails } from '@/services/saved-plans'; // Import save plan service
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

// Define the main section titles from the prompt
const SECTION_TITLES = [
    "Introdução:",
    "Desenvolvimento:",
    "Conclusão:",
    "Recursos Utilizados:",
    "Metodologias Sugeridas:",
    "Sugestões de adaptações para alunos Alvos da Educação Especial:"
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
  const [knowledgeObject, setKnowledgeObject] = useState(''); // New state for 'objetosDoConhecimento'
  const [selectedContents, setSelectedContents] = useState<string[]>([]); // Changed to array for multiple selection
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]); // Changed to array for multiple selection
  const [aulaDuracao, setAulaDuracao] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedMaterialFile, setSelectedMaterialFile] = useState<File | null>(null); // State for attached file
  const [readingFile, setReadingFile] = useState(false); // State for file reading process
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [suggestingContent, setSuggestingContent] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<string[]>([]);
  const [isSavingPlan, setIsSavingPlan] = useState(false); // State for saving plan

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

  // Available Contents based on Level, Year, Subject, Bimester, and Knowledge Object
  const availableContents = useMemo(() => {
      if (!selectedLevel || !knowledgeObject || !bimestre || !subject || !yearSeries || !currentLevelData.length) return [];
      const matchingItems = currentLevelData.filter(item =>
          item.anoSerie === yearSeries &&
          item.disciplina === subject &&
          item.bimestre === bimestre &&
          item.objetosDoConhecimento === knowledgeObject
      );
      const contentsSet = new Set<string>();
      matchingItems.forEach(item => {
           if (typeof item.conteudo === 'string') {
              contentsSet.add(item.conteudo.trim());
           }
      });
      return Array.from(contentsSet).sort();
  }, [selectedLevel, knowledgeObject, bimestre, subject, yearSeries, currentLevelData]);

   // Available Skills based on selected Contents
   const availableSkills = useMemo(() => {
       if (!selectedLevel || !knowledgeObject || !bimestre || !subject || !yearSeries || !currentLevelData.length || selectedContents.length === 0) return [];
       const skillsSet = new Set<string>();
       const matchingItems = currentLevelData.filter(item =>
           item.anoSerie === yearSeries &&
           item.disciplina === subject &&
           item.bimestre === bimestre &&
           item.objetosDoConhecimento === knowledgeObject &&
           selectedContents.includes(item.conteudo) // Filter by selected contents
       );
       matchingItems.forEach(item => {
            if (typeof item.habilidade === 'string') {
               skillsSet.add(item.habilidade.trim());
            }
       });
       return Array.from(skillsSet).sort();
   }, [selectedLevel, knowledgeObject, bimestre, subject, yearSeries, currentLevelData, selectedContents]);


  // --- Reset dependent fields when a higher-level field changes ---
   const handleLevelChange = (value: string) => {
    setSelectedLevel(value as EducationLevel);
    setYearSeries('');
    setSubject('');
    setBimestre('');
    setKnowledgeObject('');
    setSelectedContents([]); // Reset contents
    setSelectedSkills([]); // Reset skills
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
    setSelectedContents([]); // Reset contents
    setSelectedSkills([]); // Reset skills
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
    setSelectedMaterialFile(null); // Reset file
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setBimestre('');
    setKnowledgeObject('');
    setSelectedContents([]); // Reset contents
    setSelectedSkills([]); // Reset skills
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
    setSelectedMaterialFile(null); // Reset file
  };

  const handleBimestreChange = (value: string) => {
      setBimestre(value);
      setKnowledgeObject('');
      setSelectedContents([]); // Reset contents
      setSelectedSkills([]); // Reset skills
      setAulaDuracao('');
      setGeneratedPlan('');
      setSuggestedContent([]);
      setSelectedMaterialFile(null); // Reset file
  };

   const handleKnowledgeObjectChange = (value: string) => {
     setKnowledgeObject(value);
     setSelectedContents([]); // Reset contents when knowledge object changes
     setSelectedSkills([]); // Reset skills when knowledge object changes
     setAulaDuracao('');
     setGeneratedPlan('');
     setSuggestedContent([]);
     setSelectedMaterialFile(null); // Reset file
   };

   // Handle Content Checkbox Change
   const handleContentChange = (content: string, checked: boolean) => {
     setSelectedContents(prev => {
       const newContents = checked
         ? [...prev, content]
         : prev.filter(c => c !== content);

        // IMPORTANT: Reset skills when content selection changes
        setSelectedSkills([]);
        setAulaDuracao('');
        setGeneratedPlan('');
        setSuggestedContent([]);
        setSelectedMaterialFile(null); // Reset file

       return newContents;
     });
   };


  // Handle Skill Checkbox Change
  const handleSkillChange = (skill: string, checked: boolean) => {
    setSelectedSkills(prev =>
      checked ? [...prev, skill] : prev.filter(s => s !== skill)
    );
    // Reset dependent fields if skills change significantly (optional, depends on UX)
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
        // If a level is selected, filter the options
       if (selectedLevel) {
          return isEnsinoMedioNoturno ? aulaDuracaoNoturnoOptions : aulaDuracaoOptions;
       }
       // If no level is selected yet, show no duration options or a placeholder state
       return [];
   }, [selectedLevel, isEnsinoMedioNoturno]);

   // Reset aulaDuracao if the selected option is not available anymore
    useEffect(() => {
        if (aulaDuracao && !currentAulaDuracaoOptions.includes(aulaDuracao)) {
            setAulaDuracao(''); // Reset if the current duration is invalid for the selected level
        }
    }, [currentAulaDuracaoOptions, aulaDuracao]);


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
    if (!selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao) {
      console.error("Por favor, preencha todos os campos obrigatórios (Nível, Ano/Série, Disciplina, Bimestre, Objeto, Conteúdo(s), Habilidade(s), Duração).");
      toast({
          title: "Campos Obrigatórios",
          description: "Preencha todos os campos com '*' e selecione ao menos um Conteúdo e uma Habilidade para gerar o plano.",
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

    // Format selected contents and skills as comma-separated strings for the AI
    const formattedContents = selectedContents.join(', ');
    const formattedSkills = selectedSkills.join(', ');


    const input: GenerateLessonPlanInput = {
      disciplina: subject,
      anoSerie: fullYearSeriesString, // Use the fully constructed string
      habilidade: formattedSkills, // Pass comma-separated skills
      conteudo: formattedContents, // Pass comma-separated contents
      aulaDuracao: aulaDuracao,
      orientacoesAdicionais: additionalInstructions || undefined,
      materialDigitalDataUri: materialDataUri, // Pass the data URI
    };

    try {
      console.log("Sending request to generateLessonPlan with input:", input); // Log before sending
      const response = await generateLessonPlan(input);
      setGeneratedPlan(response.lessonPlan);

      // Suggest additional content based on the formatted contents and full year string
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

  // Function to save the generated plan
  const handleSavePlan = async () => {
      if (!user || !generatedPlan || !selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao) {
          toast({
              title: "Erro ao Salvar",
              description: "Plano de aula ou informações essenciais estão faltando para salvar.",
              variant: "destructive",
          });
          return;
      }

      setIsSavingPlan(true);
      try {
          const planDetails: SavedPlanDetails = {
              userId: user.id, // Or user.username if that's the identifier
              level: selectedLevel,
              yearSeries: fullYearSeriesString,
              subject: subject,
              bimestre: bimestre,
              knowledgeObject: knowledgeObject,
              contents: selectedContents,
              skills: selectedSkills,
              duration: aulaDuracao,
              additionalInstructions: additionalInstructions || undefined,
              generatedPlan: generatedPlan,
              createdAt: new Date().toISOString(), // Store creation date
          };

          await savePlan(planDetails); // Call the save function from the service

          toast({
              title: "Plano Salvo",
              description: "Seu plano de aula foi salvo com sucesso!",
              variant: "default",
          });

      } catch (error) {
          console.error("Error saving lesson plan:", error);
          toast({
              title: "Erro ao Salvar",
              description: `Não foi possível salvar o plano de aula. ${error instanceof Error ? error.message : 'Erro desconhecido.'}`,
              variant: "destructive",
          });
      } finally {
          setIsSavingPlan(false);
      }
  };


  if (authLoading || !user) {
    // Show loading state or redirect handled in useEffect
    return (
       <div className="flex min-h-screen items-center justify-center">
          {/* Loading spinner or skeleton */}
       </div>
    );
  }

   // Consolidate disabling conditions
   const formDisabled = loadingData || generatingPlan || readingFile || showDataMissingAlert || isSavingPlan;
   const generateButtonDisabled = formDisabled || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao; // Updated condition
   const saveButtonDisabled = formDisabled || !generatedPlan || generatingPlan || readingFile; // Disable save if no plan or while generating/reading

  // Helper function to render the generated plan content
   const renderGeneratedPlan = (planText: string) => {
        const lines = planText.split('\n');
        let currentSection = "";
        let contentBlocks: React.ReactNode[] = [];
        let listItems: string[] = [];
        let isInsideList = false;

        const flushList = () => {
            if (listItems.length > 0) {
                contentBlocks.push(
                    <ul key={`list-${contentBlocks.length}`} className="list-disc pl-6 my-2 space-y-1">
                        {listItems.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                );
                listItems = [];
            }
            isInsideList = false;
        };

        lines.forEach((line, index) => {
            line = line.trim();

            // Check if it's a main section title
            const isSectionTitle = SECTION_TITLES.some(title => line.startsWith(title));
             if (isSectionTitle) {
                flushList(); // End any previous list
                currentSection = line;
                contentBlocks.push(
                    <h3 key={`header-${index}`} className="font-semibold text-lg mt-4 mb-2 pt-2 border-t first:border-t-0 first:pt-0">
                        {line.replace(':', '')}
                    </h3>
                );
                return;
            }

            // Check for sub-headers (Bold text ending with ':')
            if (line.startsWith('**') && line.endsWith('**:')) {
                flushList();
                contentBlocks.push(
                    <p key={`subheader-${index}`} className="font-semibold mt-2 mb-1">
                        {line.slice(2, -2)}:
                    </p>
                );
                return;
            }

             // Check for bullet points (* or -)
            if (line.startsWith('* ') || line.startsWith('- ')) {
                if (!isInsideList) {
                    flushList(); // Ensure previous block is rendered if switching to list
                    isInsideList = true;
                }
                listItems.push(line.slice(2));
                return;
            }

            // Check for numbered lists (e.g., 1.)
            if (/^\d+\.\s/.test(line)) {
                 if (!isInsideList) { // Treat numbered lists like bullet points visually for now
                    flushList();
                    isInsideList = true;
                }
                 listItems.push(line.replace(/^\d+\.\s/, '')); // Add content without number
                 return;
            }


            // Check for time estimate
            if (line.startsWith('(') && line.endsWith(')')) {
                flushList();
                contentBlocks.push(
                    <p key={`time-${index}`} className="text-xs text-muted-foreground italic my-1">
                        {line}
                    </p>
                );
                return;
            }

            // Regular paragraph
            if (line) {
                flushList();
                contentBlocks.push(
                    <p key={`para-${index}`} className="my-1">
                        {line}
                    </p>
                );
            }
            // Ignore empty lines for rendering, but they act as separators
            else {
                 flushList(); // Render list if we encounter an empty line
            }

        });

        flushList(); // Flush any remaining list items at the end

        return <div className="prose prose-sm max-w-none dark:prose-invert">{contentBlocks}</div>;
   };


  return (
    <div className="flex flex-col bg-secondary flex-1"> {/* Use flex-1 to take remaining height */}


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

             {/* Content (Conteúdo) - Checkboxes */}
             {availableContents.length > 0 && (
                 <div className="space-y-2">
                     <Label className="flex items-center gap-1"><Library className="h-4 w-4" /> Conteúdo(s) *</Label>
                     <Card className="p-4 bg-muted/50 border border-input">
                         <ScrollArea className="h-[150px]">
                             <div className="space-y-2">
                                 {availableContents.map(contentItem => (
                                     <div key={contentItem} className="flex items-center space-x-2">
                                         <Checkbox
                                             id={`content-${contentItem}`}
                                             checked={selectedContents.includes(contentItem)}
                                             onCheckedChange={(checked) => handleContentChange(contentItem, !!checked)}
                                             disabled={formDisabled || !knowledgeObject}
                                         />
                                         <Label htmlFor={`content-${contentItem}`} className="text-sm font-normal cursor-pointer">
                                             {contentItem}
                                         </Label>
                                     </div>
                                 ))}
                             </div>
                         </ScrollArea>
                     </Card>
                 </div>
             )}


             {/* Skills (Habilidade) - Checkboxes */}
             {availableSkills.length > 0 && (
               <div className="space-y-2">
                 <Label className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> Habilidade(s) *</Label>
                 <Card className="p-4 bg-muted/50 border border-input">
                   <ScrollArea className="h-[150px]">
                     <div className="space-y-2">
                       {availableSkills.map(skill => (
                         <div key={skill} className="flex items-center space-x-2">
                           <Checkbox
                               id={`skill-${skill}`}
                               checked={selectedSkills.includes(skill)}
                               onCheckedChange={(checked) => handleSkillChange(skill, !!checked)}
                               disabled={formDisabled || selectedContents.length === 0} // Disable if no content selected
                           />
                           <Label htmlFor={`skill-${skill}`} className="text-sm font-normal cursor-pointer">
                             {skill}
                           </Label>
                         </div>
                       ))}
                     </div>
                   </ScrollArea>
                 </Card>
                 {selectedContents.length === 0 && <p className="text-xs text-muted-foreground mt-1">Selecione um conteúdo para ver as habilidades.</p>}
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
                 // Enable when skills are selected
                 disabled={formDisabled || selectedSkills.length === 0 || currentAulaDuracaoOptions.length === 0}
               >
                 <SelectTrigger id="aulaDuracao">
                   <SelectValue placeholder={
                       !selectedLevel ? "Selecione o nível primeiro" :
                       selectedSkills.length === 0 ? "Selecione habilidade(s) primeiro" :
                       currentAulaDuracaoOptions.length === 0 ? "Nenhuma duração disponível" :
                       "Selecione a duração"
                   } />
                 </SelectTrigger>
                 <SelectContent>
                   {currentAulaDuracaoOptions.map(dur => (
                     <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
                {/* Optional: Add a note about Noturno duration */}
                {isEnsinoMedioNoturno && <p className="text-xs text-muted-foreground mt-1">Durações específicas para Ensino Médio Noturno.</p>}
                 {!isEnsinoMedioNoturno && selectedLevel && <p className="text-xs text-muted-foreground mt-1">Durações padrão.</p>}
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
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <Bot className="h-6 w-6 text-primary" />
                         <CardTitle className="text-xl">Sugestão da IA</CardTitle>
                    </div>
                     <Button
                         variant="outline"
                         size="sm"
                         onClick={handleSavePlan}
                         disabled={saveButtonDisabled}
                     >
                         <Save className="mr-2 h-4 w-4" />
                         {isSavingPlan ? 'Salvando...' : 'Salvar Plano'}
                     </Button>
                </div>
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
                   <>
                      {/* Render the formatted lesson plan */}
                       {renderGeneratedPlan(generatedPlan)}

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
                    </>
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

