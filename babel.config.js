module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    'react-native-reanimated/plugin', // 반드시 마지막에 위치
  ],
};
