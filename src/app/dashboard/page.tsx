
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react'; // Added Suspense
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot, Clock, CalendarDays, Layers, Paperclip, AlertTriangle, Library, Save, List, RotateCcw, UploadCloud, Pencil } from 'lucide-react'; // Added RotateCcw, UploadCloud, Pencil
import {
    getAllEscopoDataFromStorage,
    type EscopoSequenciaItem,
    EducationLevel,
    EDUCATION_LEVELS,
} from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content';
import { savePlan, updatePlan, getPlanById, type SavedPlanDetails, type SavedPlan } from '@/services/saved-plans'; // Import updatePlan, getPlanById, SavedPlan
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from '@/components/editor/RichTextEditor';
import { marked } from 'marked';

// Duration options
const aulaDuracaoOptions: string[] = [
    '1 aula (45/50 min)',
    '2 aulas (90/100 min)',
    '3 aulas (135/150 min)',
];
const aulaDuracaoNoturnoOptions: string[] = [
    '1 aula Noturno (40 min)',
    '2 aulas Noturno (80 min)',
];

// Wrapper component to use useSearchParams
function DashboardPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook to read query params
  const { toast } = useToast();

  const planIdToEdit = searchParams.get('planId'); // Get planId from URL

  const [allEscopoData, setAllEscopoData] = useState<{ [key in EducationLevel]?: EscopoSequenciaItem[] }>({});
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPlanToEdit, setLoadingPlanToEdit] = useState(false); // State for loading existing plan
  const [showDataMissingAlert, setShowDataMissingAlert] = useState(false);
  const [missingLevels, setMissingLevels] = useState<EducationLevel[]>([]);
  const [currentEditingPlan, setCurrentEditingPlan] = useState<SavedPlan | null>(null); // State for the plan being edited

  // Form State
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | ''>('');
  const [yearSeries, setYearSeries] = useState('');
  const [subject, setSubject] = useState('');
  const [bimestre, setBimestre] = useState('');
  const [knowledgeObject, setKnowledgeObject] = useState('');
  const [selectedContents, setSelectedContents] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [aulaDuracao, setAulaDuracao] = useState<string>('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedMaterialFile, setSelectedMaterialFile] = useState<File | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [editablePlanContent, setEditablePlanContent] = useState<string>('');
  const [suggestingContent, setSuggestingContent] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<string[]>([]);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isPlanGeneratedOrLoaded, setIsPlanGeneratedOrLoaded] = useState(false); // Track if a plan is generated or loaded

  // Get the relevant data based on the selected level
  const currentLevelData = useMemo(() => {
    return selectedLevel ? allEscopoData[selectedLevel] ?? [] : [];
  }, [selectedLevel, allEscopoData]);

  // --- Authentication and Data Loading Effects ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadData = () => {
      setLoadingData(true);
      const data = getAllEscopoDataFromStorage();
      setAllEscopoData(data);
      const hasAnyData = EDUCATION_LEVELS.some(level => data[level] && data[level]!.length > 0);
      const levelsWithoutData = EDUCATION_LEVELS.filter(level => !data[level] || data[level]!.length === 0);
      setMissingLevels(levelsWithoutData);
      setShowDataMissingAlert(!hasAnyData); // Show if NO data for ANY level
      setLoadingData(false);
    };

    if (typeof window !== 'undefined') {
      loadData();
      window.addEventListener('escopoDataUpdated', loadData);
      return () => window.removeEventListener('escopoDataUpdated', loadData);
    } else {
      setLoadingData(false);
      setShowDataMissingAlert(true);
    }
  }, []); // Run only once on mount

  // --- Effect to load plan data if planId exists ---
  useEffect(() => {
    if (planIdToEdit && user) {
      const loadPlan = async () => {
        setLoadingPlanToEdit(true);
        setGeneratingPlan(true); // Use generatingPlan state to disable form while loading
        try {
          const plan = await getPlanById(user.id, planIdToEdit);
          if (plan) {
            setCurrentEditingPlan(plan);
            // Pre-fill form fields from the loaded plan
            setSelectedLevel(plan.level);
            setYearSeries(plan.yearSeries.match(/\d+/)?.[0] || ''); // Extract number
            setSubject(plan.subject);
            setBimestre(plan.bimestre);
            setKnowledgeObject(plan.knowledgeObject);
            setSelectedContents(plan.contents);
            setSelectedSkills(plan.skills);
            setAulaDuracao(plan.duration);
            setAdditionalInstructions(plan.additionalInstructions || '');
            setEditablePlanContent(plan.generatedPlan); // Load HTML content into editor
            setIsPlanGeneratedOrLoaded(true); // Mark as loaded
            toast({ title: "Plano Carregado", description: "Plano carregado para edição." });
          } else {
            toast({ title: "Erro", description: "Plano não encontrado ou você não tem permissão para editá-lo.", variant: "destructive" });
            router.replace('/dashboard'); // Redirect if plan not found
          }
        } catch (error) {
          console.error("Error loading plan for editing:", error);
          toast({ title: "Erro ao Carregar", description: "Não foi possível carregar o plano para edição.", variant: "destructive" });
          router.replace('/dashboard'); // Redirect on error
        } finally {
          setLoadingPlanToEdit(false);
          setGeneratingPlan(false); // Re-enable form
        }
      };
      loadPlan();
    } else {
      // Reset if no planId or navigating away from edit
      resetFields(false); // Don't reset level if just navigating back
    }
    // Dependency on planIdToEdit and user
  }, [planIdToEdit, user, router, toast]);


  // --- Derived options based on selections ---
   const availableYears = useMemo(() => {
     if (!selectedLevel || !currentLevelData.length) return [];
     // Extract year numbers, sort numerically, convert back to string
     const sortedYears = [...new Set(currentLevelData.map(item => parseInt(item.anoSerie)))]
         .filter(year => !isNaN(year)) // Ensure only numbers are parsed
         .sort((a, b) => a - b)
         .map(String); // Convert back to string for Select component value
     return sortedYears;
   }, [selectedLevel, currentLevelData]);

   const availableSubjects = useMemo(() => {
     if (!selectedLevel || !yearSeries || !currentLevelData.length) return [];
     return [...new Set(currentLevelData.filter(item => item.anoSerie === yearSeries).map(item => item.disciplina))].sort();
   }, [selectedLevel, yearSeries, currentLevelData]);

    const availableBimestres = useMemo(() => {
     if (!selectedLevel || !subject || !yearSeries || !currentLevelData.length) return [];
     // Extract bimestre numbers, sort numerically, convert back to string
     const bimestres = [...new Set(currentLevelData
       .filter(item => item.anoSerie === yearSeries && item.disciplina === subject)
       .map(item => parseInt(item.bimestre)))]
       .filter(bim => !isNaN(bim))
       .sort((a, b) => a - b)
       .map(String);
     return bimestres;
   }, [selectedLevel, subject, yearSeries, currentLevelData]);

   const availableKnowledgeObjects = useMemo(() => {
     if (!selectedLevel || !bimestre || !subject || !yearSeries || !currentLevelData.length) return [];
     return [...new Set(currentLevelData
        .filter(item => item.anoSerie === yearSeries && item.disciplina === subject && item.bimestre === bimestre)
        .map(item => item.objetosDoConhecimento))]
        .sort();
   }, [selectedLevel, bimestre, subject, yearSeries, currentLevelData]);

  const availableContents = useMemo(() => {
      if (!selectedLevel || !knowledgeObject || !bimestre || !subject || !yearSeries || !currentLevelData.length) return [];
      const matchingItems = currentLevelData.filter(item =>
          item.anoSerie === yearSeries &&
          item.disciplina === subject &&
          item.bimestre === bimestre &&
          item.objetosDoConhecimento === knowledgeObject
      );
      // Use a Set to automatically handle duplicates, then sort
      const contentsSet = new Set<string>(matchingItems.map(item => item.conteudo?.trim()).filter(Boolean) as string[]);
      return Array.from(contentsSet).sort();
  }, [selectedLevel, knowledgeObject, bimestre, subject, yearSeries, currentLevelData]);


   const availableSkills = useMemo(() => {
       if (!selectedLevel || !knowledgeObject || !bimestre || !subject || !yearSeries || !currentLevelData.length || selectedContents.length === 0) return [];
       const skillsSet = new Set<string>();
       const matchingItems = currentLevelData.filter(item =>
           item.anoSerie === yearSeries &&
           item.disciplina === subject &&
           item.bimestre === bimestre &&
           item.objetosDoConhecimento === knowledgeObject &&
           item.conteudo && // Ensure conteudo exists
           selectedContents.includes(item.conteudo.trim()) // Match against trimmed content
       );
       matchingItems.forEach(item => {
           if (typeof item.habilidade === 'string') {
               skillsSet.add(item.habilidade.trim());
           }
       });
       return Array.from(skillsSet).sort();
   }, [selectedLevel, knowledgeObject, bimestre, subject, yearSeries, currentLevelData, selectedContents]);

  // --- Reset dependent fields ---
  const resetFields = (fullReset = true) => {
     if (fullReset) setSelectedLevel('');
    setYearSeries('');
    setSubject('');
    setBimestre('');
    setKnowledgeObject('');
    setSelectedContents([]);
    setSelectedSkills([]);
    setAulaDuracao('');
    setAdditionalInstructions('');
    setEditablePlanContent('');
    setIsPlanGeneratedOrLoaded(false);
    setSuggestedContent([]);
    setSelectedMaterialFile(null);
     setCurrentEditingPlan(null); // Clear the plan being edited
     // If resetting due to navigation (not full reset), keep level?
     if (!fullReset && router) {
         // Keep current level if not a full reset? Maybe not needed if logic handles it.
     } else if (fullReset && router) {
        router.replace('/dashboard', undefined); // Remove planId from URL on full reset
     }
  }

   // Helper to determine if editing
   const isEditing = !!currentEditingPlan;

   // Reset fields when selections change, *unless* initially loading the plan
   const handleFieldChangeReset = () => {
       if (loadingPlanToEdit) return; // Don't reset while loading the plan to edit
       setEditablePlanContent('');
       setIsPlanGeneratedOrLoaded(false);
       setSuggestedContent([]);
        // If the user changes a field *while* editing, we stop "editing" that specific saved plan
        // and revert to "generate new" or "update current unsaved" mode.
       if (isEditing) {
            setCurrentEditingPlan(null); // No longer editing the specific saved plan ID
            router.replace('/dashboard', undefined); // Remove planId from URL
            // Keep the modified form fields, but clear the generated plan content
       }

   }

  const handleLevelChange = (value: string) => { setSelectedLevel(value as EducationLevel); resetFields(false); }; // Don't fully reset URL
  const handleYearChange = (value: string) => { setYearSeries(value); setSubject(''); setBimestre(''); setKnowledgeObject(''); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); handleFieldChangeReset(); };
  const handleSubjectChange = (value: string) => { setSubject(value); setBimestre(''); setKnowledgeObject(''); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); handleFieldChangeReset(); };
  const handleBimestreChange = (value: string) => { setBimestre(value); setKnowledgeObject(''); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); handleFieldChangeReset(); };
  const handleKnowledgeObjectChange = (value: string) => { setKnowledgeObject(value); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); handleFieldChangeReset(); };
  const handleContentChange = (content: string, checked: boolean) => { setSelectedContents(prev => { const newContents = checked ? [...prev, content] : prev.filter(c => c !== content); setSelectedSkills([]); setAulaDuracao(''); handleFieldChangeReset(); return newContents; }); };
  const handleSkillChange = (skill: string, checked: boolean) => { setSelectedSkills(prev => checked ? [...prev, skill] : prev.filter(s => s !== skill)); setAulaDuracao(''); handleFieldChangeReset(); };
  const handleDurationChange = (value: string) => { setAulaDuracao(value); handleFieldChangeReset(); };
  const handleMaterialFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files?.[0]) { setSelectedMaterialFile(event.target.files[0]); } else { setSelectedMaterialFile(null); } handleFieldChangeReset(); };
  const handleInstructionsChange = (value: string) => { setAdditionalInstructions(value); /* Don't reset plan on instruction change */ };


  const isEnsinoMedioNoturno = useMemo(() => selectedLevel === 'Ensino Médio Noturno', [selectedLevel]);
  const currentAulaDuracaoOptions = useMemo(() => selectedLevel ? (isEnsinoMedioNoturno ? aulaDuracaoNoturnoOptions : aulaDuracaoOptions) : [], [selectedLevel, isEnsinoMedioNoturno]);

  useEffect(() => { if (aulaDuracao && !currentAulaDuracaoOptions.includes(aulaDuracao)) { setAulaDuracao(''); handleFieldChangeReset(); } }, [currentAulaDuracaoOptions, aulaDuracao, loadingPlanToEdit]); // Add loadingPlanToEdit dependency

  const formatYearSeriesDisplay = (year: string, level: EducationLevel | ''): string => { if (!year || !level) return year; const yearNum = parseInt(year); if (isNaN(yearNum)) return year; if (level.includes('Anos')) return `${yearNum}º ano`; if (level.includes('Médio')) return `${yearNum}ª série`; return year; };
  const formatBimestreDisplay = (bimestreNum: string): string => bimestreNum ? `${bimestreNum}º Bimestre` : '';

  const fullYearSeriesString = useMemo(() => {
      if (!yearSeries || !selectedLevel) return '';
      const yearPart = formatYearSeriesDisplay(yearSeries, selectedLevel);
      let levelPart = '';
      if (selectedLevel.includes('Fundamental')) levelPart = ' do Ensino Fundamental';
      else if (selectedLevel.includes('Médio')) levelPart = ' do Ensino Médio';
      if (selectedLevel === 'Ensino Médio Noturno') levelPart += ' Noturno';
      if (selectedLevel.startsWith('Ensino Médio Técnico')) levelPart += ' Técnico';
      return `${yearPart}${levelPart}`;
  }, [yearSeries, selectedLevel]);

   const readFileAsDataUri = (file: File): Promise<string> => {
       return new Promise((resolve, reject) => {
           const reader = new FileReader();
           reader.onload = () => resolve(reader.result as string);
           reader.onerror = (error) => reject(error);
           reader.readAsDataURL(file);
       });
   };

  // Function to convert Markdown (used in AI response) to HTML
  const markdownToHtml = (markdown: string): string => {
      try {
        // Basic sanitization
        const sanitizedMarkdown = markdown
            .replace(/<script.*?>.*?<\/script>/gis, '')
            .replace(/ on\w+="[^"]*"/g, '');

        // Configure marked
        const renderer = new marked.Renderer();
        // Customize heading rendering for consistent spacing/styling in editor
        renderer.heading = (text, level) => {
            const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${escapedText}" class="mt-4 mb-2 font-semibold">${text}</h${level}>\n`;
        };
        // Customize list rendering for better spacing
        renderer.list = (body, ordered) => {
            const tag = ordered ? 'ol' : 'ul';
            // Add margin bottom to lists
            return `<${tag} class="mb-3 pl-6 list-${ordered ? 'decimal' : 'disc'}">${body}</${tag}>\n`;
        };
        renderer.listitem = (text) => {
            // Add margin bottom to list items
            return `<li class="mb-1">${text}</li>\n`;
        };
        // Customize paragraph rendering
        renderer.paragraph = (text) => {
            // Add margin bottom to paragraphs, unless it's inside a list item (handled by li margin)
            if (text.includes('<li')) { // Basic check, might need refinement
                 return `${text}\n`;
            }
             return `<p class="mb-2">${text}</p>\n`;
        };

        return marked.parse(sanitizedMarkdown, { renderer, breaks: true, gfm: true });
      } catch (error) {
          console.error("Error converting markdown to HTML:", error);
          return `<p><strong>Erro ao processar o plano recebido.</strong> Por favor, tente gerar novamente.</p><p><small>Detalhe técnico: ${error instanceof Error ? error.message : String(error)}</small></p>`;
      }
  };


  const handleGeneratePlan = async () => {
    if (!selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao) {
      toast({ title: "Campos Obrigatórios", description: "Preencha todos os campos com '*' e selecione ao menos um Conteúdo e uma Habilidade.", variant: "destructive" });
      return;
    }

    setGeneratingPlan(true);
    setReadingFile(true);
    setEditablePlanContent(''); // Clear editor
    setIsPlanGeneratedOrLoaded(false);
    setSuggestingContent(false);
    setSuggestedContent([]);
    setCurrentEditingPlan(null); // Generating new plan, not editing existing one anymore
    router.replace('/dashboard', undefined); // Remove planId from URL

    let materialDataUri: string | undefined = undefined;
    if (selectedMaterialFile) {
        try { materialDataUri = await readFileAsDataUri(selectedMaterialFile); }
        catch (error) {
            console.error("Error reading material file:", error);
            toast({ title: "Erro ao Ler Arquivo", description: `Não foi possível ler o arquivo de material anexado. Verifique o arquivo e tente novamente. Detalhe: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, variant: "destructive", duration: 7000 });
            setReadingFile(false); setGeneratingPlan(false); return;
        }
    }
    setReadingFile(false);

    const formattedContents = selectedContents.map(c => c.trim()).join(', ');
    const formattedSkills = selectedSkills.map(s => s.trim()).join(', ');

    const input: GenerateLessonPlanInput = {
      disciplina: subject, anoSerie: fullYearSeriesString, habilidade: formattedSkills,
      conteudo: formattedContents, aulaDuracao: aulaDuracao, orientacoesAdicionais: additionalInstructions || undefined,
      materialDigitalDataUri: materialDataUri,
    };

    try {
      console.log("[Dashboard] Sending request to generateLessonPlan with input:", { ...input, materialDigitalDataUri: input.materialDigitalDataUri ? 'Present' : 'Not present' });
      const response = await generateLessonPlan(input);

      if (!response || !response.lessonPlan) {
          throw new Error("A resposta da IA está vazia ou em formato inválido.");
      }

      const htmlContent = markdownToHtml(response.lessonPlan);
      setEditablePlanContent(htmlContent);
      setIsPlanGeneratedOrLoaded(true);
      console.log("[Dashboard] Lesson plan generated successfully.");
      toast({ title: "Plano Gerado", description: "O plano de aula foi gerado. Edite-o abaixo.", variant: "default" });

      // Suggest content after successful generation
      handleSuggestContent(input.conteudo, input.anoSerie, input.disciplina, response.lessonPlan);

    } catch (error: any) {
      console.error("[Dashboard] Error generating lesson plan:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorHtml = `<p><strong>Erro ao gerar o plano de aula:</strong></p><p>${errorMessage}</p><p><small>Verifique os detalhes no console ou tente novamente.</small></p>`;
      setEditablePlanContent(errorHtml);
      setIsPlanGeneratedOrLoaded(true); // Show error in editor
      toast({ title: "Erro na Geração", description: `Falha ao gerar o plano: ${errorMessage}`, variant: "destructive", duration: 10000 });
    } finally {
      setGeneratingPlan(false);
    }
  };

   const handleSuggestContent = async (topic: string, gradeLevel: string, subject: string, currentContent: string) => {
     setSuggestingContent(true); setSuggestedContent([]);
     try {
       const input: SuggestAdditionalContentInput = { topic, gradeLevel, subject, currentContent };
       const response = await suggestAdditionalContent(input);
       setSuggestedContent(response.additionalContentSuggestions);
     } catch (error) {
       console.error("Error suggesting content:", error);
        toast({ title: "Erro nas Sugestões", description: `Não foi possível buscar sugestões de conteúdo. ${error instanceof Error ? error.message : 'Tente novamente.'}`, variant: "destructive" });
     } finally { setSuggestingContent(false); }
   };

  // Function to save or update the plan
  const handleSaveOrUpdatePlan = async () => {
      if (!user || !editablePlanContent || !selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao) {
          toast({ title: "Erro ao Salvar", description: "Não é possível salvar. Verifique se um plano foi gerado/carregado e se todas as informações essenciais do formulário estão preenchidas.", variant: "destructive", duration: 7000 });
          return;
      }

      if (editablePlanContent.includes("Erro ao gerar o plano de aula:")) {
          toast({ title: "Erro no Plano", description: "Não é possível salvar um plano que resultou em erro. Por favor, gere ou carregue um plano válido primeiro.", variant: "destructive" });
          return;
      }

      setIsSavingPlan(true);
      try {
          const planData: SavedPlanDetails = {
              userId: user.id, level: selectedLevel, yearSeries: fullYearSeriesString, subject, bimestre,
              knowledgeObject, contents: selectedContents, skills: selectedSkills, duration: aulaDuracao,
              additionalInstructions: additionalInstructions || undefined,
              generatedPlan: editablePlanContent, // Save the HTML content from the editor
              createdAt: currentEditingPlan?.createdAt || new Date().toISOString(), // Keep original creation date if updating
          };

          if (currentEditingPlan?.id) {
              // Update existing plan
              const planToUpdate: SavedPlan = {
                  ...planData,
                  id: currentEditingPlan.id,
                  // updatedAt will be set by the updatePlan function
              };
              await updatePlan(user.id, planToUpdate);
              toast({ title: "Plano Atualizado", description: "Seu plano de aula foi atualizado com sucesso!", variant: "default" });
          } else {
              // Save new plan
              const savedPlan = await savePlan(planData);
              setCurrentEditingPlan(savedPlan); // Set the current plan to the newly saved one
              // Update URL to reflect the new plan ID for potential further edits
              router.replace(`/dashboard?planId=${savedPlan.id}`, undefined);
              toast({ title: "Plano Salvo", description: "Seu plano de aula foi salvo com sucesso!", variant: "default" });
          }
      } catch (error) {
          console.error(`Error ${currentEditingPlan ? 'updating' : 'saving'} lesson plan:`, error);
          toast({ title: `Erro ao ${currentEditingPlan ? 'Atualizar' : 'Salvar'}`, description: `Não foi possível ${currentEditingPlan ? 'atualizar' : 'salvar'} o plano. ${error instanceof Error ? error.message : 'Erro desconhecido.'}`, variant: "destructive" });
      } finally { setIsSavingPlan(false); }
  };

  // Update editor content when user edits
  const handleEditorChange = (htmlContent: string) => {
    setEditablePlanContent(htmlContent);
  };

  // Loading state for the whole page or just the plan loading part
   if (authLoading || !user) {
    return <DashboardLoadingSkeleton />; // Use a separate skeleton component
   }


   const formDisabled = loadingData || generatingPlan || readingFile || showDataMissingAlert || isSavingPlan || loadingPlanToEdit;
   const generateButtonDisabled = formDisabled || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao;
   // Enable save only if a plan has been generated/loaded and not currently saving/generating/reading
   const saveButtonDisabled = formDisabled || !isPlanGeneratedOrLoaded || generatingPlan || readingFile;
   const pageTitle = isEditing ? "Editar Plano de Aula" : "Gerar Plano de Aula";
   const saveButtonText = isEditing ? (isSavingPlan ? 'Atualizando...' : 'Atualizar Plano') : (isSavingPlan ? 'Salvando...' : 'Salvar Novo Plano');
   const generateButtonIcon = isEditing ? <RotateCcw /> : <Bot />;
   const saveButtonIcon = isEditing ? <Save /> : <UploadCloud />;


  return (
    <div className="flex flex-col bg-secondary flex-1">
       <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Data Missing Alert */}
         {showDataMissingAlert && !loadingData && ( <div className="lg:col-span-2"> <Alert variant="destructive"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Dados Não Encontrados</AlertTitle> <AlertDescription> {user?.username === 'admin' ? (<> Nenhum dado do Escopo-Sequência foi encontrado. Vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para carregar os arquivos XLSX. {missingLevels.length > 0 && <p className="mt-1 text-xs">Níveis faltando: {missingLevels.join(', ')}</p>} </>) : ( "Dados necessários não disponíveis. Contacte o administrador." )} </AlertDescription> </Alert> </div> )}
          {!showDataMissingAlert && missingLevels.length > 0 && user?.username === 'admin' && !loadingData && ( <div className="lg:col-span-2"> <Alert variant="default" className="border-yellow-500 text-yellow-700 [&>svg]:text-yellow-500 dark:border-yellow-600 dark:text-yellow-300 dark:[&>svg]:text-yellow-600 bg-yellow-50 dark:bg-yellow-950"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Dados Incompletos</AlertTitle> <AlertDescription> Dados do Escopo-Sequência estão faltando para: <strong>{missingLevels.join(', ')}</strong>. Vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para carregá-los. </AlertDescription> </Alert> </div> )}

        {/* Left Column: Form */}
        <Card className={`shadow-md ${formDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
                {isEditing ? <Pencil className="h-6 w-6 text-primary" /> : <GraduationCap className="h-6 w-6 text-primary" />}
                 {pageTitle}
             </CardTitle>
            <CardDescription>Selecione as opções e edite o plano gerado pela IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Education Level */}
            <div className="space-y-2"> <Label htmlFor="levelSelect" className="flex items-center gap-1"><Layers className="h-4 w-4" /> Nível de Ensino *</Label> <Select value={selectedLevel} onValueChange={handleLevelChange} disabled={formDisabled}> <SelectTrigger id="levelSelect"> <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o nível"} /> </SelectTrigger> <SelectContent> {EDUCATION_LEVELS.map(level => ( <SelectItem key={level} value={level} disabled={missingLevels.includes(level)}> {level} {missingLevels.includes(level) ? '(Dados não carregados)' : ''} </SelectItem> ))} </SelectContent> </Select> </div>
            {/* Year/Series */}
            <div className="space-y-2"> <Label htmlFor="yearSeries" className="flex items-center gap-1"><BookCopy className="h-4 w-4" /> Ano/Série *</Label> <Select value={yearSeries} onValueChange={handleYearChange} disabled={formDisabled || !selectedLevel}> <SelectTrigger id="yearSeries"> <SelectValue placeholder={loadingData ? "Carregando..." : (!selectedLevel ? "Selecione nível" : "Selecione ano/série")} /> </SelectTrigger> <SelectContent> {availableYears.map(year => ( <SelectItem key={year} value={year}>{formatYearSeriesDisplay(year, selectedLevel)}</SelectItem> ))} </SelectContent> </Select> </div>
            {/* Subject (Disciplina) */}
            <div className="space-y-2"> <Label htmlFor="subject" className="flex items-center gap-1"><BookCopy className="h-4 w-4" /> Disciplina *</Label> <Select value={subject} onValueChange={handleSubjectChange} disabled={formDisabled || !yearSeries}> <SelectTrigger id="subject"> <SelectValue placeholder={!yearSeries ? "Selecione ano/série" : "Selecione a disciplina"} /> </SelectTrigger> <SelectContent> <ScrollArea className="h-[200px]"> {availableSubjects.map(sub => ( <SelectItem key={sub} value={sub}>{sub}</SelectItem> ))} </ScrollArea> </SelectContent> </Select> </div>
            {/* Bimester (Bimestre) */}
            <div className="space-y-2"> <Label htmlFor="bimestre" className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Bimestre *</Label> <Select value={bimestre} onValueChange={handleBimestreChange} disabled={formDisabled || !subject}> <SelectTrigger id="bimestre"> <SelectValue placeholder={!subject ? "Selecione disciplina" : "Selecione o bimestre"} /> </SelectTrigger> <SelectContent> {availableBimestres.map(bim => ( <SelectItem key={bim} value={bim}>{formatBimestreDisplay(bim)}</SelectItem> ))} </SelectContent> </Select> </div>
            {/* Knowledge Object */}
            <div className="space-y-2"> <Label htmlFor="knowledgeObject" className="flex items-center gap-1"><Target className="h-4 w-4" /> Objeto de Conhecimento *</Label> <Select value={knowledgeObject} onValueChange={handleKnowledgeObjectChange} disabled={formDisabled || !bimestre}> <SelectTrigger id="knowledgeObject"> <SelectValue placeholder={!bimestre ? "Selecione bimestre" : "Selecione o objeto"} /> </SelectTrigger> <SelectContent> <ScrollArea className="h-[200px]"> {availableKnowledgeObjects.map(obj => ( <SelectItem key={obj} value={obj}>{obj}</SelectItem> ))} </ScrollArea> </SelectContent> </Select> </div>
            {/* Content Checkboxes */}
             {availableContents.length > 0 && ( <div className="space-y-2"> <Label className="flex items-center gap-1"><Library className="h-4 w-4" /> Conteúdo(s) *</Label> <Card className="p-4 bg-muted/50 border border-input"> <ScrollArea className="h-[150px]"> <div className="space-y-2"> {availableContents.map(contentItem => ( <div key={contentItem} className="flex items-center space-x-2"> <Checkbox id={`content-${contentItem}`} checked={selectedContents.includes(contentItem)} onCheckedChange={(checked) => handleContentChange(contentItem, !!checked)} disabled={formDisabled || !knowledgeObject} /> <Label htmlFor={`content-${contentItem}`} className="text-sm font-normal cursor-pointer"> {contentItem} </Label> </div> ))} </div> </ScrollArea> </Card> </div> )}
             {/* Skills Checkboxes */}
             {availableSkills.length > 0 && ( <div className="space-y-2"> <Label className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> Habilidade(s) *</Label> <Card className="p-4 bg-muted/50 border border-input"> <ScrollArea className="h-[150px]"> <div className="space-y-2"> {availableSkills.map(skill => ( <div key={skill} className="flex items-center space-x-2"> <Checkbox id={`skill-${skill}`} checked={selectedSkills.includes(skill)} onCheckedChange={(checked) => handleSkillChange(skill, !!checked)} disabled={formDisabled || selectedContents.length === 0} /> <Label htmlFor={`skill-${skill}`} className="text-sm font-normal cursor-pointer"> {skill} </Label> </div> ))} </div> </ScrollArea> </Card> {selectedContents.length === 0 && <p className="text-xs text-muted-foreground mt-1">Selecione conteúdo(s) para ver habilidades.</p>} </div> )}
            {/* Lesson Duration */}
             <div className="space-y-2"> <Label htmlFor="aulaDuracao" className="flex items-center gap-1"><Clock className="h-4 w-4" /> Duração da Aula *</Label> <Select value={aulaDuracao} onValueChange={handleDurationChange} disabled={formDisabled || selectedSkills.length === 0 || currentAulaDuracaoOptions.length === 0}> <SelectTrigger id="aulaDuracao"> <SelectValue placeholder={ !selectedLevel ? "Selecione nível" : selectedSkills.length === 0 ? "Selecione habilidade(s)" : currentAulaDuracaoOptions.length === 0 ? "Nenhuma duração" : "Selecione a duração" } /> </SelectTrigger> <SelectContent> {currentAulaDuracaoOptions.map(dur => ( <SelectItem key={dur} value={dur}>{dur}</SelectItem> ))} </SelectContent> </Select> {isEnsinoMedioNoturno && <p className="text-xs text-muted-foreground mt-1">Durações para Noturno.</p>} {!isEnsinoMedioNoturno && selectedLevel && <p className="text-xs text-muted-foreground mt-1">Durações padrão.</p>} </div>
            {/* Additional Instructions */}
             <div className="space-y-2"> <Label htmlFor="additionalInstructions" className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Orientações Adicionais</Label> <Textarea id="additionalInstructions" placeholder="Ex: turma com dificuldades, usar recursos específicos, foco em atividade prática..." value={additionalInstructions} onChange={(e) => handleInstructionsChange(e.target.value)} rows={3} disabled={formDisabled} /> </div>
             {/* File Attachment */}
             <div className="space-y-2"> <Label htmlFor="materialFile" className="flex items-center gap-1"><Paperclip className="h-4 w-4" /> Anexar Material (Opcional)</Label> <Input id="materialFile" type="file" onChange={handleMaterialFileChange} disabled={formDisabled || isEditing} /* Disable file input when editing */ title={isEditing ? "Anexo não pode ser alterado ao editar" : ""} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" /> {selectedMaterialFile && ( <p className="text-xs text-muted-foreground mt-1"> Arquivo: {selectedMaterialFile.name} ({(selectedMaterialFile.size / 1024 / 1024).toFixed(2)} MB) {selectedMaterialFile.size > 4 * 1024 * 1024 && <span className="text-destructive ml-2">(Atenção: Arquivos grandes podem falhar)</span>} </p> )} {isEditing && <p className="text-xs text-muted-foreground mt-1">Anexo não pode ser alterado ao editar um plano existente.</p>} </div>
             {/* Generate/Regenerate Button */}
             <Button onClick={handleGeneratePlan} disabled={generateButtonDisabled} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"> {generateButtonIcon} {readingFile ? 'Lendo Anexo...' : generatingPlan ? 'Gerando com IA...' : (isEditing ? 'Regerar com IA (Descarta Edições)' : 'Gerar Plano com IA')} </Button>
             {/* Display warning if regenerating */}
             {isEditing && isPlanGeneratedOrLoaded && <p className="text-xs text-destructive text-center mt-1">Regerar descartará as edições feitas no plano atual.</p>}
          </CardContent>
        </Card>

         {/* Right Column: AI Response & Editor */}
         <Card className="shadow-md flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2"> <Bot className="h-6 w-6 text-primary" /> <CardTitle className="text-xl">Plano Gerado e Editor</CardTitle> </div>
                      <Button variant="outline" size="sm" onClick={handleSaveOrUpdatePlan} disabled={saveButtonDisabled}> {saveButtonIcon} {saveButtonText} </Button>
                </div>
                <CardDescription>
                   {isEditing ? "Edite o plano carregado ou regere com a IA." : "O plano gerado pela IA aparecerá aqui para você editar e salvar."}
                 </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
                 {(generatingPlan || readingFile || loadingPlanToEdit) ? (
                    <div className="space-y-4 p-4 flex-1 flex flex-col items-center justify-center text-center">
                         <Bot className="h-12 w-12 text-primary animate-bounce mb-4" />
                         <p className="text-lg font-semibold text-primary">
                           {loadingPlanToEdit ? 'Carregando plano para edição...' : readingFile ? 'Processando anexo...' : 'Gerando seu plano de aula...'}
                         </p>
                         <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos.</p>
                         <Skeleton className="h-4 w-3/4 mt-6" />
                         <Skeleton className="h-4 w-1/2 mt-2" />
                         <Skeleton className="h-20 w-full mt-4" />
                    </div>
                ) : isPlanGeneratedOrLoaded ? (
                   <>
                       {/* Editor Component */}
                       <RichTextEditor content={editablePlanContent} onChange={handleEditorChange} />

                       {/* Display Suggested Content below the editor */}
                        {suggestingContent ? (
                             <div className="mt-4 space-y-2 border-t pt-3 px-4 pb-2">
                                <p className="font-semibold text-md">Sugerindo conteúdo adicional...</p>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : suggestedContent.length > 0 ? (
                             <div className="mt-4 border-t pt-3 px-4 pb-2">
                                <p className="font-semibold text-md mb-2">Sugestões de Conteúdo Adicional:</p>
                                <ScrollArea className="h-[80px]">
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {suggestedContent.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </div>
                        ) : !generatingPlan && !readingFile && !suggestingContent && !editablePlanContent.includes("Erro ao gerar") ? (
                             <div className="mt-4 border-t pt-3 px-4 pb-2">
                                <p className="text-sm text-muted-foreground">Nenhuma sugestão de conteúdo adicional encontrada ou aplicável.</p>
                             </div>
                        ) : null }
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border rounded-md bg-muted/30">
                         <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            {showDataMissingAlert
                                ? (user?.username === 'admin' ? "Dados do escopo não encontrados. Carregue os arquivos nas configurações." : "Dados necessários não disponíveis. Contate o administrador.")
                                : "Selecione as opções no formulário ao lado e clique em \"Gerar Plano de Aula\" ou carregue um plano existente na aba \"Meus Planos\"."}
                         </p>
                         {loadingData && <p className="text-sm text-primary mt-2">Carregando dados do escopo...</p>}
                     </div>
                )}
            </CardContent>
         </Card>
      </main>
    </div>
  );
}

// Skeleton component for initial page load
function DashboardLoadingSkeleton() {
    return (
      <div className="flex min-h-screen flex-col bg-secondary">
         <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
             <div className="flex items-center gap-4"> <div className="w-10 h-10"></div> <div className="flex items-center gap-2"> <BookOpenCheck className="h-7 w-7 text-primary" /> <h1 className="text-xl font-semibold text-primary">redocêncIA</h1> </div> </div>
             <div className="flex items-center gap-4"> <Skeleton className="h-5 w-24 hidden sm:inline" /> <Skeleton className="h-8 w-8 rounded-full" /> <Skeleton className="h-8 w-8 rounded-full" /> <Skeleton className="h-8 w-8 rounded-full" /> </div>
         </header>
         <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="shadow-md"> <CardHeader> <Skeleton className="h-7 w-48 mb-1" /> <Skeleton className="h-4 w-64" /> </CardHeader> <CardContent className="space-y-4"> {[...Array(9)].map((_, i) => ( <div key={i} className="space-y-2"> <Skeleton className="h-4 w-1/4" /> <Skeleton className={`h-${i === 5 ? 12 : i === 7 ? 20 : 10} w-full`} /> </div> ))} <Skeleton className="h-10 w-full mt-4" /> </CardContent> </Card>
           <Card className="shadow-md flex flex-col"> <CardHeader> <Skeleton className="h-7 w-40 mb-1" /> <Skeleton className="h-4 w-56" /> </CardHeader> <CardContent className="flex-1 overflow-hidden"> <div className="space-y-4"> <Skeleton className="h-4 w-3/4" /> <Skeleton className="h-4 w-1/2" /> <Skeleton className="h-20 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-5/6" /> <Skeleton className="h-4 w-full mt-6 pt-4 border-t" /> <Skeleton className="h-4 w-3/4" /> </div> </CardContent> </Card>
         </main>
      </div>
     );
}

// Export the main component wrapped in Suspense for searchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}

