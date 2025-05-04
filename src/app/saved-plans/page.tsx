
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { List, ArrowLeft, Download, FileText, FileType } from 'lucide-react';
import { getPlansForUser, deletePlan, type SavedPlan } from '@/services/saved-plans';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generatePdf } from '@/lib/pdf-generator';
import { generateDocx } from '@/lib/docx-generator';

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
          const plans = await getPlansForUser(user.id); // Or user.username
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


  if (authLoading || !user) {
    return (
       <div className="flex min-h-screen items-center justify-center">
          {/* Optional: Loading spinner */}
       </div>
    );
  }

  return (
    <div className="flex flex-col bg-secondary flex-1"> {/* Use flex-1 */}

       {/* Main Content */}
       <main className="flex-1 p-4 md:p-6 lg:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Meus Planos Salvos</h2> {/* Added title */}
         {loadingPlans ? (
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
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
         ) : savedPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground mt-16"> {/* Added margin-top */}
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
                    <Card key={plan.id} className="shadow-md flex flex-col bg-card hover:shadow-lg transition-shadow duration-200"> {/* Added hover effect */}
                        <CardHeader>
                            <CardTitle className="text-lg truncate">{plan.subject} - {plan.yearSeries}</CardTitle>
                            <CardDescription>
                                {plan.bimestre}º Bimestre - {plan.knowledgeObject}
                            </CardDescription>
                            <p className="text-xs text-muted-foreground pt-1">
                                Salvo em: {format(new Date(plan.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
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
                        <CardFooter className="flex justify-between items-center border-t pt-4 mt-auto"> {/* Ensure footer sticks to bottom */}
                             <div className="flex gap-2">
                                 <Button variant="outline" size="sm" onClick={() => handleDownload(plan, 'pdf')}>
                                     <FileText className="mr-1 h-4 w-4" /> PDF
                                 </Button>
                                 <Button variant="outline" size="sm" onClick={() => handleDownload(plan, 'docx')}>
                                     <FileType className="mr-1 h-4 w-4" /> DOCX
                                 </Button>
                             </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={deletingPlanId === plan.id}
                                    >
                                        {deletingPlanId === plan.id ? 'Excluindo...' : 'Excluir'}
                                    </Button>
                                </AlertDialogTrigger>
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
                        </CardFooter>
                    </Card>
                ))}
            </div>
         )}
       </main>
    </div>
  );
}
