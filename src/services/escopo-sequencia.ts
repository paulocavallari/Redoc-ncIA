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
  /** Original raw 'Objetivos' column - preserved for potential future use. */
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


// --- Header Mapping & Finding Logic ---

// Updated possible headers based on user feedback and potential variations
const POSSIBLE_HEADERS: { [key in keyof EscopoSequenciaItem]?: string[] } = {
    anoSerie: ['ANO/SÉRIE', 'Ano/Série', 'Ano', 'Série'],
    bimestre: ['BIMESTRE', 'Bimestre'],
    habilidade: ['HABILIDADE', 'Habilidade', 'Habilidades'],
    objetosDoConhecimento: ['OBJETOS DO CONHECIMENTO', 'Objetos do Conhecimento', 'Objeto do Conhecimento', 'Objetos de Conhecimento', 'Objetos de conhecimento'], // Added 'Objetos de conhecimento'
    conteudo: ['CONTEUDO', 'Conteúdo', 'Conteudos', 'Conteúdos'], // Added 'Conteúdos' based on error log
    objetivos: ['OBJETIVOS', 'Objetivos', 'Objetivo'],
};

// Define the core mandatory keys corresponding to the required headers
const MANDATORY_KEYS: (keyof EscopoSequenciaItem)[] = ['anoSerie', 'bimestre', 'habilidade', 'objetosDoConhecimento', 'conteudo'];

/**
 * Finds the first matching header name from a list of possibilities (case-insensitive).
 *
 * @param headers - Array of header strings from the sheet.
 * @param possibleNames - Array of possible header names to look for.
 * @returns The matching header name found in the headers array (maintaining original casing), or undefined if none match.
 */
function findHeader(headers: string[], possibleNames: string[] | undefined): string | undefined {
  if (!possibleNames) return undefined;
  const lowerCaseHeaders = headers.map(h => h ? String(h).trim().toLowerCase() : ''); // Handle potential null/undefined headers and trim
  for (const name of possibleNames) {
    const lowerCaseName = name.toLowerCase();
    const index = lowerCaseHeaders.indexOf(lowerCaseName);
    if (index !== -1) {
      return headers[index]; // Return the original casing from the sheet header
    }
  }
  return undefined;
}

/**
 * Identifies the header row and maps column names to expected keys.
 * @param jsonData - Data read from the sheet as array of arrays.
 * @param sheetName - Name of the sheet being processed (for logging).
 * @param startRowIndex - The row index to start searching for headers (relative to jsonData).
 * @param absoluteStartRowIndex - The original row index in the Excel sheet (1-based, for logging).
 * @returns An object containing the mapped headers, the actual headers found, and the index of the header row (relative to jsonData), or null if no valid header row is found or mandatory headers are missing.
 */
