
/**
 * @fileOverview Service for handling Escopo-Sequência data using Firestore.
 * This service is designed to process complex XLSX files with multiple structures
 * and save the structured data into Firestore.
 */

import { db } from '@/lib/firebase'; // Firestore instance
import { collection, writeBatch, getDocs, query, where, CollectionReference, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

// Define Education Levels
export const EDUCATION_LEVELS = [
  "Anos Iniciais",
  "Anos Finais",
  "Ensino Médio",
  "Ensino Médio Técnico - 2ª Série",
  "Ensino Médio Técnico - 3ª Série",
  "Ensino Médio Noturno",
] as const;

export type EducationLevel = typeof EDUCATION_LEVELS[number];

/**
 * Represents the comprehensive data structure for a single row item,
 * accommodating all variations from "Padrão Mestre" to "Técnico".
 */
export interface EscopoSequenciaItem {
  level: EducationLevel;
  disciplina: string;

  // --- Padrão Mestre & Variações ---
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

  // --- Variações Específicas ---
  linguagem?: string; // para Arte
  campoDeAtuacao?: string; // para Língua Portuguesa
  praticasDeLinguagem?: string; // para Língua Portuguesa, Redação
  topicoGramatical?: string; // para Língua Portuguesa
  semana?: string; // para Tecnologia, Redação, Técnico
  data?: string; // para Tecnologia
  aulaUnidade?: string; // para Tecnologia
  aulaSala?: string; // para Tecnologia
  habilidadeBNCCComputacao?: string;
  diretrizesCurricularesTec?: string;
  entregaDeProjeto?: string;
  generosDasProducoesBimestrais?: string; // para Redação
  competenciasSocioemocionais?: string; // para Projeto de Vida, Técnico
  tema?: string; // para Educação Física

  // --- Padrão Técnico ---
  chTeoricaPratica?: string;
  competenciaTecnica?: string;
  nomeDoComponente?: string;
  codigoDoComponente?: string;
  componente3ou4Aulas?: string;
  unidadeCurricular?: string;
  codigoUnidadeCurricular?: string;
  temaDaSemana?: string;
  habilidadesTecnicas?: string;
  habilidadesSocioemocionais?: string; // Pode ser o mesmo que 'competenciasSocioemocionais'
  objetoDeConhecimentoMacro?: string;
}


// Collection reference in Firestore
const ESCOPO_COLLECTION = 'escopo-sequencia';

const extractNumber = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    const match = str.match(/\d+/);
    return match ? match[0] : '';
};

