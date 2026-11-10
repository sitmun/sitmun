export interface UploadFailure {
  key: 'map.sessionExpired' | 'map.uploadForbidden' | 'map.uploadFailed' | 'map.uploadOffline';
  detail?: string;
}

const UNEXPECTED = /^Unexpected error:\s*/i;
const REFUSAL = /^(AccessDenied|Forbidden|Unauthorized|NotAuthorized)\b/i;

export function classifyUploadFailure(input: {
  status?: number;
  body?: unknown;
  offline: boolean;
}): UploadFailure {
  if (input.status === 401) {
    return { key: 'map.sessionExpired' };
  }
  const detail = serverDetail(input.body);
  if (input.status === 403 || (detail !== undefined && REFUSAL.test(String(input.body).replace(UNEXPECTED, '').trim()))) {
    return detail ? { key: 'map.uploadForbidden', detail } : { key: 'map.uploadForbidden' };
  }
  if (input.offline || input.status === 0) {
    return { key: 'map.uploadOffline' };
  }
  if (input.status === undefined) {
    return { key: 'map.uploadFailed' };
  }
  return detail ? { key: 'map.uploadFailed', detail } : { key: 'map.uploadFailed' };
}

function serverDetail(body: unknown): string | undefined {
  if (typeof body !== 'string') {
    return undefined;
  }
  let text = body.replace(UNEXPECTED, '').trim();
  if (!text || text === 'undefined' || text === 'null') {
    return undefined;
  }
  const code = text.match(/^([A-Za-z][\w.]*)\s*:\s*([\s\S]+)$/);
  if (code) {
    text = code[2].trim();
  }
  return text || undefined;
}
