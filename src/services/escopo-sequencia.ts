
/**
 * @fileOverview Service for handling Escopo-Sequência data using Firestore.
 * This service is designed to process complex XLSX files with multiple structures
 * and save the structured data into Firestore.
 */

import { db } from '@/lib/firebase';
import { collection, writeBatch, getDocs, query, where, CollectionReference, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export const EDUCATION_LEVELS = [
  "Anos Iniciais",
  "Anos Finais",
  "Ensino Médio",
  "Ensino Médio Técnico - 2ª Série",
  "Ensino Médio Técnico - 3ª Série",
  "Ensino Médio Noturno",
] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number];

export interface EscopoSequenciaItem {
  level: EducationLevel;
  disciplina: string;
  ciclo?: string;
  anoSerie?: string;
  bimestre?: string;
  aula?: string;
  unidadeTematica?: string;
  habilidade?: string;
  objetosDoConhecimento?: string;
  titulo?: string;
  conteudo?: string;
  objetivos?: string;
  linguagem?: string;
  campoDeAtuacao?: string;
  praticasDeLinguagem?: string;
  topicoGramatical?: string;
  semana?: string;
  data?: string;
  aulaUnidade?: string;
  aulaSala?: string;
  habilidadeBNCCComputacao?: string;
  diretrizesCurricularesTec?: string;
  entregaDeProjeto?: string;
  generosDasProducoesBimestrais?: string;
  competenciasSocioemocionais?: string;
  tema?: string;
  chTeoricaPratica?: string;
  competenciaTecnica?: string;
  nomeDoComponente?: string;
  codigoDoComponente?: string;
  componente3ou4Aulas?: string;
  unidadeCurricular?: string;
  codigoUnidadeCurricular?: string;
  temaDaSemana?: string;
  habilidadesTecnicas?: string;
  habilidadesSocioemocionais?: string;
  objetoDeConhecimentoMacro?: string;
}

const ESCOPO_COLLECTION = 'escopo-sequencia';

const extractNumber = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    const match = str.match(/\d+/);
    return match ? match[0] : '';
};

const POSSIBLE_HEADERS: { [key in keyof Omit<EscopoSequenciaItem, 'level' | 'disciplina'>]?: string[] } = {
    ciclo: ['CICLO', 'Ciclo'],
    anoSerie: ['ANO/SÉRIE', 'Ano/Série', 'Ano', 'Série'],
    bimestre: ['BIMESTRE', 'Bimestre'],
    aula: ['AULA', 'Aula', 'Aulas'],
    unidadeTematica: ['UNIDADE TEMÁTICA', 'Unidade Temática'],
    habilidade: ['HABILIDADE', 'Habilidade', 'Habilidades', 'HABILIDADES', 'Habilidades BNCC gerais'],
    objetosDoConhecimento: ['OBJETOS DO CONHECIMENTO', 'Objetos do Conhecimento', 'Objeto do Conhecimento', 'Objetos de Conhecimento', 'Objetos de conhecimento'],
    titulo: ['TÍTULO', 'Título', 'Título da Aula', 'Título Plano de Aula Semanal'],
    conteudo: ['CONTEUDO', 'Conteúdo', 'Conteudos', 'Conteúdos'],
    objetivos: ['OBJETIVOS', 'Objetivos', 'Objetivo', 'Objetivo da aula'],
    linguagem: ['Linguagem'],
    campoDeAtuacao: ['Campo de Atuação', 'CAMPO DE ATUAÇÃO'],
    praticasDeLinguagem: ['Práticas de Linguagem', 'PRÁTICAS DE LINGUAGEM'],
    topicoGramatical: ['Tópico Gramatical'],
    semana: ['Semana'],
    data: ['Data'],
    aulaUnidade: ['Aula Unidade'],
    aulaSala: ['Aula Sala'],
    habilidadeBNCCComputacao: ['Habilidade BNCC Computação'],
    diretrizesCurricularesTec: ['Diretrizes Curriculares Tec. e Inovação'],
    entregaDeProjeto: ['Entrega de projeto'],
    generosDasProducoesBimestrais: ['Gêneros das Produções Bimestrais'],
    tema: ['TEMA', 'Tema'],
    competenciasSocioemocionais: ['Competências', 'Competências socioemocionais', 'COMPETÊNCIAS SOCIOEMOCIONAIS'],
    chTeoricaPratica: ['CH Teórica/Prática'],
    competenciaTecnica: ['Competência técnica'],
    nomeDoComponente: ['Nome do componente'],
    codigoDoComponente: ['Código do componente'],
    componente3ou4Aulas: ['Componente de 3 ou 4 aulas semanais?'],
    unidadeCurricular: ['Unidade curricular'],
    codigoUnidadeCurricular: ['Código unidade curricular'],
    temaDaSemana: ['Tema da semana'],
    habilidadesTecnicas: ['Habilidades técnicas'],
    habilidadesSocioemocionais: ['Habilidades socioemocionais'],
    objetoDeConhecimentoMacro: ['Objeto de conhecimento - macro'],
};

