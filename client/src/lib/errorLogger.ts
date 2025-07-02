/**
 * Клиентский логгер ошибок
 * Отправляет JavaScript ошибки браузера на сервер для централизованного логирования
 */

interface ClientError {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent: string;
}

async function logClientError(error: ClientError) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error),
    });
  } catch (e) {
    // Если не можем отправить на сервер, пишем в консоль
    console.error('Failed to log error to server:', e);
  }
}

// Глобальный обработчик JavaScript ошибок
window.addEventListener('error', (event) => {
  logClientError({
    message: event.message,
    stack: event.error?.stack,
    url: event.filename || window.location.href,
    lineNumber: event.lineno,
    columnNumber: event.colno,
    userAgent: navigator.userAgent,
  });
});

// Обработчик неперехваченных Promise ошибок
window.addEventListener('unhandledrejection', (event) => {
  logClientError({
    message: `Unhandled Promise Rejection: ${event.reason}`,
    stack: event.reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
});

// Ручное логирование ошибок
export function logError(error: Error, context?: string) {
  logClientError({
    message: context ? `${context}: ${error.message}` : error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
}