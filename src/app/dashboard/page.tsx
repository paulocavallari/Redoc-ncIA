'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, LogOut, BookOpenCheck, GraduationCap, BookCopy, Target, ListChecks, MessageSquare, Bot } from 'lucide-react';
import { getEscopoSequenciaData, type EscopoSequenciaItem } from '@/services/escopo-sequencia';
import { generateLessonPlan, type GenerateLessonPlanInput } from '@/ai/flows/generate-lesson-plan';
import { suggestAdditionalContent, type SuggestAdditionalContentInput } from '@/ai/flows/suggest-additional-content'; // Import suggestAdditionalContent
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

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [escopoData, setEscopoData] = useState<EscopoSequenciaItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [yearSeries, setYearSeries] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
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
    setSelectedSkills([]);
    setGeneratedPlan('');
    setSuggestedContent([]);
  };

  const handleYearChange = (value: string) => {
    setYearSeries(value);
    setSubject('');
    setContent('');
    setSelectedSkills([]);
     setGeneratedPlan('');
     setSuggestedContent([]);
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setContent('');
    setSelectedSkills([]);
     setGeneratedPlan('');
      setSuggestedContent([]);
  };

 const handleContentChange = (value: string) => {
    setContent(value);
    setSelectedSkills([]); // Reset skills when content changes
     setGeneratedPlan('');
      setSuggestedContent([]);
  };


  const handleSkillChange = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
     setGeneratedPlan(''); // Clear plan if skills change
     setSuggestedContent([]);
  };

 const calculateClassDuration = useCallback(() => {
    return educationLevel === 'Ensino Médio Noturno' ? 45 : 50;
  }, [educationLevel]);

  const handleGeneratePlan = async () => {
    if (!educationLevel || !yearSeries || !subject || !content || selectedSkills.length === 0) {
      // Add validation feedback (e.g., toast)
      console.error("Please fill all required fields");
      return;
    }

    setGeneratingPlan(true);
    setGeneratedPlan('');
    setSuggestingContent(false); // Reset suggestion state
    setSuggestedContent([]); // Clear previous suggestions

    const input: GenerateLessonPlanInput = {
      educationLevel: educationLevel,
      year: yearSeries,
      subject: subject,
      content: content,
      skills: selectedSkills,
      additionalInstructions: additionalInstructions || undefined, // Pass undefined if empty
      classDurationMinutes: calculateClassDuration(),
    };

    try {
      // Simulate API Call
      // console.log("Simulating AI call with input:", input);
      // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      // const dummyResponse = `**Plano de Aula Sugerido:**\n\n*   **Introdução (10 min):** Discussão sobre ${input.content}.\n*   **Desenvolvimento (25 min):** Explicação e exemplos.\n*   **Atividade (10 min):** Exercícios práticos.\n*   **Avaliação (5 min):** Perguntas rápidas.`;
      // setGeneratedPlan(dummyResponse);

      const response = await generateLessonPlan(input);
      setGeneratedPlan(response.lessonPlan);

       // After generating the plan, suggest additional content
        handleSuggestContent(input.content, input.year, input.subject, response.lessonPlan);


    } catch (error) {
      console.error("Error generating lesson plan:", error);
      setGeneratedPlan("Erro ao gerar o plano de aula. Tente novamente.");
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
       const input: SuggestAdditionalContentInput = { topic, gradeLevel, subject, currentContent };
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

            {/* Subject */}
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

            {/* Content */}
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

            {/* Skills */}
            {availableSkills.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> Habilidades *</Label>
                <Card className="p-4 bg-secondary">
                  <ScrollArea className="h-[150px]"> {/* Scroll for long lists */}
                    <div className="space-y-2">
                      {availableSkills.map(skill => (
                        <div key={skill} className="flex items-center space-x-2">
                          <Checkbox
                            id={`skill-${skill}`}
                            checked={selectedSkills.includes(skill)}
                            onCheckedChange={() => handleSkillChange(skill)}
                            disabled={generatingPlan}
                          />
                          <Label htmlFor={`skill-${skill}`} className="text-sm font-normal cursor-pointer">
                            {skill}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            )}

            {/* Additional Instructions */}
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
              disabled={!content || selectedSkills.length === 0 || loadingData || generatingPlan}
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
                   <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                       {generatedPlan.split('\n').map((line, index) => {
                            // Basic formatting enhancements
                            if (line.startsWith('**') && line.endsWith('**')) {
                                return <p key={index} className="font-bold text-lg my-2">{line.slice(2, -2)}</p>;
                            } else if (line.startsWith('*') || line.startsWith('-')) {
                                return <li key={index} className="ml-4 list-disc">{line.slice(1).trim()}</li>;
                            }
                            return <p key={index}>{line}</p>;
                       })}

                        {/* Display Suggested Content */}
                        {suggestingContent ? (
                             <div className="mt-6 space-y-2">
                                <p className="font-semibold">Sugerindo conteúdo adicional...</p>
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
