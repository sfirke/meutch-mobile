module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    'npm run test:changed --',
  ],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
