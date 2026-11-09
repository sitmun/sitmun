import { expect, test, type APIRequestContext, type CreatedResource } from '../fixtures';

const ADMIN_JSON = {
  'X-SITMUN-Client': 'admin',
  'Content-Type': 'application/json',
};

test.describe('SQL query test API', () => {
  test('both runs bind the client value', async ({ request, createdResources }) => {
    const body = await postTest(request, createdResources, {
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

  test('SQL in the request is ignored and the saved command runs', async ({ request, createdResources }) => {
    const taskId = await savedTask(request, createdResources, 'SELECT 1 AS n', []);
    const response = await request.post('/backend/api/tasks/query/test', {
      headers: ADMIN_JSON,
      data: { taskId, sql: 'SELECT 2 AS n', connectionId: -1 },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    const body = (await response.json()) as { runs: TestRun[] };
    expect(body.runs[0]?.sql).toBe('SELECT 1 AS n');
    expect(body.runs[0]?.ok).toBe(true);
  });

  test('a non-admin is forbidden', async ({ request, playwright, createdResources }) => {
    const taskId = await savedTask(request, createdResources, 'SELECT 1 AS n', []);
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
        data: { taskId },
      });
      expect(response.status()).toBe(403);
    } finally {
      await user.dispose();
    }
  });

  test('an operator system value binds as an integer', async ({ request, createdResources }) => {
    const body = await postTest(request, createdResources, {
      sql: 'SELECT #{TERR_ID} AS id',
      systemValues: { TERR_ID: '42' },
    });
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[0]?.values?.[0]).toBe(42);
  });

  test('a provided parameter keeps the stored value', async ({ request, createdResources }) => {
    const body = await postTest(request, createdResources, {
      sql: 'SELECT ${p} AS echo',
      parameters: [{ name: 'p', label: 'Echo', dataType: 'string', provided: true, value: 'stored' }],
      clientValues: { p: 'other' },
    });
    expect(body.runs[0]?.values).toEqual(['stored']);
  });

  test('a query that already pages fails the second run', async ({ request, createdResources }) => {
    const body = await postTest(request, createdResources, { sql: 'SELECT 1 AS n FETCH FIRST 5 ROWS ONLY' });
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[1]?.ok).toBe(false);
    expect(body.runs[1]?.error).toBeTruthy();
  });

  test('extra rows set the truncation flag', async ({ request, createdResources }) => {
    const sql = process.env.SITMUN_E2E_DATASOURCE_URL
      ? 'SELECT g AS id FROM generate_series(1, 1001) AS g'
      : 'SELECT X AS id FROM SYSTEM_RANGE(1, 1001)';
    const body = await postTest(request, createdResources, { sql });
    expect(body.runs[0]?.ok).toBe(true);
    expect(body.runs[0]?.truncated).toBe(true);
    expect(body.runs[0]?.rows).toHaveLength(1000);
  });

  test('a negative limit is rejected', async ({ request, createdResources }) => {
    const taskId = await savedTask(request, createdResources, 'SELECT 1 AS n', []);
    const response = await request.post('/backend/api/tasks/query/test', {
      headers: ADMIN_JSON,
      data: { taskId, limit: -1 },
    });
    expect(response.status()).toBe(400);
  });

  test('a missing task is reported without a stack trace', async ({ request }) => {
    const response = await request.post('/backend/api/tasks/query/test', {
      headers: ADMIN_JSON,
      data: { taskId: -1 },
    });
    expect(response.status()).toBe(404);
    const text = await response.text();
    expect(text).toContain('Task not found');
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
  createdResources: CreatedResource[],
  body: {
    sql: string;
    parameters?: Array<Record<string, unknown>>;
    clientValues?: Record<string, string>;
    systemValues?: Record<string, string>;
  },
): Promise<{ runs: TestRun[] }> {
  const taskId = await savedTask(request, createdResources, body.sql, body.parameters ?? []);
  const response = await request.post('/backend/api/tasks/query/test', {
    headers: ADMIN_JSON,
    data: {
      taskId,
      clientValues: body.clientValues ?? {},
      systemValues: body.systemValues ?? {},
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as { runs: TestRun[] };
}

async function savedTask(
  request: APIRequestContext,
  createdResources: CreatedResource[],
  command: string,
  parameters: Array<Record<string, unknown>>,
): Promise<number> {
  const created = await request.post('/backend/api/tasks', {
    headers: ADMIN_JSON,
    data: { name: `e2e-sql-test-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = ((await created.json()) as { id?: number }).id as number;
  createdResources.push({ collection: 'tasks', id });

  const typePut = await request.put(`/backend/api/tasks/${id}/type`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: 'http://localhost/api/task-types/5',
  });
  expect(typePut.ok(), await typePut.text()).toBeTruthy();
  const connectionPut = await request.put(`/backend/api/tasks/${id}/connection`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: `http://localhost/api/connections/${await ensureConnection(request)}`,
  });
  expect(connectionPut.ok(), await connectionPut.text()).toBeTruthy();
  const saved = await request.patch(`/backend/api/tasks/${id}`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'application/merge-patch+json' },
    data: { properties: { scope: 'sql-query', command, parameters } },
  });
  expect(saved.ok(), await saved.text()).toBeTruthy();
  return id;
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