// Massively expanded header dictionary to match all described variations.
const POSSIBLE_HEADERS: { [key in keyof Omit<EscopoSequenciaItem, 'level' | 'disciplina'>]?: string[] } = {
    // Padrão Mestre
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

    // Variações Específicas
    linguagem: ['Linguagem'], // Arte
    campoDeAtuacao: ['Campo de Atuação'], // LP
    praticasDeLinguagem: ['Práticas de Linguagem'], // LP, Redação
    topicoGramatical: ['Tópico Gramatical'], // LP
    semana: ['Semana'], // Tecnologia, Redação, Técnico
    data: ['Data'], // Tecnologia
    aulaUnidade: ['Aula Unidade'], // Tecnologia
    aulaSala: ['Aula Sala'], // Tecnologia
    habilidadeBNCCComputacao: ['Habilidade BNCC Computação'],
    diretrizesCurricularesTec: ['Diretrizes Curriculares Tec. e Inovação'],
    entregaDeProjeto: ['Entrega de projeto'],
    generosDasProducoesBimestrais: ['Gêneros das Produções Bimestrais'], // Redação
    tema: ['TEMA'], // Ed. Física

    // Padrão Técnico / Competências
    competenciasSocioemocionais: ['Competências', 'Competências socioemocionais'], // Projeto de Vida, Técnico
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

// Core keys that suggest a valid data row for the "Mestre" pattern.
const MESTRE_MANDATORY_KEYS: (keyof EscopoSequenciaItem)[] = ['anoSerie', 'bimestre', 'objetosDoConhecimento', 'conteudo'];
// Core keys for the "Técnico" pattern.
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

        // Determine pattern based on which has more key headers. Tecnico is more specific.
        if (foundTecnicoCount >= 3) {
            headerIndex = i;
            headers = potentialHeaders;
            pattern = 'tecnico';
            console.log(`Identified "Técnico" header row at index ${headerIndex} in sheet "${sheetName}".`);
            break;
        } else if (foundMestreCount >= 3) {
            headerIndex = i;
            headers = potentialHeaders;
            pattern = 'mestre';
            console.log(`Identified "Mestre" header row at index ${headerIndex} in sheet "${sheetName}".`);
            break;
        }
    }

    if (headerIndex === -1) {
        console.warn(`Could not identify a valid header row in sheet "${sheetName}".`);
        return null;
    }

    const headerMap: { [key: string]: string } = {};
    let foundHeadersLog: string[] = [];
     Object.keys(POSSIBLE_HEADERS).forEach(key => {
        const mappedHeader = findHeader(headers, POSSIBLE_HEADERS[key as keyof typeof POSSIBLE_HEADERS]);
        if (mappedHeader) {
           headerMap[key] = mappedHeader;
           foundHeadersLog.push(`${key}:'${mappedHeader}'`);
        }
    });

    const mandatoryKeys = pattern === 'mestre' ? MESTRE_MANDATORY_KEYS : TECNICO_MANDATORY_KEYS;
    const missingHeaders = mandatoryKeys.filter(key => !headerMap[key]);

    // Make 'habilidade' optional for "Projeto de Convivência"
    const isProjetoConvivencia = sheetName.toLowerCase().includes('projeto de convivência');
    const finalMissing = isProjetoConvivencia ? missingHeaders.filter(h => h !== 'habilidade') : missingHeaders;


    if (finalMissing.length > 0) {
      console.error(`Sheet "${sheetName}" is missing required columns for pattern "${pattern}": ${finalMissing.join(', ')}.`);
      return null;
    }

    console.log(`Successfully mapped headers for sheet "${sheetName}" (Pattern: ${pattern}): [${foundHeadersLog.join(', ')}]`);
    return { headerMap, headers, headerIndex, pattern };
}

/**
 * Processes the XLSX file and returns structured data. This function runs on the client.
 * @param fileData - The ArrayBuffer of the XLSX file.
 * @param level - The education level for this data.
 * @returns An array of EscopoSequenciaItem objects.
 */
export function processEscopoFile(fileData: ArrayBuffer, level: EducationLevel): EscopoSequenciaItem[] {
  const workbook = XLSX.read(fileData, { type: 'buffer' });
  const allData: EscopoSequenciaItem[] = [];

  // Anos Iniciais might have a different starting point for headers
  const headerSearchStartRowIndex = level === 'Anos Iniciais' ? 1 : 0;

  workbook.SheetNames.forEach((sheetName) => {
    const trimmedSheetName = sheetName.trim();
    // Skipping non-curricular sheets.
    if (['índice', 'capa'].includes(trimmedSheetName.toLowerCase())) {
        console.log(`Skipping non-curricular sheet: "${sheetName}"`);
        return;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

    if (!jsonData || jsonData.length < headerSearchStartRowIndex + 1) {
      console.warn(`Sheet "${sheetName}" is empty or too short. Skipping.`);
      return;
    }

    const headerInfo = findAndMapHeaders(jsonData, trimmedSheetName, headerSearchStartRowIndex);

    if (!headerInfo) {
      console.warn(`Skipping sheet "${sheetName}" due to header mapping issues.`);
      return;
    }
    const { headerMap, headers, headerIndex, pattern } = headerInfo;
    const actualDataStartIndex = headerIndex + 1;

    for (let i = actualDataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row) || row.length === 0 || row.every((cell: any) => cell === null || String(cell).trim() === '')) {
        continue; // Skip empty rows
      }

      // Initialize with mandatory properties
      const item: Partial<EscopoSequenciaItem> = {
          disciplina: trimmedSheetName,
          level
      };

      // Populate all found fields from the header map
      Object.entries(headerMap).forEach(([key, headerName]) => {
        if (headerName) {
            const colIndex = headers.indexOf(headerName);
            let cellValue: any = (colIndex !== -1 && colIndex < row.length) ? row[colIndex] : null;

            const itemKey = key as keyof EscopoSequenciaItem;

            if (cellValue !== null && cellValue !== undefined) {
                 // Specific extractors for numeric-like fields
                 if (['anoSerie', 'bimestre', 'aula', 'semana'].includes(itemKey)) {
                    item[itemKey] = extractNumber(cellValue);
                } else {
                    item[itemKey] = String(cellValue).trim();
                }
            }
        }
      });

      // Validate if the row has the essential data after processing
      const mandatoryKeys = pattern === 'mestre' ? MESTRE_MANDATORY_KEYS : TECNICO_MANDATORY_KEYS;
      let hasEssentialData = mandatoryKeys.every(key => {
          const value = item[key];
          return value !== undefined && value !== null && String(value).trim() !== '';
      });

      // Special handling for 'Projeto de Convivência' which may lack 'habilidade'
       if (!hasEssentialData && pattern === 'mestre' && trimmedSheetName.toLowerCase().includes('projeto de convivência')) {
           const missingKeys = mandatoryKeys.filter(key => {
               const value = item[key];
               return value === undefined || value === null || String(value).trim() === '';
           });
            // If the only missing key is 'habilidade', consider it valid.
           if (missingKeys.length === 1 && missingKeys[0] === 'habilidade') {
               hasEssentialData = true;
           }
       }


      if (hasEssentialData) {
          allData.push(item as EscopoSequenciaItem);
      }
    }
  });
  return allData;
}