const MESTRE_MANDATORY_KEYS: (keyof EscopoSequenciaItem)[] = ['anoSerie', 'bimestre', 'objetosDoConhecimento'];
const TECNICO_MANDATORY_KEYS: (keyof EscopoSequenciaItem)[] = ['competenciaTecnica', 'unidadeCurricular', 'semana', 'titulo'];

function findHeader(headers: string[], possibleNames: string[] | undefined): string | undefined {
  if (!possibleNames) return undefined;
  const lowerCaseHeaders = headers.map(h => h ? String(h).trim().toLowerCase() : '');
  for (const name of possibleNames) {
    const lowerCaseName = name.toLowerCase();
    const index = lowerCaseHeaders.indexOf(lowerCaseName);
    if (index !== -1) {
      return headers[index];
    }
  }
  return undefined;
}

function findAndMapHeaders(jsonData: any[][], sheetName: string, startRowIndex: number): { headerMap: { [key: string]: string }, headers: string[], headerIndex: number, pattern: 'mestre' | 'tecnico' } | null {
    const HEADER_SEARCH_LIMIT = 10;
    let headerIndex = -1;
    let headers: string[] = [];
    let pattern: 'mestre' | 'tecnico' = 'mestre';

    for (let i = startRowIndex; i < Math.min(jsonData.length, startRowIndex + HEADER_SEARCH_LIMIT); i++) {
        const potentialHeaderRow = jsonData[i];
        if (!Array.isArray(potentialHeaderRow) || potentialHeaderRow.length === 0 || potentialHeaderRow.every(cell => cell === null || String(cell).trim() === '')) continue;

        const potentialHeaders = potentialHeaderRow.map((h: any) => String(h || '').trim());
        let foundMestreCount = 0;
        let foundTecnicoCount = 0;

        MESTRE_MANDATORY_KEYS.forEach(key => {
            if (findHeader(potentialHeaders, POSSIBLE_HEADERS[key])) foundMestreCount++;
        });

        TECNICO_MANDATORY_KEYS.forEach(key => {
            if (findHeader(potentialHeaders, POSSIBLE_HEADERS[key])) foundTecnicoCount++;
        });

        if (foundTecnicoCount >= 3) {
            headerIndex = i;
            headers = potentialHeaders;
            pattern = 'tecnico';
            break;
        } else if (foundMestreCount >= 2) { // Loosened for flexibility
            headerIndex = i;
            headers = potentialHeaders;
            pattern = 'mestre';
            break;
        }
    }

    if (headerIndex === -1) {
        console.warn(`Could not identify a valid header row in sheet "${sheetName}".`);
        return null;
    }

    const headerMap: { [key: string]: string } = {};
    Object.keys(POSSIBLE_HEADERS).forEach(key => {
        const mappedHeader = findHeader(headers, POSSIBLE_HEADERS[key as keyof typeof POSSIBLE_HEADERS]);
        if (mappedHeader) {
           headerMap[key] = mappedHeader;
        }
    });

    const mandatoryKeys = pattern === 'mestre' ? MESTRE_MANDATORY_KEYS : TECNICO_MANDATORY_KEYS;
    const missingHeaders = mandatoryKeys.filter(key => !headerMap[key]);

    if (missingHeaders.length > 0) {
      console.error(`Sheet "${sheetName}" is missing required columns for pattern "${pattern}": ${missingHeaders.join(', ')}.`);
      return null;
    }

    return { headerMap, headers, headerIndex, pattern };
}

