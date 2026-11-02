import {createRequire} from 'node:module';
import {existsSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'sitmun-admin/package.json'));
const ts = require('typescript');

function parseArgs(argv) {
  const args = {app: null, dictionary: join(root, 'tools/dictionary/dictionary.json'), failOn: 'problem', root: null, apply: false};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--app') args.app = argv[++i];
    else if (arg === '--dictionary') args.dictionary = resolve(argv[++i]);
    else if (arg === '--fail-on') args.failOn = argv[++i];
    else if (arg === '--root') args.root = resolve(argv[++i]);
    else if (arg === '--apply') args.apply = true;
  }
  return args;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules') walk(path, out);
    } else if ((name.endsWith('.ts') && !name.endsWith('.spec.ts')) || name.endsWith('.html')) out.push(path);
  }
  return out;
}

function importedDomainNames(sourceFile) {
  const names = new Set();
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = node.moduleSpecifier.text;
      if (from.includes('/domain') || from.endsWith('domain')) {
        const clause = node.importClause;
        if (clause && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) names.add(element.name.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return names;
}

function validatorFacts(node) {
  let maxLength = null;
  let required = false;
  function visit(current) {
    if (ts.isPropertyAccessExpression(current) && current.name.text === 'required') required = true;
    if (ts.isCallExpression(current)) {
      const called = current.expression;
      const name = ts.isPropertyAccessExpression(called) ? called.name.text : ts.isIdentifier(called) ? called.text : '';
      if (name === 'maxLength' && current.arguments[0] && ts.isNumericLiteral(current.arguments[0])) {
        maxLength = Number(current.arguments[0].text);
      }
      if (name === 'required') required = true;
    }
    ts.forEachChild(current, visit);
  }
  if (node) visit(node);
  return {maxLength, required};
}

function entityFormRoot(sourceFile) {
  let found = null;
  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === 'entityForm' &&
      node.right.arguments &&
      node.right.arguments[0] &&
      ts.isObjectLiteralExpression(node.right.arguments[0])
    ) {
      found = node.right.arguments[0];
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function controlsIn(sourceFile, root = sourceFile) {
  const found = [];
  function visit(node) {
    const isControl =
      (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
      expressionName(node.expression) &&
      ['FormControl', 'UntypedFormControl'].includes(expressionName(node.expression));
    if (isControl && node.parent && ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name)) {
      const validators = node.arguments && node.arguments[1];
      found.push({name: node.parent.name.text, ...validatorFacts(validators)});
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return found;
}

function expressionName(expression) {
  if (!expression) return '';
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return '';
}

function inputLengths(sourceFile) {
  const found = [];
  function visit(node) {
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'input_length') {
      if (ts.isNumericLiteral(node.initializer)) found.push(Number(node.initializer.text));
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function columnFor(document, simpleName, property) {
  const aliases = {Connection: 'DatabaseConnection', CodeList: 'CodeListValue'};
  const stripped = simpleName.replace(/Projection$/, '');
  const names = [simpleName, stripped, aliases[stripped], aliases[simpleName]].filter(
    (name, index, all) => name && all.indexOf(name) === index,
  );
  for (const name of names) {
    const suffix = `.${name}#${property}`;
    for (const [key, row] of Object.entries(document.columns || {})) {
      const jpa = row.consumers && row.consumers.jpa;
      if (jpa && jpa.endsWith(suffix)) return [key, row];
    }
  }
  return null;
}

function formType(sourceFile) {
  let found = null;
  function visit(node) {
    if (
      ts.isHeritageClause(node) &&
      node.types[0] &&
      node.types[0].expression &&
      ts.isIdentifier(node.types[0].expression) &&
      node.types[0].expression.text === 'BaseFormComponent' &&
      node.types[0].typeArguments &&
      node.types[0].typeArguments[0] &&
      ts.isTypeReferenceNode(node.types[0].typeArguments[0]) &&
      ts.isIdentifier(node.types[0].typeArguments[0].typeName)
    ) {
      found = node.types[0].typeArguments[0].typeName.text;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return found;
}

function entityFormSlices(text) {
  const slices = [];
  const marker = /<form\b[^>]*\bentityForm\b[^>]*>/g;
  let match = marker.exec(text);
  while (match) {
    const end = text.indexOf('</form>', match.index);
    if (end > match.index) slices.push({start: match.index, end});
    match = marker.exec(text);
  }
  return slices;
}

function templateControls(slice) {
  const found = [];
  for (const tag of slice.split(/<(?:input|textarea)\b/).slice(1)) {
    const name = tag.match(/formControlName=["']([^"']+)["']/);
    const max = tag.match(/\[maxlength\]="(\d+)"|maxlength="(\d+)"/);
    if (!name) continue;
    found.push({
      name: name[1],
      maxLength: max ? Number(max[1] || max[2]) : null,
      required: /(?:^|[\s])required(?:[\s=/>]|$)/.test(tag.split('>')[0]),
    });
  }
  return found;
}

export function checkFormTemplate(text, file, document, declared) {
  if (!declared) return [];
  const rows = [];
  for (const slice of entityFormSlices(text)) {
    for (const control of templateControls(text.slice(slice.start, slice.end))) {
      const match = columnFor(document, declared, control.name);
      if (!match) continue;
      const [key, row] = match;
      if (row.type !== 'string') continue;
      if (row.length != null && control.maxLength !== row.length) {
        rows.push(`length|${key}|${file}#${control.name}|${row.length}|${control.maxLength ?? ''}`);
      }
      if (Boolean(row.required) !== control.required) {
        rows.push(`required|${key}|${file}#${control.name}|${Boolean(row.required)}|${control.required}`);
      }
    }
  }
  return rows;
}

function applyFormTemplate(text, document, declared) {
  if (!declared) return text;
  const slices = entityFormSlices(text).sort((a, b) => b.start - a.start);
  let out = text;
  for (const slice of slices) {
    let body = out.slice(slice.start, slice.end);
    for (const control of templateControls(body)) {
      const match = columnFor(document, declared, control.name);
      if (!match || match[1].type !== 'string') continue;
      const row = match[1];
      if (row.length != null && control.maxLength != null && control.maxLength !== row.length) {
        body = body.replace(
          new RegExp(`(formControlName=["']${control.name}["'][^>]*\\[maxlength\\]=")${control.maxLength}`),
          `$1${row.length}`,
        );
        body = body.replace(
          new RegExp(`(\\[maxlength\\]=")${control.maxLength}("[^>]*formControlName=["']${control.name}["'])`),
          `$1${row.length}$2`,
        );
      }
      if (Boolean(row.required) !== control.required) {
        const tag = new RegExp(`(<(?:input|textarea)\\b[^>]*formControlName=["']${control.name}["'][^>]*)>`);
        body = body.replace(tag, (whole, start) => {
          if (row.required) return `${start} required>`;
          return `${start.replace(/\srequired(?=[\s=/>]|$)/, '')}>`;
        });
      }
    }
    out = out.slice(0, slice.start) + body + out.slice(slice.end);
  }
  return out;
}

export function checkHtml(text, file, document) {
  const rows = [];
  for (const block of text.split('<app-form-field-input').slice(1)) {
    if (!block.includes('recoveryRequest.email')) continue;
    const length = block.match(/\[input_length\]="(\d+)"/);
    const email = Object.entries(document.fields || {}).find(([name]) => name.endsWith('RequestNewPassword#email'));
    if (!email || !length) continue;
    const column = document.columns[email[1].same_as];
    if (column && Number(length[1]) !== column.length) {
      rows.push(`length|${email[1].same_as}|${file}#input_length|${column.length}|${length[1]}`);
    }
  }
  return rows;
}

function insertFirstValidator(slice, validator) {
  const at = slice.indexOf('[');
  if (at === -1) return slice.replace(/\)\s*$/, `, [${validator}])`);
  return `${slice.slice(0, at + 1)}${validator}, ${slice.slice(at + 1)}`;
}

function rewrittenControl(slice, row, facts) {
  let next = slice;
  if (row.type === 'string' && row.length != null && facts.maxLength !== row.length) {
    if (facts.maxLength != null) next = next.replace(`maxLength(${facts.maxLength})`, `maxLength(${row.length})`);
    else next = insertFirstValidator(next, `Validators.maxLength(${row.length})`);
  }
  if (row.type === 'string' && Boolean(row.required) !== facts.required) {
    if (row.required) next = insertFirstValidator(next, 'Validators.required');
    else next = next.replace(/Validators\.required\s*,\s*/, '').replace(/,\s*Validators\.required/, '');
  }
  return next.replace(/\[,[ \t]*/g, '[').replace(/,[ \t]*,/g, ',').replace(/,[ \t]*\]/g, ']');
}

export function applySource(text, file, document) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const declared = formType(source);
  const imported = importedDomainNames(source);
  const root = entityFormRoot(source) || source;
  const edits = [];
  function visit(node) {
    const isControl =
      (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
      ['FormControl', 'UntypedFormControl'].includes(expressionName(node.expression));
    if (isControl && node.parent && ts.isPropertyAssignment(node.parent) && ts.isIdentifier(node.parent.name) && node.arguments) {
      const matches = declared
        ? [columnFor(document, declared, node.parent.name.text)].filter(Boolean)
        : [...imported].map((name) => columnFor(document, name, node.parent.name.text)).filter(Boolean);
      if (matches.length === 1) {
        const [, row] = matches[0];
        const facts = validatorFacts(node.arguments[1]);
        const start = node.getStart(source);
        const end = node.getEnd();
        const slice = text.slice(start, end);
        const next = rewrittenControl(slice, row, facts);
        if (next !== slice) edits.push({start, end, next});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  let out = text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.next + out.slice(edit.end);
  }
  return out;
}

export function checkSource(text, file, document) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const imported = importedDomainNames(source);
  const declared = formType(source);
  const rows = [];
  const seen = new Set();
  for (const control of controlsIn(source, entityFormRoot(source) || source)) {
    const matches = declared
      ? [columnFor(document, declared, control.name)].filter(Boolean)
      : [...imported].map((name) => columnFor(document, name, control.name)).filter(Boolean);
    if (matches.length !== 1) continue;
    const [key, row] = matches[0];
    seen.add(`${key}@${file}#${control.name}`);
    if (row.type === 'string' && row.length != null && control.maxLength !== row.length) {
      rows.push(`length|${key}|${file}#${control.name}|${row.length}|${control.maxLength ?? ''}`);
    }
    if (Boolean(row.required) !== control.required && row.type === 'string') {
      rows.push(`required|${key}|${file}#${control.name}|${row.required}|${control.required}`);
    }
  }
  if (file.includes('forgot-password')) {
    const lengths = inputLengths(source);
    const email = document.fields && Object.entries(document.fields).find(([name]) => name.endsWith('#email'));
    if (email && lengths.length) {
      const column = document.columns[email[1].same_as];
      if (column && lengths[0] !== column.length) {
        rows.push(`length|${email[1].same_as}|${file}#input_length|${column.length}|${lengths[0]}`);
      }
    }
  }
  return {rows, seen};
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const document = JSON.parse(readFileSync(args.dictionary, 'utf8'));
  const base = args.root || (args.app ? join(root, args.app, 'src') : null);
  if (!base) {
    console.error('pass --app or --root');
    process.exit(2);
  }
  const drifts = [];
  for (const file of walk(base)) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(root, file);
    if (file.endsWith('.html')) {
      const sibling = file.replace(/\.html$/, '.ts');
      const declared = existsSync(sibling) ? formType(ts.createSourceFile(sibling, readFileSync(sibling, 'utf8'), ts.ScriptTarget.Latest, true)) : null;
      if (args.apply) {
        const next = applyFormTemplate(text, document, declared);
        if (next !== text) writeFileSync(file, next);
      } else {
        drifts.push(...checkHtml(text, rel, document));
        drifts.push(...checkFormTemplate(text, rel, document, declared));
      }
    } else if (args.apply) {
      const next = applySource(text, rel, document);
      if (next !== text) writeFileSync(file, next);
    } else drifts.push(...checkSource(text, rel, document).rows);
  }
  const counts = {length: 0, required: 0, default: 0, unique: 0, codelist: 0, openapi: 0};
  for (const row of drifts) counts[row.split('|')[0]] = (counts[row.split('|')[0]] || 0) + 1;
  const open = Object.values(document.columns || {}).filter((row) => row.status === 'open').length;
  for (const name of Object.keys(counts)) console.log(`${name}=${counts[name]}`);
  console.log(`open=${open}`);
  for (const row of drifts) console.log(row);
  if (args.failOn === 'problem' && (drifts.length || open)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
