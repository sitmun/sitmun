import { expect, test, type APIRequestContext } from '@playwright/test';

import { APP_ID, ROLE_ID, TERRITORY_ID, readViewerCredentials } from './fixtures';

const ADMIN_HEADERS = {
  'X-SITMUN-Client': 'admin',
  'Content-Type': 'application/json',
};

test.describe('SQL query binding', () => {
  test('an undeclared key is rejected', async ({ playwright }) => {
    const admin = await playwright.request.newContext({ baseURL: 'http://localhost:4400' });
    const viewer = await playwright.request.newContext({ baseURL: 'http://localhost:4400' });
    try {
      await loginAdmin(admin);
      const taskId = await createSqlTask(admin, 'SELECT 1 AS n', []);
      const token = await proxyToken(viewer);
      const response = await viewer.get(proxyUrl(taskId, { id: '1 OR 1=1 --' }), {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(400);
    } finally {
      await admin.dispose();
      await viewer.dispose();
    }
  });

  test('territory id, a quoted user, provided and optional values, and the row cap', async ({ playwright }) => {
    const admin = await playwright.request.newContext({ baseURL: 'http://localhost:4400' });
    const viewer = await playwright.request.newContext({ baseURL: 'http://localhost:4400' });
    try {
      await loginAdmin(admin);
      const token = await proxyToken(viewer);
      const territory = await admin.get(`/backend/api/territories/${TERRITORY_ID}`, {
        headers: { 'X-SITMUN-Client': 'admin' },
      });
      expect(territory.ok()).toBeTruthy();
      const code = String(((await territory.json()) as { code?: string }).code);

      const territoryTask = await createSqlTask(admin, 'SELECT #{TERR_ID} AS id', []);
      const territoryRows = await sql(viewer, token, territoryTask);
      expect(territoryRows, JSON.stringify(territoryRows)).toHaveLength(1);
      expect(String(column(territoryRows[0], 'id'))).toBe(String(TERRITORY_ID));

      const quoteUser = await createQuotedUser(admin);
      const quoteToken = await loginProxy(viewer, quoteUser.username, quoteUser.password);
      const nameTask = await createSqlTask(admin, 'SELECT #{USER_NAME} AS name', []);
      const nameRows = await sql(viewer, quoteToken, nameTask);
      expect(column(nameRows[0], 'name')).toBe(quoteUser.username);

      const matched = await createSqlTask(admin, `SELECT 1 AS hit WHERE '${code}' IN (#{MUN_INES})`, []);
      expect(await sql(viewer, token, matched)).toHaveLength(1);
      const unmatched = await createSqlTask(admin, "SELECT 1 AS hit WHERE '___none___' IN (#{MUN_INES})", []);
      expect(await sql(viewer, token, unmatched)).toEqual([]);

      const provided = await createSqlTask(admin, 'SELECT ${p} AS echo', [
        { name: 'p', label: 'Echo', dataType: 'string', provided: true, value: 'stored' },
      ]);
      const providedRows = await sql(viewer, token, provided, { p: 'other' });
      expect(column(providedRows[0], 'echo')).toBe('stored');

      const missing = await createSqlTask(admin, 'SELECT ${p} AS echo', [
        { name: 'p', label: 'Echo', dataType: 'string' },
      ]);
      const missingResponse = await viewer.get(proxyUrl(missing, {}), {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(missingResponse.status()).toBe(400);
      const optional = await createSqlTask(admin, 'SELECT ${p} AS echo', [
        { name: 'p', label: 'Echo', dataType: 'string', optional: true },
      ]);
      expect((await viewer.get(proxyUrl(optional, {}), { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(200);

      const wide = await createSqlTask(admin, 'SELECT X AS id FROM SYSTEM_RANGE(1, 1001)', []);
      const wideResponse = await viewer.get(proxyUrl(wide, {}), {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(wideResponse.ok()).toBeTruthy();
      expect((await wideResponse.json()) as unknown[]).toHaveLength(1000);
      expect(wideResponse.headers()['x-sitmun-truncated']).toBe('true');

      const page = await viewer.get(proxyUrl(wide, { limit: '5', offset: '10' }), {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(((await page.json()) as unknown[]).length).toBeLessThanOrEqual(5);
      const negative = await viewer.get(proxyUrl(wide, { limit: '-1' }), {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(negative.status()).toBe(400);
    } finally {
      await admin.dispose();
      await viewer.dispose();
    }
  });
});

async function sql(
  viewer: APIRequestContext,
  token: string,
  taskId: number,
  params: Record<string, string> = {},
): Promise<Array<Record<string, unknown>>> {
  const response = await viewer.get(proxyUrl(taskId, params), {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as Array<Record<string, unknown>>;
}

function column(row: Record<string, unknown> | undefined, name: string): unknown {
  if (!row) {
    return undefined;
  }
  const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === name);
  return key ? row[key] : undefined;
}

function proxyUrl(taskId: number, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `/middleware/proxy/${APP_ID}/${TERRITORY_ID}/SQL/${taskId}${query ? `?${query}` : ''}`;
}

async function createSqlTask(
  admin: APIRequestContext,
  command: string,
  parameters: Array<Record<string, unknown>>,
): Promise<number> {
  const created = await admin.post('/backend/api/tasks', {
    headers: ADMIN_HEADERS,
    data: {
      name: `e2e-sql-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      properties: {
        scope: 'sql-query',
        command,
        parameters,
      },
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const body = (await created.json()) as { id?: number; _links?: { self?: { href?: string } } };
  const id = body.id ?? Number(body._links?.self?.href?.match(/\/tasks\/(\d+)/)?.[1]);
  expect(id).toBeTruthy();
  const typePut = await admin.put(`/backend/api/tasks/${id}/type`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: 'http://localhost/api/task-types/5',
  });
  expect(typePut.ok() || typePut.status() === 204, await typePut.text()).toBeTruthy();
  const connectionPut = await admin.put(`/backend/api/tasks/${id}/connection`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: 'http://localhost/api/connections/90',
  });
  expect(connectionPut.ok() || connectionPut.status() === 204, await connectionPut.text()).toBeTruthy();
  const properties = await admin.patch(`/backend/api/tasks/${id}`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'application/merge-patch+json' },
    data: { properties: { scope: 'sql-query', command, parameters } },
  });
  expect(properties.ok(), await properties.text()).toBeTruthy();
  await grant(admin, id);
  return id;
}

async function grant(admin: APIRequestContext, taskId: number): Promise<void> {
  const availability = await admin.post('/backend/api/task-availabilities', {
    headers: ADMIN_HEADERS,
    data: {
      task: `http://localhost/api/tasks/${taskId}`,
      territory: `http://localhost/api/territories/${TERRITORY_ID}`,
    },
  });
  expect([201, 409].includes(availability.status()), await availability.text()).toBeTruthy();
  const roles = await admin.put(`/backend/api/tasks/${taskId}/roles`, {
    headers: { 'X-SITMUN-Client': 'admin', 'Content-Type': 'text/uri-list' },
    data: `http://localhost/api/roles/${ROLE_ID}`,
  });
  expect(roles.ok() || roles.status() === 204, await roles.text()).toBeTruthy();
}

async function createQuotedUser(admin: APIRequestContext): Promise<{ username: string; password: string }> {
  const username = `o'brien-${Date.now()}`;
  const password = 'E2e-viewer-pass-1';
  const created = await admin.post('/backend/api/users', {
    headers: ADMIN_HEADERS,
    data: {
      username,
      password,
      administrator: false,
      blocked: false,
      firstName: "O'Brien",
      lastName: 'Viewer',
      email: `e2e-quote-${Date.now()}@example.com`,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const body = (await created.json()) as { id?: number; _links?: { self?: { href?: string } } };
  const userId = body.id ?? Number(body._links?.self?.href?.match(/\/users\/(\d+)/)?.[1]);
  const origin = new URL(body._links?.self?.href ?? `http://localhost/api/users/${userId}`).origin;
  const config = await admin.post('/backend/api/user-configurations', {
    headers: ADMIN_HEADERS,
    data: {
      user: `${origin}/api/users/${userId}`,
      territory: `${origin}/api/territories/${TERRITORY_ID}`,
      role: `${origin}/api/roles/${ROLE_ID}`,
      appliesToChildrenTerritories: false,
    },
  });
  expect(config.status(), await config.text()).toBe(201);
  return { username, password };
}

async function loginAdmin(admin: APIRequestContext): Promise<void> {
  const login = await admin.post('/backend/api/authenticate/admin', {
    data: { username: 'admin', password: 'admin' },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
}

async function proxyToken(viewer: APIRequestContext): Promise<string> {
  const credentials = await readViewerCredentials();
  return loginProxy(viewer, credentials.username, credentials.password);
}

async function loginProxy(viewer: APIRequestContext, username: string, password: string): Promise<string> {
  const login = await viewer.post('/backend/api/authenticate', { data: { username, password } });
  expect(login.ok(), await login.text()).toBeTruthy();
  const proxy = await viewer.post('/backend/api/authenticate/proxy');
  expect(proxy.ok(), await proxy.text()).toBeTruthy();
  const body = (await proxy.json()) as { proxy_token?: string };
  expect(body.proxy_token).toBeTruthy();
  return body.proxy_token as string;
}
