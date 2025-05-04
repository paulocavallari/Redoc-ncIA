
/**
 * @fileOverview Service for handling Escopo-Sequência data, including processing XLSX uploads and retrieving data per education level.
 */

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

// Base storage key, will be appended with the education level
const ESCOPO_STORAGE_KEY_BASE = 'escopoSequenciaData_';

/**
 * Generates the specific localStorage key for a given education level.
 * @param level - The education level.
 * @returns The localStorage key string.
 */
const getStorageKeyForLevel = (level: EducationLevel): string => {
    // Replace spaces and special characters for a cleaner key
    const sanitizedLevel = level.replace(/[^a-zA-Z0-9]/g, '_');
    return `${ESCOPO_STORAGE_KEY_BASE}${sanitizedLevel}`;
}

/**
 * Represents a data structure for a single row item within the scope sequence data,
 * derived from the uploaded XLSX file.
 */
export interface EscopoSequenciaItem {
  /** The discipline, derived from the worksheet name. */
  disciplina: string;
  /** The year or series number (e.g., "6"). Extracted number only. */
  anoSerie: string;
  /** The school term/bimester number (e.g., "1"). Extracted number only. */
  bimestre: string;
  /** The specific skill code/description (e.g., "(EF06MA07)"). */
  habilidade: string;
  /** The knowledge object(s) related to the skill (e.g., "Números naturais: sistema de numeração decimal"). */
  objetosDoConhecimento: string; // Note: Field name adjusted for clarity
  /** The specific content related to the knowledge object (e.g., "Leitura, escrita e ordenação de números naturais"). */
  conteudo: string;
  /** Original raw 'Objetivos' column - preserved for potential future use, not used by current UI */
  objetivos?: string; // Keep original 'objetivos' if present, marked optional
}

/**
 * Extracts only the first sequence of digits from a string.
 * @param value - The input string.
 * @returns The extracted number as a string, or an empty string if no digits found.
 */
const extractNumber = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    const match = str.match(/\d+/); // Find the first sequence of digits
    return match ? match[0] : '';
};

/**
 * Processes the uploaded Escopo-Sequência XLSX file data.
 * Extracts only numbers for 'Ano/Série' and 'Bimestre'.
 *
 * @param fileData - The ArrayBuffer containing the XLSX file data.
 * @returns An array of EscopoSequenciaItem objects parsed from the file.
 * @throws Error if the file format is invalid or essential columns are missing.
 */
export function processEscopoFile(fileData: ArrayBuffer): EscopoSequenciaItem[] {
  const workbook = XLSX.read(fileData, { type: 'buffer' });
  const allData: EscopoSequenciaItem[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return; // Skip if sheet is somehow invalid

    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Read as array of arrays

    if (!jsonData || jsonData.length < 2) {
      console.warn(`Skipping sheet "${sheetName}" due to insufficient data or header row.`);
      return; // Skip empty or header-only sheets
    }

    // Find header row index (assuming it's the first row)
    const headerRow = jsonData[0];
    const headers = headerRow.map((h: any) => String(h || '').trim());

    // Map headers to expected keys, allowing for variations
    const headerMap: { [key: string]: string | undefined } = {
      anoSerie: findHeader(headers, ['Ano/Série', 'Ano', 'Série']),
      bimestre: findHeader(headers, ['Bimestre']),
      habilidade: findHeader(headers, ['Habilidade', 'Habilidades']),
      objetosDoConhecimento: findHeader(headers, ['Objetos do Conhecimento', 'Objeto do Conhecimento', 'Objetos de Conhecimento']),
      conteudo: findHeader(headers, ['Conteúdo', 'Conteudos']),
      objetivos: findHeader(headers, ['Objetivos', 'Objetivo']), // Optional original column
    };

    // Check for mandatory columns (excluding optional 'objetivos')
    const missingHeaders = Object.entries(headerMap)
                                .filter(([key, value]) => !value && key !== 'objetivos')
                                .map(([key]) => key);

    if (missingHeaders.length > 0) {
      console.error(`Sheet "${sheetName}" is missing required columns: ${missingHeaders.join(', ')}. Headers found: ${headers.join(', ')}`);
      console.warn(`Skipping sheet "${sheetName}" due to missing columns: ${missingHeaders.join(', ')}`);
       return;
    }

    // Process data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0 || row.every((cell: any) => cell === null || cell === '')) {
          continue; // Skip empty rows
      }

      const item: Partial<EscopoSequenciaItem> = { disciplina: sheetName.trim() }; // Discipline from sheet name

      Object.entries(headerMap).forEach(([key, headerName]) => {
        if (headerName) {
          const colIndex = headers.indexOf(headerName);
          let cellValue: any = null;
          if (colIndex !== -1 && row[colIndex] !== null && row[colIndex] !== undefined) {
            cellValue = row[colIndex];
          }

          // Apply specific processing for number extraction
          if (key === 'anoSerie' || key === 'bimestre') {
            (item as any)[key] = extractNumber(cellValue);
          } else if (cellValue !== null) {
            (item as any)[key] = String(cellValue).trim();
          } else {
             // Set default value or handle missing optional data
             if (key !== 'objetivos') {
                 (item as any)[key] = ''; // Set empty string for required fields if missing in row
             }
          }
        }
      });

       // Validate that essential fields (now with extracted numbers) are present after processing the row
       if (item.anoSerie && item.bimestre && item.habilidade && item.objetosDoConhecimento && item.conteudo) {
           allData.push(item as EscopoSequenciaItem);
       } else {
            console.warn(`Skipping row ${i+1} in sheet "${sheetName}" due to missing essential data after processing. Processed Item:`, item, "Original Row:", row);
       }
    }
  });

  console.log(`Processed ${allData.length} items from the uploaded file.`);
  return allData;
}


