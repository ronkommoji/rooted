module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Use react-native-worklets plugin for Reanimated 4.x
      'react-native-worklets/plugin',
    ],
  };
};
