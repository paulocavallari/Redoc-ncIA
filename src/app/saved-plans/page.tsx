
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { List, ArrowLeft, Download, FileText, FileType, Pencil, Trash2, BookOpenCheck } from 'lucide-react'; // Added BookOpenCheck, Pencil, Trash2
import { getPlansForUser, deletePlan, type SavedPlan, getPlanById } from '@/services/saved-plans';
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generatePdf } from '@/lib/pdf-generator';
import { generateDocx } from '@/lib/docx-generator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

export default function SavedPlansPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      // Fetch saved plans for the logged-in user
      const loadPlans = async () => {
        setLoadingPlans(true);
        try {
          const plans = await getPlansForUser(user.id);
          setSavedPlans(plans);
        } catch (error) {
          console.error("Error fetching saved plans:", error);
          toast({
            title: "Erro ao Carregar Planos",
            description: "Não foi possível buscar seus planos salvos.",
            variant: "destructive",
          });
        } finally {
          setLoadingPlans(false);
        }
      };
      loadPlans();
    }
  }, [user, authLoading, router, toast]);

  const handleEditPlan = (planId: string) => {
    router.push(`/dashboard?planId=${planId}`);
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    setDeletingPlanId(planId);
    try {
      await deletePlan(user.id, planId);
      setSavedPlans(prevPlans => prevPlans.filter(plan => plan.id !== planId));
      toast({
        title: "Plano Excluído",
        description: "O plano de aula foi excluído com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Erro ao Excluir",
        description: "Não foi possível excluir o plano de aula.",
        variant: "destructive",
      });
    } finally {
      setDeletingPlanId(null);
    }
  };

  const handleDownload = (plan: SavedPlan, format: 'pdf' | 'docx') => {
      try {
          const filename = `Plano_Aula_${plan.subject.replace(/\s+/g, '_')}_${plan.yearSeries.replace(/\s+/g, '_')}_${plan.id.substring(0, 6)}`;
          if (format === 'pdf') {
              generatePdf(plan, `${filename}.pdf`);
              toast({ title: "Download Iniciado", description: "Gerando PDF..." });
          } else if (format === 'docx') {
              generateDocx(plan, `${filename}.docx`);
              toast({ title: "Download Iniciado", description: "Gerando DOCX..." });
          }
      } catch (error) {
           console.error(`Error generating ${format}:`, error);
           toast({
                title: `Erro ao Gerar ${format.toUpperCase()}`,
                description: `Não foi possível gerar o arquivo ${format}.`,
                variant: "destructive",
           });
      }
  };

  // Helper to format relative time or full date
   const formatPlanDate = (isoDateString: string | undefined): string => {
       if (!isoDateString) return "Data desconhecida";
       const date = new Date(isoDateString);
       const now = new Date();
       // If it's within the last 7 days, show relative time
       if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
           return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
       }
       // Otherwise, show the full date and time
       return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
   };


  if (authLoading || !user) {
    return (
       <div className="flex min-h-screen items-center justify-center">
          {/* Use consistent full page loading skeleton */}
          <div className="flex min-h-screen flex-col bg-secondary w-full">
             <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 shadow-sm">
                 <div className="flex items-center gap-4"> <div className="w-10 h-10"></div> <div className="flex items-center gap-2"> <BookOpenCheck className="h-7 w-7 text-primary" /> <h1 className="text-xl font-semibold text-primary">redocêncIA</h1> </div> </div>
                 <div className="flex items-center gap-4"> <Skeleton className="h-5 w-24 hidden sm:inline" /> <Skeleton className="h-8 w-8 rounded-full" /> <Skeleton className="h-8 w-8 rounded-full" /> <Skeleton className="h-8 w-8 rounded-full" /> </div>
             </header>
             <main className="flex-1 p-4 md:p-6 lg:p-8">
                <Skeleton className="h-8 w-48 mb-6" /> {/* Title skeleton */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {[...Array(3)].map((_, i) => (
                         <Card key={i} className="shadow-md">
                             <CardHeader>
                                 <Skeleton className="h-6 w-3/4 mb-1" />
                                 <Skeleton className="h-4 w-1/2" />
                                 <Skeleton className="h-4 w-1/3 mt-1" />
                             </CardHeader>
                             <CardContent>
                                 <Skeleton className="h-4 w-full mb-2" />
                                 <Skeleton className="h-4 w-5/6" />
                             </CardContent>
                             <CardFooter className="flex justify-between">
                                 <div className="flex gap-2">
                                    <Skeleton className="h-9 w-20" />
                                    <Skeleton className="h-9 w-24" />
                                 </div>
                                 <div className="flex gap-2">
                                     <Skeleton className="h-9 w-9 rounded-md" />
                                     <Skeleton className="h-9 w-9 rounded-md" />
                                 </div>
                             </CardFooter>
                         </Card>
                     ))}
                 </div>
             </main>
          </div>
       </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}> {/* Wrap with TooltipProvider */}
    <div className="flex flex-col bg-secondary flex-1">

       {/* Main Content */}
       <main className="flex-1 p-4 md:p-6 lg:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Meus Planos Salvos</h2>
         {loadingPlans ? (
            // Keep the skeleton loading state as before
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {[...Array(3)].map((_, i) => (
                     <Card key={i} className="shadow-md">
                         <CardHeader>
                             <Skeleton className="h-6 w-3/4 mb-1" />
                             <Skeleton className="h-4 w-1/2" />
                             <Skeleton className="h-4 w-1/3 mt-1" />
                         </CardHeader>
                         <CardContent>
                             <Skeleton className="h-4 w-full mb-2" />
                             <Skeleton className="h-4 w-5/6" />
                         </CardContent>
                         <CardFooter className="flex justify-between">
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-20" />
                                <Skeleton className="h-9 w-24" />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-9 rounded-md" />
                                <Skeleton className="h-9 w-9 rounded-md" />
                            </div>
                         </CardFooter>
                     </Card>
                 ))}
             </div>
         ) : savedPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground mt-16">
                <List className="h-16 w-16 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Nenhum Plano Salvo</h2>
                <p>Você ainda não salvou nenhum plano de aula.</p>
                <Link href="/dashboard" passHref>
                    <Button className="mt-4">Gerar Novo Plano</Button>
                </Link>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedPlans.map((plan) => (
                    <Card key={plan.id} className="shadow-md flex flex-col bg-card hover:shadow-lg transition-shadow duration-200">
                        <CardHeader>
                            <CardTitle className="text-lg truncate">{plan.subject} - {plan.yearSeries}</CardTitle>
                            <CardDescription>
                                {plan.bimestre}º Bimestre - {plan.knowledgeObject}
                            </CardDescription>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs text-muted-foreground pt-1 cursor-default">
                                    {plan.updatedAt ? `Atualizado ${formatPlanDate(plan.updatedAt)}` : `Salvo ${formatPlanDate(plan.createdAt)}`}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                {plan.updatedAt ? `Atualizado em: ${format(new Date(plan.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}` : `Criado em: ${format(new Date(plan.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                              </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2">
                            <div>
                                <p className="text-sm font-medium">Conteúdos:</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {plan.contents.join(', ')}
                                </p>
                            </div>
                             <div>
                                <p className="text-sm font-medium">Habilidades:</p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {plan.skills.join(', ')}
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between items-center border-t pt-4 mt-auto">
                             {/* Download Buttons */}
                             <div className="flex gap-2">
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => handleDownload(plan, 'pdf')}>
                                            <FileText className="mr-1 h-4 w-4" /> PDF
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Baixar como PDF</TooltipContent>
                                 </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="sm" onClick={() => handleDownload(plan, 'docx')}>
                                            <FileType className="mr-1 h-4 w-4" /> DOCX
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Baixar como DOCX</TooltipContent>
                                 </Tooltip>
                             </div>

                            {/* Action Buttons (Edit/Delete) */}
                            <div className="flex gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleEditPlan(plan.id)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Editar Plano</TooltipContent>
                                </Tooltip>

                                <AlertDialog>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    disabled={deletingPlanId === plan.id}
                                                >
                                                    {deletingPlanId === plan.id ? <span className="animate-spin h-4 w-4 border-b-2 border-destructive"></span> : <Trash2 className="h-4 w-4" />}
                                                    <span className="sr-only">Excluir</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="bg-destructive text-destructive-foreground">Excluir Plano</TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja excluir este plano de aula? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>
                                            Confirmar Exclusão
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
         )}
       </main>
    </div>
    </TooltipProvider>
  );
}

