#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Запуск автотеста адаптивности ERP системы...\n');

// Запускаем TypeScript файл напрямую через tsx
const testPath = path.join(__dirname, '..', 'tests', 'adaptive-test.ts');
const process_exec = spawn('npx', ['tsx', testPath], {
  stdio: 'inherit',
  shell: true
});

process_exec.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Автотест завершен успешно');
  } else {
    console.log('\n❌ Автотест завершен с ошибками');
    process.exit(code);
  }
});

process_exec.on('error', (error) => {
  console.error('❌ Ошибка запуска автотеста:', error);
  process.exit(1);
});