import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly'
      }
    },
    rules: {
      // Xeerkan wuxuu oggolaanayaa doorsoomayaasha ka bilaawda _ sida (_next ama _error)
      'no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_', 
        'varsIgnorePattern': '^_' 
      }],
      'no-undef': 'warn'
    }
  }
];