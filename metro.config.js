/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

const svgTransformer = require('react-native-svg-transformer');

const defaultConfig = getDefaultConfig(__dirname);

// 👉 NativeWind와 Reanimated 모두 적용
const combinedConfig = mergeConfig(defaultConfig, {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
});

// ⚡ 순서 중요! Reanimated로 감싸고 → NativeWind 적용
module.exports = withNativeWind(wrapWithReanimatedMetroConfig(combinedConfig), {
  input: './app/style/global.css', // Tailwind CSS 파일 경로
});
