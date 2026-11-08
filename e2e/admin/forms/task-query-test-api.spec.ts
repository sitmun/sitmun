import { expect, test, type APIRequestContext } from '../fixtures';

const ADMIN_JSON = {
  'X-SITMUN-Client': 'admin',
  'Content-Type': 'application/json',
};

test.describe('SQL query test API', () => {
  test('both runs bind the client value', async ({ request }) => {
    const body = await postTest(request, {
      sql: 'SELECT ${p} AS echo',
      parameters: [{ name: 'p', label: 'Echo', dataType: 'string' }],
      clientValues: { p: 'hi' },
    });
    expect(body.runs).toHaveLength(2);
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[0]?.sql).toBe('SELECT ? AS echo');
    expect(body.runs[0]?.values).toEqual(['hi']);
    expect(body.runs[1]?.ok).toBe(true);
    expect(body.runs[1]?.sql).toBe('SELECT ? AS echo OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY');
    expect(body.runs[1]?.values).toEqual(['hi']);
    expect(body.runs[0]?.label).toBe('Run 1 as written');
    expect(body.runs[1]?.label).toBe('Run 2 one page');
  });

  test('a non-admin is forbidden', async ({ request, playwright }) => {
    const username = `e2esql${Date.now()}`;
    const password = 'E2e-viewer-pass-1';
    const created = await request.post('/backend/api/users', {
      headers: ADMIN_JSON,
      data: {
        username,
        password,
        administrator: false,
        blocked: false,
        firstName: 'Sql',
        lastName: 'Viewer',
        email: `${username}@example.com`,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const user = await playwright.request.newContext({ baseURL: 'http://localhost:4300' });
    try {
      const login = await user.post('/backend/api/authenticate', {
        data: { username, password },
      });
      expect(login.ok(), await login.text()).toBeTruthy();
      const response = await user.post('/backend/api/tasks/query/test', {
        headers: { 'Content-Type': 'application/json' },
        data: { connectionId: await ensureConnection(request), sql: 'SELECT 1 AS n' },
      });
      expect(response.status()).toBe(403);
    } finally {
      await user.dispose();
    }
  });

  test('an undeclared placeholder lists the violation', async ({ request }) => {
    const response = await postRaw(request, { sql: 'SELECT ${x} AS echo', parameters: [] });
    expect(response.status()).toBe(400);
    const text = await response.text();
    expect(text).toContain('UNDECLARED');
    expect(text).toContain('x');
  });

  test('an operator system value binds as an integer', async ({ request }) => {
    const body = await postTest(request, {
      sql: 'SELECT #{TERR_ID} AS id',
      systemValues: { TERR_ID: '42' },
    });
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[0]?.values?.[0]).toBe(42);
  });

  test('a provided parameter keeps the stored value', async ({ request }) => {
    const body = await postTest(request, {
      sql: 'SELECT ${p} AS echo',
      parameters: [{ name: 'p', label: 'Echo', dataType: 'string', provided: true, value: 'stored' }],
      clientValues: { p: 'other' },
    });
    expect(body.runs[0]?.values).toEqual(['stored']);
  });

  test('a query that already pages fails the second run', async ({ request }) => {
    const body = await postTest(request, { sql: 'SELECT 1 AS n FETCH FIRST 5 ROWS ONLY' });
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[1]?.ok).toBe(false);
    expect(body.runs[1]?.error).toBeTruthy();
  });

  test('extra rows set the truncation flag', async ({ request }) => {
    const sql = process.env.SITMUN_E2E_DATASOURCE_URL
      ? 'SELECT g AS id FROM generate_series(1, 1001) AS g'
      : 'SELECT X AS id FROM SYSTEM_RANGE(1, 1001)';
    const body = await postTest(request, { sql });
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[0]?.truncated).toBe(true);
    expect(body.runs[0]?.rows).toHaveLength(1000);
  });

  test('a negative limit is rejected', async ({ request }) => {
    const response = await postRaw(request, { sql: 'SELECT 1 AS n', limit: -1 });
    expect(response.status()).toBe(400);
  });

  test('a missing connection is reported without a stack trace', async ({ request }) => {
    const response = await postRaw(request, { connectionId: -1, sql: 'SELECT 1 AS n' });
    expect([400, 404]).toContain(response.status());
    const text = await response.text();
    expect(text).not.toContain('at org.sitmun');
  });
});

type TestRun = {
  label?: string;
  sql?: string;
  values?: unknown[];
  ok?: boolean;
  rows?: unknown[];
  truncated?: boolean;
  error?: string;
};

async function postTest(
  request: APIRequestContext,
  body: Record<string, unknown>,
): Promise<{ runs: TestRun[] }> {
  const response = await postRaw(request, body);
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as { runs: TestRun[] };
}

async function postRaw(request: APIRequestContext, body: Record<string, unknown>) {
  return request.post('/backend/api/tasks/query/test', {
    headers: ADMIN_JSON,
    data: {
      connectionId: await ensureConnection(request),
      parameters: [],
      clientValues: {},
      systemValues: {},
      ...body,
    },
  });
}

async function ensureConnection(request: APIRequestContext): Promise<number> {
  const url = process.env.SITMUN_E2E_DATASOURCE_URL;
  if (!url) {
    return 90;
  }
  const username = process.env.SITMUN_E2E_DATASOURCE_USERNAME;
  const password = process.env.SITMUN_E2E_DATASOURCE_PASSWORD;
  expect(username, 'SITMUN_E2E_DATASOURCE_USERNAME').toBeTruthy();
  expect(password, 'SITMUN_E2E_DATASOURCE_PASSWORD').toBeTruthy();
  const created = await request.post('/backend/api/connections', {
    headers: ADMIN_JSON,
    data: {
      name: `e2e-pg16-${Date.now()}`,
      driver: 'org.postgresql.Driver',
      user: username,
      password,
      url,
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const createdBody = (await created.json()) as { id?: number };
  return createdBody.id as number;
}
