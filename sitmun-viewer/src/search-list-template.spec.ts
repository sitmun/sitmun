import { readFileSync } from 'node:fs';
import path from 'node:path';

type CompiledTemplate = {
  main: (
    container: { escapeExpression: (value: unknown) => string },
    depth0: { controlId?: string },
    helpers: unknown,
    partials: unknown,
    data: unknown
  ) => string;
};

function readSitnaFile(relativePath: string): string {
  return readFileSync(
    path.join(process.cwd(), 'node_modules/api-sitna', relativePath),
    'utf8'
  );
}

// API-SITNA 4.10.0 Search.renderData() finds its result list with
// `.tc-ctl-search-list-container[for="<control id>"]`, but the published
// template has no `for` attribute. patches/api-sitna@4.10.0.patch adds it (#352).
describe('API-SITNA search list template', () => {
  it('marks the list container with the control id', () => {
    const source = readSitnaFile('TC/templates/tc-ctl-search-list.mjs');
    const template = new Function(
      source.replace('export default', 'return')
    )() as CompiledTemplate;
    const container = {
      escapeExpression: (value: unknown) => String(value ?? '')
    };

    const div = document.createElement('div');
    div.innerHTML = template.main(
      container,
      { controlId: 'tc-ctl-search-1' },
      {},
      {},
      {}
    );

    expect(
      div.querySelector('.tc-ctl-search-list-container[for="tc-ctl-search-1"]')
    ).not.toBeNull();
  });

  it('matches the selector Search.js uses', () => {
    const source = readSitnaFile('TC/control/Search.js');

    expect(source).toMatch(/list-container\[for="\$\{self\.getId\(\)\}"\]/);
  });
});