/**
 * Finds the first matching header name from a list of possibilities (case-insensitive).
 *
 * @param headers - Array of header strings from the sheet.
 * @param possibleNames - Array of possible header names to look for.
 * @returns The matching header name found in the headers array, or undefined if none match.
 */
function findHeader(headers: string[], possibleNames: string[]): string | undefined {
  const lowerCaseHeaders = headers.map(h => h.toLowerCase());
  for (const name of possibleNames) {
    const lowerCaseName = name.toLowerCase();
    const index = lowerCaseHeaders.indexOf(lowerCaseName);
    if (index !== -1) {
      return headers[index]; // Return the original casing
    }
  }
  return undefined;
}


/**
 * Saves the processed Escopo-Sequência data to localStorage for a specific education level,
 * overwriting any existing data for that level.
 * Should only be called on the client-side.
 *
 * @param level - The education level the data belongs to.
 * @param data - The array of EscopoSequenciaItem objects to save.
 */
export function saveEscopoDataToStorage(level: EducationLevel, data: EscopoSequenciaItem[]): void {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKeyForLevel(level);
    try {
      // Clear existing data first (optional, but matches requirement)
      // localStorage.removeItem(storageKey); // Uncomment if explicit clearing is desired before setting

      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`Saved ${data.length} escopo items for level "${level}" to localStorage key "${storageKey}".`);
    } catch (error) {
      console.error(`Error saving escopo data for level "${level}" to localStorage:`, error);
      // Handle potential storage errors (e.g., quota exceeded)
    }
  } else {
      console.warn("Attempted to save escopo data outside of a browser environment.");
  }
}

/**
 * Retrieves the Escopo-Sequência data from localStorage for a specific education level.
 * Should only be called on the client-side.
 *
 * @param level - The education level to retrieve data for.
 * @returns An array of EscopoSequenciaItem objects, or an empty array if not found or error occurs.
 */
export function getEscopoDataFromStorage(level: EducationLevel): EscopoSequenciaItem[] {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKeyForLevel(level);
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
         console.log(`Loaded ${data.length} escopo items for level "${level}" from localStorage key "${storageKey}".`);
        // Basic validation: check if it's an array
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(`Error parsing escopo data for level "${level}" from localStorage:`, error);
        return [];
      }
    } else {
         console.log(`No escopo data found in localStorage for level "${level}" (key: "${storageKey}").`);
    }
  }
  return [];
}

/**
 * Retrieves Escopo-Sequência data for ALL education levels from localStorage.
 * Should only be called on the client-side.
 *
 * @returns An object where keys are EducationLevels and values are arrays of EscopoSequenciaItem.
 */
export function getAllEscopoDataFromStorage(): { [key in EducationLevel]?: EscopoSequenciaItem[] } {
    const allData: { [key in EducationLevel]?: EscopoSequenciaItem[] } = {};
    if (typeof window !== 'undefined') {
        EDUCATION_LEVELS.forEach(level => {
            allData[level] = getEscopoDataFromStorage(level);
        });
    }
    return allData;
}


/**
 * Asynchronously retrieves the scope sequence data for a specific level.
 * Currently, it only loads from localStorage (client-side).
 *
 * @param level - The education level to retrieve data for.
 * @returns A promise that resolves to an array of EscopoSequenciaItem objects.
 */
export async function getEscopoSequenciaData(level: EducationLevel): Promise<EscopoSequenciaItem[]> {
    // On the client-side, try loading from localStorage.
    if (typeof window !== 'undefined') {
        return getEscopoDataFromStorage(level);
    }

    // Return empty array if not on client-side (or could fetch from server in future)
    console.log(`Cannot fetch data for level "${level}" outside browser. Returning empty array.`);
    return [];
}

/**
 * Asynchronously retrieves ALL scope sequence data.
 * Currently, it only loads from localStorage (client-side).
 *
 * @returns A promise that resolves to an object containing data for all levels.
 */
export async function getAllEscopoSequenciaData(): Promise<{ [key in EducationLevel]?: EscopoSequenciaItem[] }> {
     if (typeof window !== 'undefined') {
        return getAllEscopoDataFromStorage();
     }
     console.log("Cannot fetch all data outside browser. Returning empty object.");
     return {};
}

