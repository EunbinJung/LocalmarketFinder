import { StyleSheet, Text, View } from 'react-native';

function AppLoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Text className="text-white font-bold" style={styles.title}>Local</Text>
      <Text className="text-white font-bold" style={styles.title}>Market</Text>
      <Text className="text-white font-bold" style={styles.title}>Finder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 48, lineHeight: 56 },
});

export default AppLoadingScreen;