/**
 * Saves processed Escopo-Sequência data to Firestore, overwriting existing data for that level.
 * @param level - The education level the data belongs to.
 * @param data - The array of EscopoSequenciaItem objects to save.
 */
export async function saveEscopoDataToFirestore(level: EducationLevel, data: EscopoSequenciaItem[]): Promise<void> {
    if (!data.length) {
        console.log(`No data provided to save for level "${level}".`);
        return;
    }
    const escopoCollection = collection(db, ESCOPO_COLLECTION) as CollectionReference<EscopoSequenciaItem>;

    // 1. Delete existing documents for this level
    console.log(`Deleting existing documents for level: ${level}`);
    const deleteQuery = query(escopoCollection, where('level', '==', level));
    const deleteSnapshot = await getDocs(deleteQuery);
    const deleteBatch = writeBatch(db);
    deleteSnapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log(`Deleted ${deleteSnapshot.size} old documents for level "${level}".`);

    // 2. Add new documents in batches
    console.log(`Adding ${data.length} new documents for level "${level}".`);

    let addBatch = writeBatch(db);
    data.forEach((item, index) => {
        const docRef = doc(escopoCollection); // Correct way to get a new doc ref with auto-ID
        addBatch.set(docRef, item);
        if ((index + 1) % 500 === 0) { // Firestore batch limit is 500
            addBatch.commit();
            addBatch = writeBatch(db); // Re-initialize batch
        }
    });

    // Commit any remaining items in the last batch
    if (data.length % 500 !== 0) {
        await addBatch.commit();
    }


    console.log(`Successfully saved ${data.length} items for level "${level}" to Firestore.`);
    window.dispatchEvent(new CustomEvent('escopoDataUpdated'));
}

/**
 * Retrieves Escopo-Sequência data for ALL education levels from Firestore.
 * @returns A promise that resolves to an object where keys are EducationLevels and values are arrays of items.
 */
export async function getAllEscopoDataFromFirestore(): Promise<{ [key in EducationLevel]?: EscopoSequenciaItem[] }> {
    console.log("Fetching all escopo-sequencia data from Firestore...");
    const escopoCollection = collection(db, ESCOPO_COLLECTION) as CollectionReference<EscopoSequenciaItem>;
    const q = query(escopoCollection);
    const querySnapshot = await getDocs(q);

    const allData: { [key in EducationLevel]?: EscopoSequenciaItem[] } = {};
    for (const level of EDUCATION_LEVELS) {
        allData[level] = [];
    }

    querySnapshot.forEach((doc) => {
        const item = doc.data();
        if (item.level && allData[item.level]) {
            allData[item.level]!.push(item);
        }
    });

    console.log("Finished fetching data from Firestore.");
    return allData;
}