function findAndMapHeaders(jsonData: any[][], sheetName: string, startRowIndex: number, absoluteStartRowIndex: number): { headerMap: { [key in keyof EscopoSequenciaItem]?: string }, headers: string[], headerIndex: number } | null {
    const HEADER_SEARCH_LIMIT = 10; // Search up to 10 rows from the start index
    let headerIndex = -1; // Relative index within jsonData
    let headers: string[] = [];
    const MIN_MANDATORY_FOUND_THRESHOLD = 3; // Require at least 3 mandatory headers to identify the row

    for (let i = startRowIndex; i < Math.min(jsonData.length, startRowIndex + HEADER_SEARCH_LIMIT); i++) {
        const potentialHeaderRow = jsonData[i];
        // Ensure it's an array and has some non-empty cells
        if (!Array.isArray(potentialHeaderRow) || potentialHeaderRow.length === 0 || potentialHeaderRow.every(cell => cell === null || String(cell).trim() === '')) continue;

        const potentialHeaders = potentialHeaderRow.map((h: any) => String(h || '').trim());
        let foundMandatoryCount = 0;

        MANDATORY_KEYS.forEach(key => {
            if (findHeader(potentialHeaders, POSSIBLE_HEADERS[key])) {
                foundMandatoryCount++;
            }
        });

        // Consider it a header row if it meets the threshold
        if (foundMandatoryCount >= MIN_MANDATORY_FOUND_THRESHOLD) {
            headerIndex = i; // Relative index
            headers = potentialHeaders;
            console.log(`Identified header row at relative index ${headerIndex} (row ${absoluteStartRowIndex + headerIndex} in sheet) in sheet "${sheetName}":`, headers);
            break;
        }
    }

    if (headerIndex === -1) {
        console.warn(`Could not identify a valid header row containing at least ${MIN_MANDATORY_FOUND_THRESHOLD} mandatory columns in sheet "${sheetName}" starting from row ${absoluteStartRowIndex} within the search limit.`);
        return null;
    }

    // Map headers to expected keys
    const headerMap: { [key in keyof EscopoSequenciaItem]?: string } = {};
    let foundHeadersLog: string[] = [];
     Object.keys(POSSIBLE_HEADERS).forEach(key => {
        const mappedHeader = findHeader(headers, POSSIBLE_HEADERS[key as keyof EscopoSequenciaItem]);
        if (mappedHeader) { // Only map if found
           headerMap[key as keyof EscopoSequenciaItem] = mappedHeader;
           foundHeadersLog.push(`${key}:'${mappedHeader}'`);
        }
    });

    // Check for mandatory columns AFTER mapping
    const missingHeaders = MANDATORY_KEYS.filter(key => !headerMap[key]);
    const headerRowNumberInSheet = absoluteStartRowIndex + headerIndex;
    if (missingHeaders.length > 0) {
      // Improved error logging
      console.error(`Sheet "${sheetName}" (header row ${headerRowNumberInSheet}) is missing required columns: ${missingHeaders.join(', ')}. Possible headers looked for: ${MANDATORY_KEYS.map(k => `[${k}: ${POSSIBLE_HEADERS[k]?.join('/')}]`).join(' ')}. Headers Found in Row: [${headers.join(', ')}]`);
      console.warn(`Skipping sheet "${sheetName}" due to missing required columns.`);
      return null; // Return null if mandatory headers are missing
    }

    console.log(`Successfully mapped headers for sheet "${sheetName}": [${foundHeadersLog.join(', ')}]`);
    return { headerMap, headers, headerIndex };
}


/**
 * Processes the uploaded Escopo-Sequência XLSX file data.
 * Dynamically finds the header row based on the EducationLevel.
 * Extracts only numbers for 'Ano/Série' and 'Bimestre'.
 * Ignores the sheet named "Índice".
 * Looks for variations in column headers defined in POSSIBLE_HEADERS.
 *
 * @param fileData - The ArrayBuffer containing the XLSX file data.
 * @param level - The education level associated with the file.
 * @returns An array of EscopoSequenciaItem objects parsed from the file.
 * @throws Error if the file format is invalid.
 */
