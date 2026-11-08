export interface SqlPlacement {
  kind: 'CLIENT' | 'SYSTEM';
  name: string;
  start: number;
  end: number;
  context: 'VALUE' | 'WHOLE_LITERAL' | 'IN_LIST';
}

export interface SqlViolation {
  code: string;
  name: string | null;
  start: number;
  end: number;
}

export interface SqlScan {
  placements: SqlPlacement[];
  violations: SqlViolation[];
}

const NAME_PART = 'NAME_PART';
const PARTIAL_LITERAL = 'PARTIAL_LITERAL';
const BARE_BRACES = 'BARE_BRACES';
const UNKNOWN_SYSTEM = 'UNKNOWN_SYSTEM';
const UNDECLARED = 'UNDECLARED';
const UNUSED = 'UNUSED';
const LIST_OUTSIDE_IN = 'LIST_OUTSIDE_IN';
const NOT_SELECT = 'NOT_SELECT';
const WITH = 'WITH';
const SEMICOLON = 'SEMICOLON';
const TRAILING_COMMENT = 'TRAILING_COMMENT';
const MUN_INES = 'MUN_INES';

interface Placeholder {
  system: boolean;
  bare: boolean;
  name: string;
  start: number;
  end: number;
}

export function scanSql(
  sql: string | null | undefined,
  declaredNames: Iterable<string>,
  systemNames: Iterable<string>
): SqlScan {
  const text = stripTrailingWhitespace(sql ?? '');
  const declared = new Set(declaredNames);
  const system = new Set(systemNames);
  const placements: SqlPlacement[] = [];
  const violations: SqlViolation[] = [];
  const used = new Set<string>();
  let withReported = false;
  let sawWord = false;
  let lineComment = false;
  let blockComment = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (lineComment) {
      if (c === '\n') {
        lineComment = false;
      }
      i += 1;
      continue;
    }
    if (blockComment) {
      if (c === '*' && text[i + 1] === '/') {
        blockComment = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (c === '-' && text[i + 1] === '-') {
      lineComment = true;
      i += 2;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      blockComment = true;
      i += 2;
      continue;
    }
    if (c === "'") {
      i = readSingleQuote(text, i, placements, violations, used, declared, system);
      continue;
    }
    if (c === '"') {
      i = readDoubleQuote(text, i, violations);
      continue;
    }
    if (c === ';') {
      violations.push({ code: SEMICOLON, name: null, start: i, end: i + 1 });
      i += 1;
      continue;
    }
    const placeholder = readPlaceholder(text, i);
    if (placeholder?.bare) {
      violations.push({
        code: BARE_BRACES,
        name: placeholder.name,
        start: placeholder.start,
        end: placeholder.end
      });
      i = placeholder.end;
      continue;
    }
    if (placeholder) {
      classifyCode(text, placeholder, placements, violations, used, declared, system);
      i = placeholder.end;
      continue;
    }
    if (isWordStart(c)) {
      const start = i;
      i += 1;
      while (i < text.length && isWordPart(text[i])) {
        i += 1;
      }
      const word = text.slice(start, i);
      if (!sawWord) {
        sawWord = true;
        if (word.toLowerCase() !== 'select') {
          violations.push({ code: NOT_SELECT, name: word, start, end: i });
        }
      }
      if (word.toLowerCase() === 'with' && !withReported) {
        withReported = true;
        violations.push({ code: WITH, name: word, start, end: i });
      }
      continue;
    }
    i += 1;
  }
  if (lineComment || blockComment) {
    violations.push({ code: TRAILING_COMMENT, name: null, start: 0, end: text.length });
  }
  for (const name of declared) {
    if (!used.has(name)) {
      violations.push({ code: UNUSED, name, start: -1, end: -1 });
    }
  }
  return { placements, violations };
}

function readSingleQuote(
  text: string,
  open: number,
  placements: SqlPlacement[],
  violations: SqlViolation[],
  used: Set<string>,
  declared: Set<string>,
  system: Set<string>
): number {
  let i = open + 1;
  while (i < text.length) {
    if (text[i] === "'" && text[i + 1] === "'") {
      i += 2;
      continue;
    }
    if (text[i] === "'") {
      const inner = text.slice(open + 1, i);
      const whole = wholePlaceholder(inner, open);
      if (whole) {
        classifyLiteral(whole, open, i + 1, placements, violations, used, declared, system);
      } else {
        scanInner(text, open + 1, i, PARTIAL_LITERAL, violations);
      }
      return i + 1;
    }
    i += 1;
  }
  scanInner(text, open + 1, text.length, PARTIAL_LITERAL, violations);
  return text.length;
}

function readDoubleQuote(text: string, open: number, violations: SqlViolation[]): number {
  let i = open + 1;
  while (i < text.length) {
    if (text[i] === '"') {
      scanInner(text, open + 1, i, NAME_PART, violations);
      return i + 1;
    }
    i += 1;
  }
  scanInner(text, open + 1, text.length, NAME_PART, violations);
  return text.length;
}

function scanInner(
  text: string,
  from: number,
  to: number,
  code: string,
  violations: SqlViolation[]
): void {
  let i = from;
  while (i < to) {
    const placeholder = readPlaceholder(text, i);
    if (placeholder && placeholder.end <= to) {
      violations.push({
        code: placeholder.bare ? BARE_BRACES : code,
        name: placeholder.name,
        start: placeholder.start,
        end: placeholder.end
      });
      i = placeholder.end;
      continue;
    }
    i += 1;
  }
}

function classifyLiteral(
  placeholder: Placeholder,
  start: number,
  end: number,
  placements: SqlPlacement[],
  violations: SqlViolation[],
  used: Set<string>,
  declared: Set<string>,
  system: Set<string>
): void {
  if (placeholder.system && placeholder.name === MUN_INES) {
    violations.push({ code: LIST_OUTSIDE_IN, name: MUN_INES, start, end });
    return;
  }
  if (!acceptName(placeholder, violations, declared, system)) {
    return;
  }
  placements.push({
    kind: placeholder.system ? 'SYSTEM' : 'CLIENT',
    name: placeholder.name,
    start,
    end,
    context: 'WHOLE_LITERAL'
  });
  if (!placeholder.system) {
    used.add(placeholder.name);
  }
}

function classifyCode(
  text: string,
  placeholder: Placeholder,
  placements: SqlPlacement[],
  violations: SqlViolation[],
  used: Set<string>,
  declared: Set<string>,
  system: Set<string>
): void {
  if (touchesWord(text, placeholder)) {
    violations.push({
      code: NAME_PART,
      name: placeholder.name,
      start: placeholder.start,
      end: placeholder.end
    });
    return;
  }
  if (placeholder.system && placeholder.name === MUN_INES) {
    if (!isWholeInList(text, placeholder.start, placeholder.end)) {
      violations.push({
        code: LIST_OUTSIDE_IN,
        name: MUN_INES,
        start: placeholder.start,
        end: placeholder.end
      });
      return;
    }
    if (!system.has(MUN_INES)) {
      violations.push({
        code: UNKNOWN_SYSTEM,
        name: MUN_INES,
        start: placeholder.start,
        end: placeholder.end
      });
      return;
    }
    placements.push({
      kind: 'SYSTEM',
      name: MUN_INES,
      start: placeholder.start,
      end: placeholder.end,
      context: 'IN_LIST'
    });
    return;
  }
  if (!acceptName(placeholder, violations, declared, system)) {
    return;
  }
  placements.push({
    kind: placeholder.system ? 'SYSTEM' : 'CLIENT',
    name: placeholder.name,
    start: placeholder.start,
    end: placeholder.end,
    context: 'VALUE'
  });
  if (!placeholder.system) {
    used.add(placeholder.name);
  }
}

function acceptName(
  placeholder: Placeholder,
  violations: SqlViolation[],
  declared: Set<string>,
  system: Set<string>
): boolean {
  if (placeholder.name.length === 0) {
    violations.push({
      code: NAME_PART,
      name: '',
      start: placeholder.start,
      end: placeholder.end
    });
    return false;
  }
  if (placeholder.system) {
    if (!system.has(placeholder.name)) {
      violations.push({
        code: UNKNOWN_SYSTEM,
        name: placeholder.name,
        start: placeholder.start,
        end: placeholder.end
      });
      return false;
    }
    return true;
  }
  if (!declared.has(placeholder.name)) {
    violations.push({
      code: UNDECLARED,
      name: placeholder.name,
      start: placeholder.start,
      end: placeholder.end
    });
    return false;
  }
  return true;
}

function touchesWord(text: string, placeholder: Placeholder): boolean {
  const before = placeholder.start - 1;
  const after = placeholder.end;
  const left = before >= 0 && isWordPart(text[before]);
  const right = after < text.length && isWordPart(text[after]);
  return left || right;
}

function isWholeInList(text: string, start: number, end: number): boolean {
  let i = start - 1;
  while (i >= 0 && /\s/.test(text[i])) {
    i -= 1;
  }
  if (i < 0 || text[i] !== '(') {
    return false;
  }
  i -= 1;
  while (i >= 0 && /\s/.test(text[i])) {
    i -= 1;
  }
  const wordEnd = i;
  while (i >= 0 && isWordPart(text[i])) {
    i -= 1;
  }
  if (wordEnd < 0 || text.slice(i + 1, wordEnd + 1).toLowerCase() !== 'in') {
    return false;
  }
  let j = end;
  while (j < text.length && /\s/.test(text[j])) {
    j += 1;
  }
  return j < text.length && text[j] === ')';
}

function wholePlaceholder(inner: string, openQuote: number): Placeholder | null {
  const placeholder = readPlaceholder(inner, 0);
  if (!placeholder || placeholder.bare || placeholder.start !== 0 || placeholder.end !== inner.length) {
    return null;
  }
  return {
    system: placeholder.system,
    bare: false,
    name: placeholder.name,
    start: openQuote,
    end: openQuote + 1 + inner.length + 1
  };
}

function readPlaceholder(text: string, i: number): Placeholder | null {
  if (i >= text.length) {
    return null;
  }
  const c = text[i];
  if ((c === '$' || c === '#') && text[i + 1] === '{') {
    let j = i + 2;
    while (j < text.length && isWordPart(text[j])) {
      j += 1;
    }
    if (text[j] === '}') {
      return {
        system: c === '#',
        bare: false,
        name: text.slice(i + 2, j),
        start: i,
        end: j + 1
      };
    }
    return null;
  }
  if (c === '{' && (i === 0 || (text[i - 1] !== '$' && text[i - 1] !== '#'))) {
    let j = i + 1;
    while (j < text.length && isWordPart(text[j])) {
      j += 1;
    }
    if (j > i + 1 && text[j] === '}') {
      return {
        system: false,
        bare: true,
        name: text.slice(i + 1, j),
        start: i,
        end: j + 1
      };
    }
  }
  return null;
}

function isWordStart(c: string): boolean {
  return /[A-Za-z_]/.test(c);
}

function isWordPart(c: string): boolean {
  return /[A-Za-z0-9_]/.test(c);
}

function stripTrailingWhitespace(sql: string): string {
  return sql.replace(/[ \t\r]+$/u, '');
}
