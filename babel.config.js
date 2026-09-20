module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        // A logged response object leaks access tokens, refresh tokens, and
        // member PII into device logs and any attached crash reporter. The
        // no-console lint rule keeps them out of our own source; this strips
        // whatever survives that, including calls inside dependencies.
        plugins: ['transform-remove-console'],
      },
    },
  };
};