export function processEscopoFile(fileData: ArrayBuffer, level: EducationLevel): EscopoSequenciaItem[] {
  const workbook = XLSX.read(fileData, { type: 'buffer' });
  const allData: EscopoSequenciaItem[] = [];

  // Determine the starting row index for header search based on level (1-based index for logging)
  const headerSearchStartRowAbsolute = level === "Anos Iniciais" ? 2 : 1; // Row 2 for Anos Iniciais, Row 1 for others
  const headerSearchStartRowIndex = headerSearchStartRowAbsolute - 1; // 0-based index for array access

  workbook.SheetNames.forEach((sheetName) => {
    const trimmedSheetName = sheetName.trim();
    // Ignore the "Índice" sheet (case-insensitive)
    if (trimmedSheetName.toLowerCase() === 'índice') {
        console.log(`Skipping sheet "${sheetName}" as it is the index.`);
        return;
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        console.warn(`Skipping invalid or empty sheet "${sheetName}".`);
        return; // Skip if sheet is somehow invalid
    }

    // Read ALL data from the sheet first, then find headers
     const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
         header: 1,
         blankrows: false, // Keep blankrows false, handle empty checks later
         defval: null, // Ensure empty cells are represented as null
     });


    if (!jsonData || jsonData.length < headerSearchStartRowAbsolute) { // Need enough rows to reach the header search start
      console.warn(`Skipping sheet "${trimmedSheetName}" due to insufficient data (less than ${headerSearchStartRowAbsolute} rows).`);
      return;
    }

     // Find the header row and map columns, starting from the specified index
    // Pass the 0-based index and the 1-based index for logging
    const headerInfo = findAndMapHeaders(jsonData, trimmedSheetName, headerSearchStartRowIndex, headerSearchStartRowAbsolute);

    if (!headerInfo) {
      return; // Skip sheet if headers are invalid or not found
    }
    // headerIndex here is relative to the start of jsonData
    const { headerMap, headers, headerIndex } = headerInfo;
    const actualDataStartIndex = headerIndex + 1; // Data starts in the row immediately after the header


    // Process data rows starting after the header row within jsonData
    for (let i = actualDataStartIndex; i < jsonData.length; i++) {
      const row = jsonData[i];
       // Skip if row is completely empty or doesn't seem like a valid data row
       if (!Array.isArray(row) || row.length === 0 || row.every((cell: any) => cell === null || String(cell).trim() === '')) {
            continue;
       }

      const item: Partial<EscopoSequenciaItem> = { disciplina: trimmedSheetName }; // Discipline from sheet name

      Object.entries(headerMap).forEach(([key, headerName]) => {
        if (headerName) {
            const colIndex = headers.indexOf(headerName);
            let cellValue: any = null;
            if (colIndex !== -1 && colIndex < row.length) {
                cellValue = row[colIndex];
            }

             const itemKey = key as keyof EscopoSequenciaItem;
             if (itemKey === 'anoSerie' || itemKey === 'bimestre') {
                 item[itemKey] = extractNumber(cellValue);
             } else if (cellValue !== null && cellValue !== undefined) {
                 // Trim string values
                 item[itemKey] = typeof cellValue === 'string' ? cellValue.trim() : String(cellValue);
             } else {
                 // Assign empty string for mandatory fields if cell is empty/null/undefined
                 if (MANDATORY_KEYS.includes(itemKey)) {
                     item[itemKey] = '';
                 }
                 // Optional fields remain undefined if cell is empty
             }
        }
      });

       // Validate that all mandatory keys have non-empty values after processing
       const hasEssentialData = MANDATORY_KEYS.every(key => {
           const value = item[key];
           return value !== undefined && value !== null && String(value).trim() !== '';
       });

       if (hasEssentialData) {
           allData.push(item as EscopoSequenciaItem);
       } else {
           // Optionally log rows that are skipped due to missing essential data
            // console.warn(`Skipping row ${i + 1} in sheet "${trimmedSheetName}" due to missing essential data.`);
       }
    }
  });

  console.log(`Processed ${allData.length} valid items from the uploaded file for level "${level}".`);
  return allData;
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
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`Saved ${data.length} escopo items for level "${level}" to localStorage key "${storageKey}". Existing data was replaced.`);
       window.dispatchEvent(new CustomEvent('escopoDataUpdated'));
    } catch (error) {
      console.error(`Error saving escopo data for level "${level}" to localStorage:`, error);
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
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(`Error parsing escopo data for level "${level}" from localStorage:`, error);
        return [];
      }
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
    if (typeof window !== 'undefined') {
        return getEscopoDataFromStorage(level);
    }
    console.warn(`Cannot fetch data for level "${level}" outside browser. Returning empty array.`);
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
     console.warn("Cannot fetch all data outside browser. Returning empty object.");
     return {};
}

/**
 * Clears the Escopo-Sequência data from localStorage for a specific education level.
 * Should only be called on the client-side.
 *
 * @param level - The education level to clear data for.
 */
export function clearEscopoDataForLevel(level: EducationLevel): void {
  if (typeof window !== 'undefined') {
    const storageKey = getStorageKeyForLevel(level);
    try {
      localStorage.removeItem(storageKey);
      console.log(`Cleared escopo data for level "${level}" from localStorage.`);
       window.dispatchEvent(new CustomEvent('escopoDataUpdated'));
    } catch (error) {
      console.error(`Error clearing escopo data for level "${level}" from localStorage:`, error);
    }
  } else {
    console.warn("Attempted to clear escopo data outside of a browser environment.");
  }
}
