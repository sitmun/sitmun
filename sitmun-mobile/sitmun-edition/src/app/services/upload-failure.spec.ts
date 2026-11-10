import { classifyUploadFailure } from './upload-failure';

describe('classifyUploadFailure', () => {
  it('treats an expired session as a session message', () => {
    expect(classifyUploadFailure({ status: 401, body: 'Unexpected error: expired', offline: false })).toEqual({
      key: 'map.sessionExpired',
    });
  });

  it('says the user is not allowed and keeps the server text as a detail', () => {
    expect(
      classifyUploadFailure({
        status: 403,
        body: 'Unexpected error: AccessDenied:not allowed',
        offline: false,
      })
    ).toEqual({ key: 'map.uploadForbidden', detail: 'not allowed' });
  });

  it('uses a neutral sentence when the server did not say why', () => {
    expect(classifyUploadFailure({ status: 500, body: 'Unexpected error: ', offline: false })).toEqual({
      key: 'map.uploadFailed',
    });
  });

  it('keeps a refusal code that arrived as a normal error', () => {
    expect(
      classifyUploadFailure({ status: 400, body: 'Forbidden:layer locked', offline: false })
    ).toEqual({ key: 'map.uploadForbidden', detail: 'layer locked' });
  });

  it('says the changes stay on the device when there is no connection', () => {
    expect(classifyUploadFailure({ offline: true })).toEqual({ key: 'map.uploadOffline' });
    expect(classifyUploadFailure({ status: 0, body: 'Unexpected error: undefined', offline: false })).toEqual({
      key: 'map.uploadOffline',
    });
  });

  it('does not call a thrown error offline while the device is online', () => {
    expect(classifyUploadFailure({ offline: false })).toEqual({ key: 'map.uploadFailed' });
  });
});
