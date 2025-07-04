/**
 * 🔒 АРХИТЕКТУРНАЯ ЗАЩИТА: ESLint правила против автогенерации ошибок
 * 
 * Эти правила предотвращают нарушения архитектуры при генерации кода
 * включая запрет console.* в production коде
 */

module.exports = {
  rules: {
    // ЖЁСТКИЙ ЗАПРЕТ console.* в production коде
    "no-console": ["error", { allow: [] }],
    
    // Запрет использования any
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-any": "error",
    
    // Запрет @ts-ignore
    "@typescript-eslint/ban-ts-comment": [
      "error",
      {
        "ts-ignore": "allow-with-description",
        "ts-expect-error": "allow-with-description",
        "ts-nocheck": false,
        "ts-check": false
      }
    ],

    // Запрет прямых API строк
    "no-restricted-syntax": [
      "error",
      {
        "selector": "Literal[value=/^\\/api\\//]",
        "message": "Использовать API_ROUTES из shared/apiRoutes.ts вместо прямых строк"
      },
      {
        "selector": "TemplateLiteral > TemplateElement[value.raw=/^\\/api\\//]",
        "message": "Использовать API_ROUTES из shared/apiRoutes.ts вместо template literals"
      }
    ],

    // Запрет прямых UI импортов
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@/components/ui/*"],
            "message": "Импортировать UI компоненты из shared/ui.ts"
          },
          {
            "group": ["**/components/ui/*"],
            "message": "Импортировать UI компоненты из shared/ui.ts"
          }
        ]
      }
    ],

    // Запрет проблемных полей в TypeScript
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "property",
        "filter": {
          "regex": "^(product_id|prod_id|item_id|doc_id|supplier_id|contractor_id|product_name|prod_name|supplier_name|contractor_name)$",
          "match": false
        },
        "format": null
      }
    ],

    // Требование использования zFields в схемах
    "no-restricted-patterns": [
      "error",
      {
        "target": "**/*schema*.ts",
        "patterns": [
          {
            "pattern": "z\\.string\\(\\)\\.refine",
            "message": "Использовать централизованные поля из shared/zFields.ts вместо ручной валидации"
          },
          {
            "pattern": "z\\.number\\(\\)\\.min",
            "message": "Использовать zPrice, zQuantity из shared/zFields.ts"
          }
        ]
      }
    ]
  },

  // Кастомные правила для специфичных случаев
  overrides: [
    {
      // Строгие правила для API файлов
      files: ["**/routes/**/*.ts", "**/api/**/*.ts"],
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "prefer-const": "error",
        "no-var": "error"
      }
    },
    
    {
      // Правила для тестовых файлов
      files: ["**/*.test.ts", "**/*.spec.ts"],
      rules: {
        // В тестах можно использовать any для моков
        "@typescript-eslint/no-explicit-any": "warn",
        // В тестах можно использовать console для отладки
        "no-console": "warn"
      }
    },
    
    {
      // Исключения для конфигурационных файлов
      files: ["**/vite.ts", "**/config/**/*.ts", "**/scripts/**/*.js"],
      rules: {
        // В конфигурационных файлах можно использовать console
        "no-console": "off"
      }
    },

    {
      // Правила для схем валидации
      files: ["**/schema.ts", "**/*Schema*.ts"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            "selector": "CallExpression[callee.property.name='refine']",
            "message": "Использовать готовые поля из shared/zFields.ts вместо .refine()"
          }
        ]
      }
    },

    {
      // Правила для компонентов
      files: ["**/components/**/*.tsx", "**/pages/**/*.tsx"],
      rules: {
        "react-hooks/exhaustive-deps": "error",
        "react/prop-types": "off", // Используем TypeScript
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
      }
    }
  ]
};