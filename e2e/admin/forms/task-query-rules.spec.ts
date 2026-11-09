import { expect, test, type APIRequestContext, type CreatedResource } from '../fixtures';

const ADMIN_JSON = {
  'X-SITMUN-Client': 'admin',
  'Content-Type': 'application/json',
};

test.describe('SQL query task save rules', () => {
  test('a valid task is saved and required is derived', async ({ request, createdResources }) => {
    const id = await createQueryTask(request, createdResources);
    const saved = await saveSql(request, id, 'SELECT ${p} AS echo', [
      { name: 'p', label: 'Echo', dataType: 'string' },
    ]);
    expect(saved.ok(), await saved.text()).toBeTruthy();
    const read = await request.get(`/backend/api/tasks/${id}`, {
      headers: { 'X-SITMUN-Client': 'admin' },
    });
    expect(read.ok(), await read.text()).toBeTruthy();
    const body = (await read.json()) as {
      properties?: { parameters?: Array<{ required?: boolean }> };
    };
    expect(body.properties?.parameters?.[0]?.required).toBe(true);
  });

  test('a name-part placeholder is rejected', async ({ request, createdResources }) => {
    const id = await createQueryTask(request, createdResources);
    const saved = await saveSql(request, id, 'SELECT * FROM parcels_${x}', []);
    expect(saved.status()).toBe(400);
    expect(await saved.text()).toContain('x');
  });

  test('a partial literal is rejected', async ({ request, createdResources }) => {
    const id = await createQueryTask(request, createdResources);
    const saved = await saveSql(request, id, "SELECT * FROM t WHERE a = 'x${p}'", []);
    expect(saved.status()).toBe(400);
    expect(await saved.text()).toContain('PARTIAL_LITERAL');
  });

  test('an undeclared placeholder and an unused parameter are rejected', async ({
    request,
    createdResources,
  }) => {
    const id = await createQueryTask(request, createdResources);
    const undeclared = await saveSql(request, id, 'SELECT ${x} AS echo', []);
    expect(undeclared.status()).toBe(400);
    expect(await undeclared.text()).toContain('UNDECLARED');

    const unused = await saveSql(request, id, 'SELECT 1 AS n', [
      { name: 'extra', label: 'Extra', dataType: 'string' },
    ]);
    expect(unused.status()).toBe(400);
    expect(await unused.text()).toContain('UNUSED');
  });

  test('MUN_INES outside IN is rejected', async ({ request, createdResources }) => {
    const id = await createQueryTask(request, createdResources);
    const saved = await saveSql(request, id, 'SELECT * FROM t WHERE m = #{MUN_INES}', []);
    expect(saved.status()).toBe(400);
    expect(await saved.text()).toContain('LIST_OUTSIDE_IN');
  });

  test('WITH, a semicolon and a trailing comment are rejected', async ({
    request,
    createdResources,
  }) => {
    const id = await createQueryTask(request, createdResources);
    for (const sql of [
      'WITH cte AS (SELECT 1 AS n) SELECT * FROM cte',
      'SELECT 1 AS n; SELECT 2 AS n',
      'SELECT 1 AS n -- tail',
    ]) {
      const saved = await saveSql(request, id, sql, []);
      expect(saved.status(), sql).toBe(400);
    }
  });

  test('reserved, system and invalid parameter names are rejected', async ({
    request,
    createdResources,
  }) => {
    const id = await createQueryTask(request, createdResources);
    for (const name of ['limit', 'TERR_ID', 'a b']) {
      const saved = await saveSql(request, id, 'SELECT 1 AS n', [
        { name, label: name, dataType: 'string' },
      ]);
      expect(saved.status(), name).toBe(400);
    }
  });

  test('a blank provided value, a system expression and optional with a value are rejected', async ({
    request,
    createdResources,
  }) => {
    const id = await createQueryTask(request, createdResources);
    const cases = [
      { name: 'p', label: 'Echo', dataType: 'string', provided: true, value: '  ' },
      { name: 'p', label: 'Echo', dataType: 'string', value: 'id = #{TERR_ID}' },
      { name: 'p', label: 'Echo', dataType: 'string', optional: true, value: 'kept' },
    ];
    for (const parameter of cases) {
      const saved = await saveSql(request, id, 'SELECT ${p} AS echo', [parameter]);
      expect(saved.status(), JSON.stringify(parameter)).toBe(400);
    }
  });
});

async function createQueryTask(
  request: APIRequestContext,
  createdResources: CreatedResource[],
): Promise<number> {
  const created = await request.post('/backend/api/tasks', {
    headers: ADMIN_JSON,
    data: { name: `e2e-sql-rules-${Date.now()}-${Math.floor(Math.random() * 1000)}` },
  });
  expect(created.status(), await created.text()).toBe(201);
  const body = (await created.json()) as { id?: number };
  const id = body.id as number;
  createdResources.push({ collection: 'tasks', id });

  const typePut = await request.put(`/backend/api/tasks/${id}/type`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: 'http://localhost/api/task-types/5',
  });
  expect(typePut.ok() || typePut.status() === 204, await typePut.text()).toBeTruthy();

  const connection = await ensureConnection(request);
  const connectionPut = await request.put(`/backend/api/tasks/${id}/connection`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: `http://localhost/api/connections/${connection}`,
  });
  expect(connectionPut.ok() || connectionPut.status() === 204, await connectionPut.text()).toBeTruthy();
  return id;
}

async function saveSql(
  request: APIRequestContext,
  id: number,
  command: string,
  parameters: Array<Record<string, unknown>>,
) {
  return request.patch(`/backend/api/tasks/${id}`, {
    headers: {
      'X-SITMUN-Client': 'admin',
      'Content-Type': 'application/merge-patch+json',
    },
    data: { properties: { scope: 'sql-query', command, parameters } },
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
  const body = (await created.json()) as { id?: number };
  return body.id as number;
}
