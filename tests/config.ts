/**
 * Конфигурация для интеграционного тестирования
 */

export interface TestConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

export const testConfig: TestConfig = {
  baseUrl: process.env.TEST_API_URL || 'http://localhost:5000/api',
  timeout: parseInt(process.env.TEST_TIMEOUT || '5000'),
  retryAttempts: parseInt(process.env.TEST_RETRY_ATTEMPTS || '3'),
  logLevel: (process.env.TEST_LOG_LEVEL as TestConfig['logLevel']) || 'INFO',
};

export default testConfig;