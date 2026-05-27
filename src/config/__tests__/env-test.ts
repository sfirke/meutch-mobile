describe('runtime config', () => {
  const originalEnv = process.env;

  function loadEnvModule(): typeof import('../env') {
    let envModule: typeof import('../env') | undefined;

    jest.isolateModules(() => {
      envModule = jest.requireActual('../env');
    });

    return envModule as typeof import('../env');
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_ENV_NAME;
    delete process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_INTEGRATION_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_PRODUCTION_API_BASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('defaults to the local environment when none is provided', () => {
    const { buildApiUrl, runtimeConfig } = loadEnvModule();

    expect(runtimeConfig.environmentName).toBe('local');
    expect(buildApiUrl('/session')).toBe('http://10.0.2.2:5000/api/v1/session');
  });

  test('normalizes an explicit API base URL override', () => {
    process.env.EXPO_PUBLIC_ENV_NAME = 'integration';
    process.env.EXPO_PUBLIC_API_BASE_URL =
      'https://mobile-int-api.example.com/api/v1/';

    const { buildApiUrl, runtimeConfig } = loadEnvModule();

    expect(runtimeConfig.environmentName).toBe('integration');
    expect(runtimeConfig.apiBaseUrl).toBe(
      'https://mobile-int-api.example.com/api/v1',
    );
    expect(buildApiUrl('feed')).toBe(
      'https://mobile-int-api.example.com/api/v1/feed',
    );
  });
});