export function processEscopoFile(fileData: ArrayBuffer, level: EducationLevel): EscopoSequenciaItem[] {
  const workbook = XLSX.read(fileData, { type: 'buffer' });
  const allData: EscopoSequenciaItem[] = [];
  const headerSearchStartRowIndex = 0; // Search from the top

  workbook.SheetNames.forEach((sheetName) => {
    const trimmedSheetName = sheetName.trim();
    if (['índice', 'capa'].includes(trimmedSheetName.toLowerCase())) {
        console.log(`Skipping non-curricular sheet: "${sheetName}"`);
        return;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });
    if (!jsonData || jsonData.length < headerSearchStartRowIndex + 1) return;

    const headerInfo = findAndMapHeaders(jsonData, trimmedSheetName, headerSearchStartRowIndex);
    if (!headerInfo) return;

    const { headerMap, headers, headerIndex, pattern } = headerInfo;
    const actualDataStartIndex = headerIndex + 1;

    for (let i = actualDataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row) || row.length === 0 || row.every((cell: any) => cell === null || String(cell).trim() === '')) continue;

      const item: Partial<EscopoSequenciaItem> = { disciplina: trimmedSheetName, level };

      Object.entries(headerMap).forEach(([key, headerName]) => {
        const colIndex = headers.indexOf(headerName);
        let cellValue: any = (colIndex !== -1) ? row[colIndex] : null;
        const itemKey = key as keyof EscopoSequenciaItem;

        if (cellValue !== null && cellValue !== undefined) {
             if (['anoSerie', 'bimestre', 'aula', 'semana'].includes(itemKey)) {
                item[itemKey] = extractNumber(cellValue);
            } else {
                item[itemKey] = String(cellValue).trim();
            }
        }
      });

      const mandatoryKeys = pattern === 'mestre' ? MESTRE_MANDATORY_KEYS : TECNICO_MANDATORY_KEYS;
      const isProjetoConvivencia = trimmedSheetName.toLowerCase().includes('projeto de convivência');
      
      let hasEssentialData = mandatoryKeys.every(key => {
          // 'habilidade' is optional for Projeto de Convivência
          if (key === 'habilidade' && isProjetoConvivencia) return true;
          const value = item[key];
          return value !== undefined && value !== null && String(value).trim() !== '';
      });

      if (hasEssentialData) {
          allData.push(item as EscopoSequenciaItem);
      }
    }
  });
  return allData;
}

export async function saveEscopoDataToFirestore(level: EducationLevel, data: EscopoSequenciaItem[], onProgress: (percentage: number) => void): Promise<void> {
    if (!data.length) {
        console.log(`No data provided to save for level "${level}".`);
        onProgress(100);
        return;
    }
    const escopoCollection = collection(db, ESCOPO_COLLECTION) as CollectionReference<EscopoSequenciaItem>;

    onProgress(10);
    console.log(`Deleting existing documents for level: ${level}`);
    const deleteQuery = query(escopoCollection, where('level', '==', level));
    
    const deleteSnapshot = await getDocs(deleteQuery).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: escopoCollection.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError; // Stop execution
    });

    const deleteBatch = writeBatch(db);
    deleteSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    
    await deleteBatch.commit().catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: `batch delete on ${escopoCollection.path}`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError; // Stop execution
    });

    console.log(`Deleted ${deleteSnapshot.size} old documents for level "${level}".`);
    onProgress(30);

    console.log(`Adding ${data.length} new documents for level "${level}".`);
    const totalItems = data.length;
    let itemsProcessed = 0;
    
    let addBatch = writeBatch(db);
    for (let i = 0; i < totalItems; i++) {
        const item = data[i];
        const docRef = doc(escopoCollection);
        addBatch.set(docRef, item);
        itemsProcessed++;

        if ((i + 1) % 500 === 0 || i === totalItems - 1) {
            await addBatch.commit().catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: `batch write on ${escopoCollection.path}`,
                    operation: 'create',
                    requestResourceData: `(batch of ${itemsProcessed - (i % 500)} items)` // Example data
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError; // Stop execution
            });
            addBatch = writeBatch(db);
            const progress = 30 + (itemsProcessed / totalItems) * 70;
            onProgress(progress);
        }
    }

    console.log(`Successfully saved ${totalItems} items for level "${level}" to Firestore.`);
    onProgress(100);
    window.dispatchEvent(new CustomEvent('escopoDataUpdated'));
}

export async function getAllEscopoDataFromFirestore(): Promise<{ [key in EducationLevel]?: EscopoSequenciaItem[] }> {
    console.log("Fetching all escopo-sequencia data from Firestore...");
    const escopoCollection = collection(db, ESCOPO_COLLECTION) as CollectionReference<EscopoSequenciaItem>;
    const q = query(escopoCollection);
    
    const querySnapshot = await getDocs(q).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: escopoCollection.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Return an empty snapshot to avoid crashing the app, error is already emitted.
        return { docs: [] }; 
    });

    const allData: { [key in EducationLevel]?: EscopoSequenciaItem[] } = {};
    for (const level of EDUCATION_LEVELS) {
        allData[level] = [];
    }

    querySnapshot.docs.forEach((doc) => {
        const item = doc.data() as EscopoSequenciaItem;
        if (item.level && allData[item.level]) {
            allData[item.level]!.push(item);
        }
    });

    console.log("Finished fetching data from Firestore.");
    return allData;
}
