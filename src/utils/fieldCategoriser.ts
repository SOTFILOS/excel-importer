/** Shared field-categorisation logic used by RecordList and RowDrawer. */

export type FlagKind = 'active' | 'yes' | 'no' | 'empty';

export function cellStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Strip leading asterisks and trim — "*A/A" → "A/A" */
export function cleanLabel(header: string): string {
  return header.replace(/^\*+/, '').trim();
}

export function isUrlValue(value: unknown): boolean {
  return /^https?:\/\//i.test(cellStr(value).trim());
}

export function flagKind(value: unknown): FlagKind | null {
  const raw = cellStr(value);
  const rawTrim = raw.trim();

  // Empty markers
  if (rawTrim === '' || rawTrim === '-' || rawTrim === '_' || rawTrim === '—' || rawTrim === '–') return 'empty';

  // Active/system flag
  if (rawTrim.toUpperCase() === 'X') return 'active';

  // Emoji/symbol checks (checked/unchecked marks)
  if (/[✓✔✅]/.test(raw)) return 'yes';
  if (/[✗✕×❌]/.test(raw)) return 'no';

  // Normalize: uppercase, remove diacritics, collapse spaces, strip edge punctuation/symbols
  let s = rawTrim
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Quick single-letter Y/N (Latin and Greek Nu lookalike for N)
  if (s === 'Y') return 'yes';
  if (s === 'N' || s === 'Ν') return 'no';

  // YES-like tokens (English + Greek + common synonyms)
  const yesTokens = new Set<string>([
    'YES', 'TRUE', 'T', '1', 'OK', 'OKAY',
    'DONE', 'COMPLETE', 'COMPLETED', 'FINISHED',
    'ΝΑΙ', 'NAI', 'OK', 'ΟΚ'
  ]);

  // NO-like tokens (English + Greek + common synonyms)
  const noTokens = new Set<string>([
    'NO', 'FALSE', 'F', '0',
    'PENDING', 'NOT STARTED', 'INCOMPLETE', 'NOT DONE', 'NOT COMPLETED',
    'ΟΧΙ', 'OXI'
  ]);

  if (yesTokens.has(s)) return 'yes';
  if (noTokens.has(s)) return 'no';

  return null;
}

/** Shorten a column name used as a chip label. */
export function shortLabel(header: string): string {
  return cleanLabel(header)
    .replace(/\s*\([Yy]\/[Nn]\)/g, '')
    .replace(/\s*(required|supported|completed)\??\s*$/i, '')
    .replace(/\?$/, '')
    .trim()
    .slice(0, 24)
    .trim();
}

// ── Palette ──────────────────────────────────────────────────────────────────

export interface PaletteColor {
  bg: string;
  text: string;
  accent: string;
  border: string;
}

const PALETTE: PaletteColor[] = [
  { bg: '#EBF5F5', text: '#095555', accent: '#0D6E6E', border: '#C6E4E4' },
  { bg: '#EEF2FF', text: '#3730A3', accent: '#4338CA', border: '#C7D2FE' },
  { bg: '#FFF7ED', text: '#9A3412', accent: '#EA580C', border: '#FED7AA' },
  { bg: '#F0FDF4', text: '#166534', accent: '#16A34A', border: '#BBF7D0' },
  { bg: '#FDF4FF', text: '#6B21A8', accent: '#9333EA', border: '#E9D5FF' },
  { bg: '#FFF1F2', text: '#9F1239', accent: '#E11D48', border: '#FECDD3' },
  { bg: '#F0F9FF', text: '#075985', accent: '#0284C7', border: '#BAE6FD' },
  { bg: '#FEFCE8', text: '#854D0E', accent: '#CA8A04', border: '#FEF08A' },
];

export function hashPalette(value: string): PaletteColor {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) & 0xffffffff;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ── Card content ─────────────────────────────────────────────────────────────

export interface CardContent {
  id: string;
  title: string;
  typeBadge: string;
  paletteColor: PaletteColor;
  details: Array<{ label: string; value: string }>;
  systemChips: string[];   // column names where value === X
  yesChips: string[];      // column names where value === Y / YES
  noChips: string[];       // column names where value === N / NO
  links: Array<{ label: string; url: string }>;
}

const DEFAULT_COLOR: PaletteColor = PALETTE[0];

