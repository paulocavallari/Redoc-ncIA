
/**
 * @fileOverview Service for handling Escopo-Sequência data using Firestore.
 */

import { db } from '@/lib/firebase'; // Firestore instance
import { collection, writeBatch, getDocs, query, where, CollectionReference, DocumentData } from 'firebase/firestore';
import * as XLSX from 'xlsx';

// Define Education Levels (remains the same)
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
 * Represents the data structure for a single row item stored in Firestore.
 */
export interface EscopoSequenciaItem {
  disciplina: string;
  anoSerie: string;
  bimestre: string;
  habilidade: string;
  objetosDoConhecimento: string;
  conteudo: string;
  objetivos?: string;
  level: EducationLevel; // Added level to each item for easier querying
}

// Collection reference in Firestore
const ESCOPO_COLLECTION = 'escopo-sequencia';

const extractNumber = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    const match = str.match(/\d+/);
    return match ? match[0] : '';
};

const POSSIBLE_HEADERS: { [key in keyof Omit<EscopoSequenciaItem, 'level'>]?: string[] } = {
    anoSerie: ['ANO/SÉRIE', 'Ano/Série', 'Ano', 'Série'],
    bimestre: ['BIMESTRE', 'Bimestre'],
    habilidade: ['HABILIDADE', 'Habilidade', 'Habilidades'],
    objetosDoConhecimento: ['OBJETOS DO CONHECIMENTO', 'Objetos do Conhecimento', 'Objeto do Conhecimento', 'Objetos de Conhecimento', 'Objetos de conhecimento'],
    conteudo: ['CONTEUDO', 'Conteúdo', 'Conteudos', 'Conteúdos'],
    objetivos: ['OBJETIVOS', 'Objetivos', 'Objetivo'],
};

const MANDATORY_KEYS: (keyof Omit<EscopoSequenciaItem, 'level' | 'disciplina' | 'objetivos'>)[] = ['anoSerie', 'bimestre', 'habilidade', 'objetosDoConhecimento', 'conteudo'];

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

function findAndMapHeaders(jsonData: any[][], sheetName: string, startRowIndex: number): { headerMap: { [key: string]: string }, headers: string[], headerIndex: number } | null {
    const HEADER_SEARCH_LIMIT = 10;
    let headerIndex = -1;
    let headers: string[] = [];
    const MIN_MANDATORY_FOUND_THRESHOLD = 3;

    for (let i = startRowIndex; i < Math.min(jsonData.length, startRowIndex + HEADER_SEARCH_LIMIT); i++) {
        const potentialHeaderRow = jsonData[i];
        if (!Array.isArray(potentialHeaderRow) || potentialHeaderRow.length === 0 || potentialHeaderRow.every(cell => cell === null || String(cell).trim() === '')) continue;

        const potentialHeaders = potentialHeaderRow.map((h: any) => String(h || '').trim());
        let foundMandatoryCount = 0;

        MANDATORY_KEYS.forEach(key => {
            if (findHeader(potentialHeaders, POSSIBLE_HEADERS[key])) {
                foundMandatoryCount++;
            }
        });

        if (foundMandatoryCount >= MIN_MANDATORY_FOUND_THRESHOLD) {
            headerIndex = i;
            headers = potentialHeaders;
            console.log(`Identified header row at index ${headerIndex} in sheet "${sheetName}".`);
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

    const missingHeaders = MANDATORY_KEYS.filter(key => !headerMap[key]);
    if (missingHeaders.length > 0) {
      console.error(`Sheet "${sheetName}" is missing required columns: ${missingHeaders.join(', ')}.`);
      return null;
    }

    console.log(`Successfully mapped headers for sheet "${sheetName}": [${foundHeadersLog.join(', ')}]`);
    return { headerMap, headers, headerIndex };
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

  const headerSearchStartRowIndex = level === 'Anos Iniciais' ? 1 : 0; // Start at row 2 for "Anos Iniciais"

  workbook.SheetNames.forEach((sheetName) => {
    const trimmedSheetName = sheetName.trim();
    if (trimmedSheetName.toLowerCase() === 'índice') {
      return;
    }
    if (trimmedSheetName.toLowerCase() === 'projeto de convivência') {
        console.log(`Skipping non-curricular sheet: "${sheetName}"`);
        return;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: null });

    if (!jsonData || jsonData.length < headerSearchStartRowIndex + 1) {
      return;
    }

    const headerInfo = findAndMapHeaders(jsonData, trimmedSheetName, headerSearchStartRowIndex);

    if (!headerInfo) {
      return;
    }
    const { headerMap, headers, headerIndex } = headerInfo;
    const actualDataStartIndex = headerIndex + 1;

    for (let i = actualDataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!Array.isArray(row) || row.length === 0 || row.every((cell: any) => cell === null || String(cell).trim() === '')) {
        continue;
      }

      const item: Partial<EscopoSequenciaItem> = { disciplina: trimmedSheetName, level };

      Object.entries(headerMap).forEach(([key, headerName]) => {
        if (headerName) {
            const colIndex = headers.indexOf(headerName);
            let cellValue: any = (colIndex !== -1 && colIndex < row.length) ? row[colIndex] : null;

            const itemKey = key as keyof EscopoSequenciaItem;
            if (itemKey === 'anoSerie' || itemKey === 'bimestre') {
                item[itemKey] = extractNumber(cellValue);
            } else if (cellValue !== null && cellValue !== undefined) {
                item[itemKey] = String(cellValue).trim();
            } else {
                if (MANDATORY_KEYS.includes(itemKey as any)) {
                    item[itemKey] = '';
                }
            }
        }
      });

      const hasEssentialData = MANDATORY_KEYS.every(key => {
          const value = item[key as keyof EscopoSequenciaItem];
          return value !== undefined && value !== null && String(value).trim() !== '';
      });

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
    const addBatch = writeBatch(db);
    data.forEach((item, index) => {
        const docRef = collection(db, ESCOPO_COLLECTION).doc(); // Auto-generate ID
        addBatch.set(docRef, item);
        if ((index + 1) % 500 === 0) { // Firestore batch limit is 500
            addBatch.commit();
            // batch = writeBatch(db); // Re-initialize batch
        }
    });
    await addBatch.commit(); // Commit the last batch

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
