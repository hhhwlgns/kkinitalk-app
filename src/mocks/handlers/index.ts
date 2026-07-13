import { http, HttpResponse } from 'msw';

export const pingHandler = http.get('*/api/v1/_ping', () => {
  return HttpResponse.json({ ok: true, source: 'msw-native' });
});

export const handlers = [pingHandler];
