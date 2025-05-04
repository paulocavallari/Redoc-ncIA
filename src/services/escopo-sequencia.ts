/**
 * @fileOverview Service for handling Escopo-Sequência data, including processing XLSX uploads and retrieving data.
 */
'use server'; // Mark functions potentially callable from Server Components/Actions

import * as XLSX from 'xlsx';

const ESCOPO_STORAGE_KEY = 'escopoSequenciaData';

/**
 * Represents a data structure for a single row item within the scope sequence data,
 * derived from the uploaded XLSX file.
 */
export interface EscopoSequenciaItem {
  /** The discipline, derived from the worksheet name. */
  disciplina: string;
  /** The year or series (e.g., "6º ano"). */
  anoSerie: string;
  /** The school term/bimester (e.g., "1º Bimestre"). */
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
 * Processes the uploaded Escopo-Sequência XLSX file data.
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

    // Check for mandatory columns
    const missingHeaders = Object.entries(headerMap)
                                .filter(([key, value]) => !value && key !== 'objetivos') // 'objetivos' is optional now
                                .map(([key]) => key);

    if (missingHeaders.length > 0) {
      console.error(`Sheet "${sheetName}" is missing required columns: ${missingHeaders.join(', ')}. Headers found: ${headers.join(', ')}`);
      // Optionally throw an error or continue processing other sheets
      // throw new Error(`Sheet "${sheetName}" is missing required columns: ${missingHeaders.join(', ')}`);
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
          if (colIndex !== -1 && row[colIndex] !== null && row[colIndex] !== undefined) {
            (item as any)[key] = String(row[colIndex]).trim();
          } else {
             // Set default value or handle missing optional data
             if (key !== 'objetivos') {
                 (item as any)[key] = ''; // Set empty string for required fields if missing in row
             }
          }
        }
      });

       // Validate that essential fields are present after processing the row
       if (item.anoSerie && item.bimestre && item.habilidade && item.objetosDoConhecimento && item.conteudo) {
           allData.push(item as EscopoSequenciaItem);
       } else {
            console.warn(`Skipping row ${i+1} in sheet "${sheetName}" due to missing essential data. Row:`, row);
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
 * Saves the processed Escopo-Sequência data to localStorage.
 * Should only be called on the client-side.
 *
 * @param data - The array of EscopoSequenciaItem objects to save.
 */
export function saveEscopoDataToStorage(data: EscopoSequenciaItem[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ESCOPO_STORAGE_KEY, JSON.stringify(data));
      console.log(`Saved ${data.length} escopo items to localStorage.`);
    } catch (error) {
      console.error("Error saving escopo data to localStorage:", error);
      // Handle potential storage errors (e.g., quota exceeded)
    }
  } else {
      console.warn("Attempted to save escopo data outside of a browser environment.");
  }
}

/**
 * Retrieves the Escopo-Sequência data from localStorage.
 * Should only be called on the client-side.
 *
 * @returns An array of EscopoSequenciaItem objects, or an empty array if not found or error occurs.
 */
export function getEscopoDataFromStorage(): EscopoSequenciaItem[] {
  if (typeof window !== 'undefined') {
    const storedData = localStorage.getItem(ESCOPO_STORAGE_KEY);
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
         console.log(`Loaded ${data.length} escopo items from localStorage.`);
        // Basic validation: check if it's an array
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error parsing escopo data from localStorage:", error);
        return [];
      }
    }
  }
  return [];
}

/**
 * Asynchronously retrieves the scope sequence data.
 * First tries to load from localStorage (client-side).
 * If not found locally, it could potentially fetch from a server endpoint in the future,
 * but currently returns an empty array if not in localStorage.
 *
 * @returns A promise that resolves to an array of EscopoSequenciaItem objects.
 */
export async function getEscopoSequenciaData(): Promise<EscopoSequenciaItem[]> {
    // On the client-side, try loading from localStorage first.
    if (typeof window !== 'undefined') {
        const localData = getEscopoDataFromStorage();
        if (localData.length > 0) {
        return localData;
        }
    }

    // Placeholder: In a future version, this could fetch initial/default data from a server.
    // For now, if not in localStorage, return empty.
    console.log("No escopo data found in localStorage. Returning empty array.");
    return [];

    // Example of fetching from an API endpoint (if implemented later):
    // try {
    //   const response = await fetch('/api/escopo-data'); // Your API endpoint
    //   if (!response.ok) {
    //     throw new Error(`HTTP error! status: ${response.status}`);
    //   }
    //   const data = await response.json();
    //   if (typeof window !== 'undefined') {
    //     saveEscopoDataToStorage(data); // Cache fetched data locally
    //   }
    //   return data;
    // } catch (error) {
    //   console.error("Error fetching escopo data from API:", error);
    //   return []; // Return empty on fetch error
    // }
}