export function buildCardContent(
  headers: string[],
  row: Record<string, unknown>,
  hiddenFields?: Set<string>
): CardContent {
  // Helpers
  const lc = (s: string) => s.toLowerCase();
  const isItemDesc = (h: string) => {
    const hl = lc(h);
    return hl.includes('item') && (hl.includes('descr') || hl.includes('description'));
  };
  const isProjectName = (h: string) => {
    const hl = lc(h);
    return hl.includes('project') && hl.includes('name');
  };
  const isPBI = (h: string) => /\bpbi\b/.test(lc(h));
  const isRedmineId = (h: string) => {
    const hl = lc(h);
    return (hl.includes('redmine') && hl.includes('id')) ||
           (hl.includes('after') && hl.includes('care') && (hl.includes('id') || hl.includes('redmine')));
  };
  // Greek business description column: "σαφή επιχειρησιακή περιγραφή των αλλαγών που υλοποιούνται"
  const isBizDesc = (h: string) => {
    const hl = lc(h);
    return hl.includes('σαφή') && hl.includes('επιχειρησιακ') && hl.includes('περιγραφ') && hl.includes('αλλαγ');
  };
  const isBlockedForFallback = (h: string) => {
    const hl = lc(h);
    const isTechTeam = (hl.includes('tech') || hl.includes('teck')) && hl.includes('team');
    const isTitleHeader = /\btitle\b/.test(hl);
    return isTechTeam || isTitleHeader;
  };

  // First pass: gather candidates and business description
  let itemDescVal = '';
  let itemDescHeader: string | null = null;
  let projectNameVal = '';
  let projectNameHeader: string | null = null;
  let pbiVal = '';
  let pbiHeader: string | null = null;
  let redmineVal = '';
  let redmineHeader: string | null = null;
  let bizDescVal = '';
  let bizDescHeader: string | null = null;

  for (const h of headers) {
    if (hiddenFields?.has(h)) continue;
    const s = cellStr(row[h]).trim();
    if (!s) continue;
    if (!bizDescVal && isBizDesc(h)) { bizDescVal = s; bizDescHeader = h; continue; }
    if (!itemDescVal && isItemDesc(h)) { itemDescVal = s; itemDescHeader = h; continue; }
    if (!projectNameVal && isProjectName(h)) { projectNameVal = s; projectNameHeader = h; continue; }
    if (!pbiVal && isPBI(h)) { pbiVal = s; pbiHeader = h; continue; }
    if (!redmineVal && isRedmineId(h)) { redmineVal = s; redmineHeader = h; continue; }
  }

  // Compose primary title by precedence: Item Description > Project Name > PBI Id > AfterCare Redmine Id
  let primaryTitle = itemDescVal || projectNameVal || pbiVal || redmineVal || '';
  // Compose final title including Greek business description (if provided)
  const finalTitleComposed = [primaryTitle, bizDescVal].filter(Boolean).join(' + ');

  // Prefer numeric ID from PBI or Redmine
  let id = '';
  if (pbiVal && !isNaN(Number(pbiVal))) id = pbiVal;
  else if (redmineVal && !isNaN(Number(redmineVal))) id = redmineVal;

  // Mark used headers to exclude from details
  const usedHeaders = new Set<string>();
  if (itemDescHeader && primaryTitle === itemDescVal) usedHeaders.add(itemDescHeader);
  if (projectNameHeader && primaryTitle === projectNameVal) usedHeaders.add(projectNameHeader);
  if (pbiHeader && primaryTitle === pbiVal) usedHeaders.add(pbiHeader);
  if (redmineHeader && primaryTitle === redmineVal) usedHeaders.add(redmineHeader);
  if (bizDescHeader && bizDescVal) usedHeaders.add(bizDescHeader);

  // Second pass: build rest (links, flags, typeBadge, details), respecting used/hidden
  let typeBadge = '';
  const details: Array<{ label: string; value: string }> = [];
  const systemChips: string[] = [];
  const yesChips: string[] = [];
  const noChips: string[] = [];
  const links: Array<{ label: string; url: string }> = [];

  for (const h of headers) {
    if (hiddenFields?.has(h)) continue;
    if (usedHeaders.has(h)) continue;

    const raw = row[h];
    const s = cellStr(raw).trim();
    if (!s) continue;

    const cl = cleanLabel(h);
    const hlo = lc(h);

    // URL fields → Links section
    if (isUrlValue(raw)) {
      links.push({ label: cl, url: s });
      continue;
    }

    // Flag fields
    const fk = flagKind(raw);
    if (fk === 'active') { systemChips.push(shortLabel(h)); continue; }
    if (fk === 'yes')    { yesChips.push(shortLabel(h));    continue; }
    if (fk === 'no')     { noChips.push(shortLabel(h));     continue; }
    if (fk === 'empty')  { continue; }

    // ID fallback: first pure number (if not already set from PBI/Redmine)
    if (!id && s !== '' && !isNaN(Number(s))) {
      id = s;
      continue;
    }

    // Type badge: column whose name contains type/category keywords
    if (!typeBadge && (hlo.includes('type') || hlo.includes('category') || hlo.includes('kind'))) {
      typeBadge = s;
      continue;
    }

    // Fallback title (only if we didn't get any primaryTitle), avoid blocked headers
    if (!primaryTitle && !isBlockedForFallback(h) && !s.includes('@') && s.length <= 60 && isNaN(Number(s))) {
      primaryTitle = s;
      continue;
    }

    // Everything else → details
    details.push({ label: cl, value: s });
  }

  const title = finalTitleComposed || primaryTitle || 'Row';

  const paletteColor = typeBadge
    ? hashPalette(typeBadge)
    : title
    ? hashPalette(title.slice(0, 4))
    : DEFAULT_COLOR;

  return {
    id,
    title,
    typeBadge,
    paletteColor,
    details,
    systemChips,
    yesChips,
    noChips,
    links,
  };
}
