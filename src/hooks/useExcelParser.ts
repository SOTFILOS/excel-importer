import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { ExcelFile, ParsedSheet } from '../types/excel';

interface UseExcelParserResult {
  sheets: string[];
  activeSheet: string;
  setActiveSheet: (name: string) => void;
  headers: string[];
  rows: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  parsedFile: ExcelFile | null;
}

/** Replace embedded newlines in a header cell with a single space and trim. */
function cleanHeaderText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normaliseHeader(value: unknown, index: number): string {
  const str = cleanHeaderText(value);
  return str !== '' ? str : `Column ${index + 1}`;
}

/**
 * Find the rightmost column index that contains a non-empty value
 * across ALL rows (including the header row).
 */
function maxNonEmptyColumn(rows: unknown[][]): number {
  let max = 0;
  for (const row of rows) {
    for (let i = row.length - 1; i >= 0; i--) {
      const v = row[i];
      if (v !== '' && v !== null && v !== undefined) {
        if (i > max) max = i;
        break;
      }
    }
  }
  return max;
}

/**
 * A row is considered "substantive" if at least one column
 * beyond index 0 has a non-empty value.
 * This filters out template placeholder rows that only carry
 * a sequential counter in the first column.
 */
function isSubstantiveRow(row: unknown[]): boolean {
  return row.slice(1).some((v) => v !== '' && v !== null && v !== undefined);
}

function parseSheet(worksheet: XLSX.WorkSheet, sheetName: string): ParsedSheet {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawRows.length === 0) {
    return { name: sheetName, headers: [], rows: [] };
  }

  // 1) Clean all cells: collapse whitespace/newlines and trim; whitespace-only → ''
  const cleaned: unknown[][] = (rawRows as unknown[][]).map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) return '';
      if (typeof cell === 'string') {
        const s = cell
          .replace(/\r\n|\r|\n/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        return s === '' ? '' : s;
      }
      return cell;
    })
  );

  // 2) Remove entirely-empty columns (including interior ones)
  const colCount = cleaned.reduce((max, row) => Math.max(max, row.length), 0);
  const keepIndices: number[] = [];
  for (let i = 0; i < colCount; i++) {
    let hasValue = false;
    for (let r = 0; r < cleaned.length; r++) {
      const v = cleaned[r][i];
      if (v !== '' && v !== null && v !== undefined) {
        if (typeof v === 'string') {
          if (v.trim().length > 0) {
            hasValue = true;
            break;
          }
        } else {
          hasValue = true;
          break;
        }
      }
    }
    if (hasValue) keepIndices.push(i);
  }

  const compact = cleaned.map((row) => keepIndices.map((idx) => row[idx] ?? ''));

  if (compact.length === 0 || keepIndices.length === 0) {
    return { name: sheetName, headers: [], rows: [] };
  }

  // 3) Extract and clean headers
  const headerRow = compact[0];
  const rawHeaders = headerRow.map((cell, i) => normaliseHeader(cell, i));

  // Deduplicate colliding headers (e.g. two unnamed columns → "Column N (1)")
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h} (${count})`;
  });

  // 4) Build data rows, skipping placeholder-only rows
  const rows: Record<string, unknown>[] = compact
    .slice(1)
    .filter(isSubstantiveRow)
    .map((rawRow) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        let v = rawRow[i] ?? '';
        if (typeof v === 'string') v = v.trim();
        record[header] = v;
      });
      return record;
    });

  return { name: sheetName, headers, rows };
}

export function useExcelParser(file: File | null): UseExcelParserResult {
  const [parsedFile, setParsedFile] = useState<ExcelFile | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setParsedFile(null);
      setActiveSheet('');
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        if (!(arrayBuffer instanceof ArrayBuffer)) {
          throw new Error('Unexpected file read result.');
        }

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheets: ParsedSheet[] = workbook.SheetNames.map((name) =>
          parseSheet(workbook.Sheets[name], name)
        );

        const result: ExcelFile = {
          fileName: file.name,
          fileSize: file.size,
          sheets,
        };
        setParsedFile(result);
        setActiveSheet(sheets[0]?.name ?? '');
      } catch (err) {
        setError(
          err instanceof Error
            ? `Parse error: ${err.message}`
            : 'Failed to parse the Excel file.'
        );
        setParsedFile(null);
        setActiveSheet('');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Could not read the file. Please try again.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [file]);

  const currentSheet = parsedFile?.sheets.find((s) => s.name === activeSheet);

  return {
    sheets: parsedFile?.sheets.map((s) => s.name) ?? [],
    activeSheet,
    setActiveSheet,
    headers: currentSheet?.headers ?? [],
    rows: currentSheet?.rows ?? [],
    loading,
    error,
    parsedFile,
  };
}
