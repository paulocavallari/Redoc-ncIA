
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot, Clock, CalendarDays, Layers, Paperclip, AlertTriangle, Library, Save, List } from 'lucide-react';
import {
    getAllEscopoDataFromStorage,
    type EscopoSequenciaItem,
    EducationLevel,
    EDUCATION_LEVELS,
} from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content';
import { savePlan, type SavedPlanDetails } from '@/services/saved-plans';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import RichTextEditor from '@/components/editor/RichTextEditor'; // Import the editor
import { marked } from 'marked'; // Import marked for markdown to HTML conversion

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

// Main section titles (less critical now with editor)
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
  const { toast } = useToast();

  const [allEscopoData, setAllEscopoData] = useState<{ [key in EducationLevel]?: EscopoSequenciaItem[] }>({});
  const [loadingData, setLoadingData] = useState(true);
  const [showDataMissingAlert, setShowDataMissingAlert] = useState(false);
  const [missingLevels, setMissingLevels] = useState<EducationLevel[]>([]);

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
  // const [generatedPlan, setGeneratedPlan] = useState(''); // Keep for raw AI output reference if needed, or remove
  const [editablePlanContent, setEditablePlanContent] = useState<string>(''); // State for the editor content (HTML)
  const [suggestingContent, setSuggestingContent] = useState(false);
  const [suggestedContent, setSuggestedContent] = useState<string[]>([]);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isPlanGenerated, setIsPlanGenerated] = useState(false); // Track if a plan has been generated

  // Get the relevant data based on the selected level
  const currentLevelData = useMemo(() => {
    return selectedLevel ? allEscopoData[selectedLevel] ?? [] : [];
  }, [selectedLevel, allEscopoData]);

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
       setShowDataMissingAlert(!hasAnyData && (user?.username === 'admin' || user?.username !== 'admin'));
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
  }, [user]);

  // --- Derived options based on selections ---
   const availableYears = useMemo(() => {
     if (!selectedLevel || !currentLevelData.length) return [];
     const sortedYears = [...new Set(currentLevelData.map(item => item.anoSerie))]
         .sort((a, b) => parseInt(a) - parseInt(b));
     return sortedYears;
   }, [selectedLevel, currentLevelData]);

   const availableSubjects = useMemo(() => {
     if (!selectedLevel || !yearSeries || !currentLevelData.length) return [];
     return [...new Set(currentLevelData.filter(item => item.anoSerie === yearSeries).map(item => item.disciplina))].sort();
   }, [selectedLevel, yearSeries, currentLevelData]);

    const availableBimestres = useMemo(() => {
     if (!selectedLevel || !subject || !yearSeries || !currentLevelData.length) return [];
     const bimestres = [...new Set(currentLevelData
       .filter(item => item.anoSerie === yearSeries && item.disciplina === subject)
       .map(item => item.bimestre)
       )].sort((a, b) => parseInt(a) - parseInt(b));
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
      const contentsSet = new Set<string>();
      matchingItems.forEach(item => { if (typeof item.conteudo === 'string') { contentsSet.add(item.conteudo.trim()); } });
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
           selectedContents.includes(item.conteudo)
       );
       matchingItems.forEach(item => { if (typeof item.habilidade === 'string') { skillsSet.add(item.habilidade.trim()); } });
       return Array.from(skillsSet).sort();
   }, [selectedLevel, knowledgeObject, bimestre, subject, yearSeries, currentLevelData, selectedContents]);

  // --- Reset dependent fields ---
  const resetFields = () => {
    setYearSeries('');
    setSubject('');
    setBimestre('');
    setKnowledgeObject('');
    setSelectedContents([]);
    setSelectedSkills([]);
    setAulaDuracao('');
    // setGeneratedPlan(''); // Keep raw output if needed
    setEditablePlanContent(''); // Clear editor content
    setIsPlanGenerated(false); // Reset generated flag
    setSuggestedContent([]);
    setSelectedMaterialFile(null);
  }

  const handleLevelChange = (value: string) => { setSelectedLevel(value as EducationLevel); resetFields(); };
  const handleYearChange = (value: string) => { setYearSeries(value); setSubject(''); setBimestre(''); setKnowledgeObject(''); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); setSelectedMaterialFile(null); };
  const handleSubjectChange = (value: string) => { setSubject(value); setBimestre(''); setKnowledgeObject(''); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); setSelectedMaterialFile(null); };
  const handleBimestreChange = (value: string) => { setBimestre(value); setKnowledgeObject(''); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); setSelectedMaterialFile(null); };
  const handleKnowledgeObjectChange = (value: string) => { setKnowledgeObject(value); setSelectedContents([]); setSelectedSkills([]); setAulaDuracao(''); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); setSelectedMaterialFile(null); };
  const handleContentChange = (content: string, checked: boolean) => { setSelectedContents(prev => { const newContents = checked ? [...prev, content] : prev.filter(c => c !== content); setSelectedSkills([]); setAulaDuracao(''); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); setSelectedMaterialFile(null); return newContents; }); };
  const handleSkillChange = (skill: string, checked: boolean) => { setSelectedSkills(prev => checked ? [...prev, skill] : prev.filter(s => s !== skill)); setAulaDuracao(''); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); setSelectedMaterialFile(null); };
  const handleDurationChange = (value: string) => { setAulaDuracao(value); setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); };
  const handleMaterialFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files?.[0]) { setSelectedMaterialFile(event.target.files[0]); } else { setSelectedMaterialFile(null); } setEditablePlanContent(''); setIsPlanGenerated(false); setSuggestedContent([]); };

  const isEnsinoMedioNoturno = useMemo(() => selectedLevel === 'Ensino Médio Noturno', [selectedLevel]);
  const currentAulaDuracaoOptions = useMemo(() => selectedLevel ? (isEnsinoMedioNoturno ? aulaDuracaoNoturnoOptions : aulaDuracaoOptions) : [], [selectedLevel, isEnsinoMedioNoturno]);

  useEffect(() => { if (aulaDuracao && !currentAulaDuracaoOptions.includes(aulaDuracao)) { setAulaDuracao(''); } }, [currentAulaDuracaoOptions, aulaDuracao]);

  const formatYearSeriesDisplay = (year: string, level: EducationLevel | ''): string => { if (!year || !level) return year; if (level.includes('Anos')) return `${year}º ano`; if (level.includes('Médio')) return `${year}ª série`; return year; };
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
        // Basic sanitization: Remove potential script tags or dangerous attributes
        const sanitizedMarkdown = markdown
            .replace(/<script.*?>.*?<\/script>/gis, '') // Remove script tags
            .replace(/ on\w+="[^"]*"/g, ''); // Remove event handlers like onclick etc.

        return marked.parse(sanitizedMarkdown, { breaks: true, gfm: true }); // Enable breaks and GitHub Flavored Markdown
      } catch (error) {
          console.error("Error converting markdown to HTML:", error);
          return `<p>Erro ao converter markdown: ${markdown}</p>`; // Fallback
      }
  };


  const handleGeneratePlan = async () => {
    if (!selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao) {
      toast({ title: "Campos Obrigatórios", description: "Preencha todos os campos com '*' e selecione ao menos um Conteúdo e uma Habilidade.", variant: "destructive" });
      return;
    }

    setGeneratingPlan(true);
    setReadingFile(true);
    // setGeneratedPlan(''); // Clear raw plan if keeping it
    setEditablePlanContent(''); // Clear editor
    setIsPlanGenerated(false);
    setSuggestingContent(false);
    setSuggestedContent([]);

    let materialDataUri: string | undefined = undefined;
    if (selectedMaterialFile) {
        try { materialDataUri = await readFileAsDataUri(selectedMaterialFile); }
        catch (error) {
            console.error("Error reading material file:", error);
            toast({ title: "Erro ao Ler Arquivo", description: "Não foi possível ler o arquivo de material.", variant: "destructive" });
            setReadingFile(false); setGeneratingPlan(false); return;
        }
    }
    setReadingFile(false);

    const formattedContents = selectedContents.join(', ');
    const formattedSkills = selectedSkills.join(', ');

    const input: GenerateLessonPlanInput = {
      disciplina: subject, anoSerie: fullYearSeriesString, habilidade: formattedSkills,
      conteudo: formattedContents, aulaDuracao: aulaDuracao, orientacoesAdicionais: additionalInstructions || undefined,
      materialDigitalDataUri: materialDataUri,
    };

    try {
      console.log("Sending request to generateLessonPlan with input:", input);
      const response = await generateLessonPlan(input);
      const htmlContent = markdownToHtml(response.lessonPlan); // Convert AI's markdown to HTML
      // setGeneratedPlan(response.lessonPlan); // Store raw if needed
      setEditablePlanContent(htmlContent); // Set editor content
      setIsPlanGenerated(true); // Mark plan as generated

      // Suggest content after successful generation
      handleSuggestContent(input.conteudo, input.anoSerie, input.disciplina, response.lessonPlan);

    } catch (error) {
      console.error("Error generating lesson plan:", error);
      // setGeneratedPlan("Erro ao gerar o plano.");
      setEditablePlanContent("<p>Erro ao gerar o plano de aula. Verifique sua chave de API, o tamanho do arquivo anexado e tente novamente.</p>"); // Set error in editor
      setIsPlanGenerated(true); // Mark as generated even if error, to show the error message
      toast({ title: "Erro na Geração", description: "Falha ao gerar o plano. Verifique a chave de API, o arquivo anexado ou tente mais tarde.", variant: "destructive" });
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
        toast({ title: "Erro nas Sugestões", description: "Não foi possível buscar sugestões de conteúdo.", variant: "destructive" });
     } finally { setSuggestingContent(false); }
   };

  // Function to save the edited plan
  const handleSavePlan = async () => {
      // Get the current HTML content from the editor state
      if (!user || !editablePlanContent || !selectedLevel || !subject || !yearSeries || !bimestre || !knowledgeObject || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao) {
          toast({ title: "Erro ao Salvar", description: "Plano editado ou informações essenciais estão faltando.", variant: "destructive" });
          return;
      }

      setIsSavingPlan(true);
      try {
          const planDetails: SavedPlanDetails = {
              userId: user.id, level: selectedLevel, yearSeries: fullYearSeriesString, subject, bimestre,
              knowledgeObject, contents: selectedContents, skills: selectedSkills, duration: aulaDuracao,
              additionalInstructions: additionalInstructions || undefined,
              generatedPlan: editablePlanContent, // Save the HTML content from the editor
              createdAt: new Date().toISOString(),
          };
          await savePlan(planDetails);
          toast({ title: "Plano Salvo", description: "Seu plano de aula foi salvo com sucesso!", variant: "default" });
      } catch (error) {
          console.error("Error saving lesson plan:", error);
          toast({ title: "Erro ao Salvar", description: `Não foi possível salvar o plano. ${error instanceof Error ? error.message : 'Erro desconhecido.'}`, variant: "destructive" });
      } finally { setIsSavingPlan(false); }
  };

  // Update editor content when user edits
  const handleEditorChange = (htmlContent: string) => {
    setEditablePlanContent(htmlContent);
  };


  if (authLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center"></div>;
  }

   const formDisabled = loadingData || generatingPlan || readingFile || showDataMissingAlert || isSavingPlan;
   const generateButtonDisabled = formDisabled || selectedContents.length === 0 || selectedSkills.length === 0 || !aulaDuracao;
   // Enable save only if a plan has been generated (even if it's an error message) and not currently saving/generating/reading
   const saveButtonDisabled = formDisabled || !isPlanGenerated || generatingPlan || readingFile;


  return (
    <div className="flex flex-col bg-secondary flex-1">
       <main className="flex-1 p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Data Missing Alert */}
         {showDataMissingAlert && !loadingData && ( <div className="lg:col-span-2"> <Alert variant="destructive"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Dados Não Encontrados</AlertTitle> <AlertDescription> {user?.username === 'admin' ? (<> Nenhum dado do Escopo-Sequência foi encontrado. Vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para carregar os arquivos XLSX. {missingLevels.length > 0 && <p className="mt-1 text-xs">Níveis faltando: {missingLevels.join(', ')}</p>} </>) : ( "Dados necessários não disponíveis. Contacte o administrador." )} </AlertDescription> </Alert> </div> )}
          {!showDataMissingAlert && missingLevels.length > 0 && user?.username === 'admin' && !loadingData && ( <div className="lg:col-span-2"> <Alert variant="default" className="border-yellow-500 text-yellow-700 [&>svg]:text-yellow-500 dark:border-yellow-600 dark:text-yellow-300 dark:[&>svg]:text-yellow-600 bg-yellow-50 dark:bg-yellow-950"> <AlertTriangle className="h-4 w-4" /> <AlertTitle>Dados Incompletos</AlertTitle> <AlertDescription> Dados do Escopo-Sequência estão faltando para: <strong>{missingLevels.join(', ')}</strong>. Vá para <Link href="/settings" className="font-medium underline">Configurações</Link> para carregá-los. </AlertDescription> </Alert> </div> )}

        {/* Left Column: Form */}
        <Card className={`shadow-md ${formDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"> <GraduationCap className="h-6 w-6 text-primary" /> Gerar Plano de Aula </CardTitle>
            <CardDescription>Selecione as opções para gerar um plano de aula com IA.</CardDescription>
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
            <div className="space-y-2"> <Label htmlFor="additionalInstructions" className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Orientações Adicionais</Label> <Textarea id="additionalInstructions" placeholder="Ex: turma com dificuldades, usar recursos..." value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} rows={3} disabled={formDisabled} /> </div>
             {/* File Attachment */}
             <div className="space-y-2"> <Label htmlFor="materialFile" className="flex items-center gap-1"><Paperclip className="h-4 w-4" /> Anexar Material (Opcional)</Label> <Input id="materialFile" type="file" onChange={handleMaterialFileChange} disabled={formDisabled} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" /> {selectedMaterialFile && ( <p className="text-xs text-muted-foreground mt-1"> Arquivo: {selectedMaterialFile.name} ({(selectedMaterialFile.size / 1024 / 1024).toFixed(2)} MB) {selectedMaterialFile.size > 4 * 1024 * 1024 && <span className="text-destructive ml-2">(Atenção: Arquivos grandes podem falhar)</span>} </p> )} </div>
            {/* Generate Button */}
            <Button onClick={handleGeneratePlan} disabled={generateButtonDisabled} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"> {readingFile ? 'Lendo...' : generatingPlan ? 'Gerando...' : 'Gerar Plano de Aula'} </Button>
          </CardContent>
        </Card>

         {/* Right Column: AI Response & Editor */}
         <Card className="shadow-md flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2"> <Bot className="h-6 w-6 text-primary" /> <CardTitle className="text-xl">Plano Gerado e Editor</CardTitle> </div>
                     <Button variant="outline" size="sm" onClick={handleSavePlan} disabled={saveButtonDisabled}> <Save className="mr-2 h-4 w-4" /> {isSavingPlan ? 'Salvando...' : 'Salvar Plano Editado'} </Button>
                </div>
                <CardDescription>Edite o plano gerado pela IA antes de salvar.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col"> {/* Make content area flex column */}
                 {(generatingPlan || readingFile) ? (
                    <div className="space-y-4 p-4"> {/* Padding for skeleton */}
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                ) : isPlanGenerated ? ( // Show editor only after generation (or error)
                   <>
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
                                <ScrollArea className="h-[80px]"> {/* Limit height of suggestions */}
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {suggestedContent.map((suggestion, idx) => (
                                            <li key={idx}>{suggestion}</li>
                                        ))}
                                    </ul>
                                </ScrollArea>
                            </div>
                        ) : !generatingPlan && !readingFile && !suggestingContent ? ( // Show if no suggestions, not loading
                             <div className="mt-4 border-t pt-3 px-4 pb-2">
                                <p className="text-sm text-muted-foreground">Nenhuma sugestão de conteúdo adicional encontrada.</p>
                             </div>
                        ) : null }
                    </>
                ) : ( // Initial placeholder state
                    <div className="flex-1 flex items-center justify-center text-center p-4">
                        <p className="text-muted-foreground">
                            {showDataMissingAlert
                                ? (user?.username === 'admin' ? "Carregue os dados nas configurações." : "Dados indisponíveis.")
                                : "Selecione as opções e clique em \"Gerar Plano de Aula\". O resultado aparecerá aqui para edição."}
                         </p>
                     </div>
                )}
            </CardContent>
         </Card>
      </main>
    </div>
  );
}
