const fs = require('fs');
const path = require('path');

// api-sitna 4.9 DataLoader falls back to an obsolete child control named
// externalWMS (and fileImport) when wmsSuggestions / enableDragAndDrop are
// omitted. The find() result is used without a presence check, so a map whose
// dataLoader options never included those children throws while the map is
// opening. Skip the property read when the child is absent.
const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'api-sitna',
  'TC',
  'control',
  'DataLoader.js'
);

const target = [
  '        const suggestions = self.options.wmsSuggestions ??',
  '            self.options.controls.find((ctl) => ctl.name === "externalWMS").options.suggestions;',
  '        const enableDragAndDrop = self.options.enableDragAndDrop ??',
  '            self.options.controls.find((ctl) => ctl.name === "fileImport").options.enableDragAndDrop;',
  '',
  '        self.controlOptions = [',
  '            {',
  "                title: 'addWMS',",
  '                externalWMS: { suggestions },',
  '            },',
  '            {',
  "                title: 'openFile',",
  '                fileImport: { enableDragAndDrop },',
  '            }',
  '        ];'
].join('\n');

const replacement = [
  '        const legacyControlOptions = (name) =>',
  '            Array.isArray(self.options.controls)',
  '                ? self.options.controls.find((ctl) => ctl.name === name)?.options',
  '                : undefined;',
  '        const suggestions = self.options.wmsSuggestions ??',
  '            legacyControlOptions("externalWMS")?.suggestions;',
  '        const enableDragAndDrop = self.options.enableDragAndDrop ??',
  '            legacyControlOptions("fileImport")?.enableDragAndDrop;',
  '',
  '        self.controlOptions = [',
  '            {',
  "                title: 'addWMS',",
  '                externalWMS: { suggestions },',
  '            },',
  '            {',
  "                title: 'openFile',",
  '                fileImport: { enableDragAndDrop },',
  '            }',
  '        ];',
  '        self.ctlCount = self.controlOptions.length;'
].join('\n');

if (!fs.existsSync(filePath)) {
  console.warn(`[patch-dataloader-legacy-controls] File not found: ${filePath}`);
  process.exit(0);
}

let source = fs.readFileSync(filePath, 'utf8');
const originalSource = source;
source = source.replace(/\r\n/g, '\n');

if (source.includes(replacement)) {
  console.log('[patch-dataloader-legacy-controls] Already patched.');
  process.exit(0);
}

if (!source.includes(target)) {
  console.warn(
    '[patch-dataloader-legacy-controls] Target snippet not found. No changes made.'
  );
  process.exit(0);
}

const updated = source.replace(target, replacement);
const finalContent = originalSource.includes('\r\n')
  ? updated.replace(/\n/g, '\r\n')
  : updated;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('[patch-dataloader-legacy-controls] Patch applied.');
