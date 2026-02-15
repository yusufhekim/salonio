module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@core': './src/core',
            '@domain': './src/domain',
            '@features': './src/features',
            '@infrastructure': './src/infrastructure',
            '@navigation': './src/navigation',
            '@store': './src/store',
            '@shared': './src/shared',
          },
        },
      ],
    ],
  };
};
