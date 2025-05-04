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
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot, Clock } from 'lucide-react';
import { getEscopoSequenciaData, type EscopoSequenciaItem } from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content';
import { ScrollArea } from "@/components/ui/scroll-area";


type EducationLevel =
  | 'Ensino Fundamental: Anos Iniciais'
  | 'Ensino Fundamental: Anos Finais'
  | 'Ensino Médio'
  | 'Ensino Médio Noturno';

const educationLevels: EducationLevel[] = [
  'Ensino Fundamental: Anos Iniciais',
  'Ensino Fundamental: Anos Finais',
  'Ensino Médio',
  'Ensino Médio Noturno',
];

const aulaDuracaoOptions: string[] = [
    '1 aula (45/50 min)',
    '2 aulas (90/100 min)',
    '3 aulas (135/150 min)',
];

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [escopoData, setEscopoData] = useState<EscopoSequenciaItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [yearSeries, setYearSeries] = useState('');
  const [subject, setSubject] = useState(''); // 'disciplina' in Portuguese
  const [content, setContent] = useState(''); // 'conteudo' in Portuguese
  const [selectedSkill, setSelectedSkill] = useState<string>(''); // Changed from array to single string
  const [aulaDuracao, setAulaDuracao] = useState<string>(''); // New state for duration
  const [additionalInstructions, setAdditionalInstructions] = useState(''); // 'orientacoesAdicionais'
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
    // Fetch Escopo-Sequencia data on mount
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const data = await getEscopoSequenciaData();
        setEscopoData(data);
      } catch (error) {
        console.error("Error fetching escopo-sequencia data:", error);
        // Handle error (e.g., show a toast message)
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Derived options based on selections
  const availableYears = useMemo(() => {
    if (!educationLevel || !escopoData.length) return [];
    // Basic filtering logic - adjust based on actual data structure and level mapping
    let filterFunc: (item: EscopoSequenciaItem) => boolean;
     if (educationLevel === 'Ensino Fundamental: Anos Iniciais') {
        filterFunc = item => ['1º ano', '2º ano', '3º ano', '4º ano', '5º ano'].includes(item.anoSerie);
     } else if (educationLevel === 'Ensino Fundamental: Anos Finais') {
       filterFunc = item => ['6º ano', '7º ano', '8º ano', '9º ano'].includes(item.anoSerie);
     } else if (educationLevel === 'Ensino Médio' || educationLevel === 'Ensino Médio Noturno') {
        filterFunc = item => ['1ª série', '2ª série', '3ª série'].includes(item.anoSerie);
     } else {
       filterFunc = () => false;
     }
    return [...new Set(escopoData.filter(filterFunc).map(item => item.anoSerie))].sort();
  }, [educationLevel, escopoData]);

  const availableSubjects = useMemo(() => {
    if (!yearSeries || !escopoData.length) return [];
    return [...new Set(escopoData.filter(item => item.anoSerie === yearSeries).map(item => item.disciplina))].sort();
  }, [yearSeries, escopoData]);

  const availableContents = useMemo(() => {
    if (!subject || !yearSeries || !escopoData.length) return [];
    return [...new Set(escopoData.filter(item => item.anoSerie === yearSeries && item.disciplina === subject).map(item => item.conteudo))].sort();
  }, [subject, yearSeries, escopoData]);

 const availableSkills = useMemo(() => {
    if (!content || !subject || !yearSeries || !escopoData.length) return [];
    const skillsSet = new Set<string>();
    escopoData
      .filter(item => item.anoSerie === yearSeries && item.disciplina === subject && item.conteudo === content)
      .forEach(item => item.habilidades.forEach(skill => skillsSet.add(skill)));
    return Array.from(skillsSet).sort();
  }, [content, subject, yearSeries, escopoData]);

  // Reset dependent fields when a higher-level field changes
  const handleEducationLevelChange = (value: string) => {
    setEducationLevel(value as EducationLevel);
    setYearSeries('');
    setSubject('');
    setContent('');
    setSelectedSkill('');
    setAulaDuracao('');
    setGeneratedPlan('');
    setSuggestedContent([]);
  };

  const handleYearChange = (value: string) => {
    setYearSeries(value);
    setSubject('');
    setContent('');
    setSelectedSkill('');
    setAulaDuracao('');
     setGeneratedPlan('');
     setSuggestedContent([]);
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setContent('');
    setSelectedSkill('');
    setAulaDuracao('');
     setGeneratedPlan('');
      setSuggestedContent([]);
  };

 const handleContentChange = (value: string) => {
    setContent(value);
    setSelectedSkill(''); // Reset skills when content changes
     setGeneratedPlan('');
      setSuggestedContent([]);
  };


  const handleSkillChange = (skill: string) => {
    setSelectedSkill(skill); // Directly set the selected skill
     setGeneratedPlan(''); // Clear plan if skills change
     setSuggestedContent([]);
  };

  const handleDurationChange = (value: string) => {
      setAulaDuracao(value);
      setGeneratedPlan(''); // Clear plan if duration changes
      setSuggestedContent([]);
  };


  const handleGeneratePlan = async () => {
    if (!subject || !yearSeries || !selectedSkill || !content || !aulaDuracao) {
      // Add validation feedback (e.g., toast)
      console.error("Por favor, preencha todos os campos obrigatórios, incluindo a duração da aula.");
      // TODO: Show toast message
      return;
    }

    setGeneratingPlan(true);
    setGeneratedPlan('');
    setSuggestingContent(false); // Reset suggestion state
    setSuggestedContent([]); // Clear previous suggestions

    const input: GenerateLessonPlanInput = {
      disciplina: subject,
      anoSerie: yearSeries,
      habilidade: selectedSkill, // Pass the single selected skill
      conteudo: content,
      aulaDuracao: aulaDuracao,
      orientacoesAdicionais: additionalInstructions || undefined,
    };

    try {
      // console.log("Calling AI with input:", input);
      const response = await generateLessonPlan(input);
      setGeneratedPlan(response.lessonPlan);

      // After generating the plan, suggest additional content
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
       // Prepare input for suggestion (adjust if schema differs)
       const input: SuggestAdditionalContentInput = {
           topic: topic, // Assuming 'topic' is equivalent to 'conteudo'
           gradeLevel: gradeLevel, // Assuming 'gradeLevel' is equivalent to 'anoSerie'
           subject: subject, // 'subject' is equivalent to 'disciplina'
           currentContent: currentContent // Pass the generated lesson plan as current content
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
        {/* Left Column: Form */}
        <Card className="shadow-md">
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
              <Label htmlFor="educationLevel" className="flex items-center gap-1">
                 <BookCopy className="h-4 w-4" /> Nível de Ensino *
              </Label>
              <Select
                value={educationLevel}
                onValueChange={handleEducationLevelChange}
                disabled={loadingData || generatingPlan}
              >
                <SelectTrigger id="educationLevel">
                  <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o nível"} />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
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
                disabled={!educationLevel || loadingData || generatingPlan}
              >
                <SelectTrigger id="yearSeries">
                  <SelectValue placeholder={!educationLevel ? "Selecione o nível primeiro" : "Selecione o ano/série"} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
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
                disabled={!yearSeries || loadingData || generatingPlan}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder={!yearSeries ? "Selecione ano/série primeiro" : "Selecione a disciplina"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content (Conteudo) */}
            <div className="space-y-2">
              <Label htmlFor="content" className="flex items-center gap-1">
                 <Target className="h-4 w-4" /> Conteúdo *
              </Label>
              <Select
                value={content}
                onValueChange={handleContentChange}
                disabled={!subject || loadingData || generatingPlan}
              >
                <SelectTrigger id="content">
                  <SelectValue placeholder={!subject ? "Selecione a disciplina primeiro" : "Selecione o conteúdo"} />
                </SelectTrigger>
                <SelectContent>
                   <ScrollArea className="h-[200px]"> {/* Scroll for long lists */}
                     {availableContents.map(cont => (
                       <SelectItem key={cont} value={cont}>{cont}</SelectItem>
                     ))}
                   </ScrollArea>
                </SelectContent>
              </Select>
            </div>

             {/* Skills (Habilidade) - Changed to RadioGroup */}
             {availableSkills.length > 0 && (
               <div className="space-y-2">
                 <Label className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> Habilidade *</Label>
                 <Card className="p-4 bg-secondary">
                   <ScrollArea className="h-[150px]"> {/* Scroll for long lists */}
                     <RadioGroup
                        value={selectedSkill}
                        onValueChange={handleSkillChange}
                        disabled={generatingPlan}
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

            {/* Lesson Duration (Duração da Aula) */}
             <div className="space-y-2">
               <Label htmlFor="aulaDuracao" className="flex items-center gap-1">
                 <Clock className="h-4 w-4" /> Duração da Aula *
               </Label>
               <Select
                 value={aulaDuracao}
                 onValueChange={handleDurationChange}
                 disabled={!content || loadingData || generatingPlan} // Enable when content is selected
               >
                 <SelectTrigger id="aulaDuracao">
                   <SelectValue placeholder={!content ? "Selecione o conteúdo primeiro" : "Selecione a duração"} />
                 </SelectTrigger>
                 <SelectContent>
                   {aulaDuracaoOptions.map(dur => (
                     <SelectItem key={dur} value={dur}>{dur}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
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
                disabled={generatingPlan}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGeneratePlan}
              disabled={!content || !selectedSkill || !aulaDuracao || loadingData || generatingPlan} // Updated condition
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

                            // Section Headers (bold or ##)
                            if (line.startsWith('**') && line.endsWith('**') || line.startsWith('## ')) {
                                const headerText = line.replace(/^\*\*|^\## |\*\*$/g, '');
                                return <h3 key={index} className="font-bold text-lg my-3 pt-2 border-t">{headerText}</h3>;
                            }
                             // Sub-headers (bold within sections)
                            if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
                                return <p key={index} className="font-semibold my-1">{line.slice(1, -1)}</p>;
                            }
                            // Bullet points
                             if (line.startsWith('* ') || line.startsWith('- ')) {
                                return <li key={index} className="ml-4 list-disc">{line.slice(2)}</li>;
                            }
                             // Numbered lists
                             if (/^\d+\.\s/.test(line)) {
                                return <li key={index} className="ml-4 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
                             }
                            // Regular paragraph
                            return <p key={index} className="my-1">{line}</p>;
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
                        ) : !generatingPlan && !suggestingContent ? ( // Show if no suggestions and not loading
                             <div className="mt-6 border-t pt-4">
                                <p className="text-sm text-muted-foreground">Nenhuma sugestão de conteúdo adicional encontrada.</p>
                             </div>
                        ) : null }

                    </div>
                ) : (
                    <p className="text-muted-foreground">Selecione as opções e clique em "Gerar Plano de Aula".</p>
                )}
                </ScrollArea>
            </CardContent>
         </Card>

      </main>
    </div>
  );
}

