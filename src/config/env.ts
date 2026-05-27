const environmentNames = ['local', 'integration', 'production'] as const;

export type EnvironmentName = (typeof environmentNames)[number];

type RuntimeConfig = {
  environmentName: EnvironmentName;
  apiBaseUrl: string;
};

const defaultApiBaseUrls: Record<EnvironmentName, string> = {
  local:
    process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL?.trim() ||
    'http://10.0.2.2:5000/api/v1',
  integration:
    process.env.EXPO_PUBLIC_INTEGRATION_API_BASE_URL?.trim() ||
    'https://mobile-int-api.meutch.com/api/v1',
  production:
    process.env.EXPO_PUBLIC_PRODUCTION_API_BASE_URL?.trim() ||
    'https://meutch.com/api/v1',
};

function isEnvironmentName(
  value: string | undefined,
): value is EnvironmentName {
  return environmentNames.includes(value as EnvironmentName);
}

function resolveEnvironmentName(): EnvironmentName {
  const candidate = process.env.EXPO_PUBLIC_ENV_NAME?.trim();

  if (isEnvironmentName(candidate)) {
    return candidate;
  }

  return 'local';
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const environmentName = resolveEnvironmentName();
const apiBaseUrlOverride = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const runtimeConfig: RuntimeConfig = {
  environmentName,
  apiBaseUrl: trimTrailingSlash(
    apiBaseUrlOverride || defaultApiBaseUrls[environmentName],
  ),
};

export const environmentOptions = environmentNames.map((name) => ({
  name,
  apiBaseUrl: trimTrailingSlash(defaultApiBaseUrls[name]),
}));

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${runtimeConfig.apiBaseUrl}${normalizedPath}`;
}
