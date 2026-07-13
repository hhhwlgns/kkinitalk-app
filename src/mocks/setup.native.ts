import './polyfills';

import { setupServer } from 'msw/native';

import { handlers } from './handlers';

export const mockServer = setupServer(...handlers);

export async function enableMocking() {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === 'false') {
    return;
  }
  mockServer.listen({ onUnhandledRequest: 'bypass' });
}
