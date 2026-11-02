import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {pathToFileURL} from 'node:url';

const checker = await import(pathToFileURL(join(import.meta.dirname, '../bin/check_data_dictionary_clients.mjs')).href);

const document = {
  columns: {
    'STM_BACKGRD.BAC_NAME': {
      type: 'string',
      length: 20,
      required: true,
      consumers: {jpa: 'org.sitmun.domain.background.Background#name'},
    },
  },
  fields: {},
};

test('a wider admin maxLength is a length drift', () => {
  const text = `
    import {Background} from '@app/domain';
    const form = { name: new UntypedFormControl(null, [Validators.required, Validators.maxLength(30)]) };
  `;
  const {rows} = checker.checkSource(text, 'background-layers-form.component.ts', document);
  assert.equal(rows.length, 1);
  assert.match(rows[0], /^length\|STM_BACKGRD\.BAC_NAME\|/);
  assert.match(rows[0], /\|20\|30$/);
});

test('viewer email input length follows the column', () => {
  const html = '<app-form-field-input [input_length]="50" [input_model]="recoveryRequest.email"></app-form-field-input>';
  const doc = {
    columns: {'STM_USER.USE_EMAIL': {type: 'string', length: 250, required: false, consumers: {}}},
    fields: {'org.sitmun.infrastructure.security.password.dto.RequestNewPassword#email': {same_as: 'STM_USER.USE_EMAIL'}},
  };
  const rows = checker.checkHtml(html, 'forgot-password.component.html', doc);
  assert.equal(rows.length, 1);
  assert.match(rows[0], /\|250\|50$/);
});

test('apply inserts a validator at the first bracket only', () => {
  const text = `
    import {Background} from '@app/domain';
    const form = { name: new FormControl(null, [Validators.required, extra('[')]) };
  `;
  const out = checker.applySource(text, 'form.ts', document);
  assert.match(out, /\[Validators\.maxLength\(20\), Validators\.required, extra\('\['\)\]/);
});

test('a missing maxLength is wider than the column', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dict-'));
  const file = join(dir, 'form.ts');
  writeFileSync(file, 'export const unused = 1;\n');
  const text = `
    import {Background} from '@app/domain';
    const form = { name: new FormControl(null, [Validators.required]) };
  `;
  const {rows} = checker.checkSource(text, 'form.ts', document);
  assert.equal(rows.filter((row) => row.startsWith('length|')).length, 1);
  assert.match(rows.find((row) => row.startsWith('length|')), /\|20\|$/);
});
