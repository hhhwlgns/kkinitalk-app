import { enableMocking, mockServer } from '../src/mocks/setup.native';
import { apiClient } from '../src/api/client';

async function main() {
  await enableMocking();

  const response = await apiClient.get('/_ping', { adapter: 'fetch' });

  const body = response.data;
  if (body?.ok !== true || body?.source !== 'msw-native') {
    console.error('SMOKE TEST FAILED: unexpected response body', body);
    process.exitCode = 1;
    return;
  }

  console.log('SMOKE TEST PASSED: GET /api/v1/_ping ->', JSON.stringify(body));
  mockServer.close();
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exitCode = 1;
});
