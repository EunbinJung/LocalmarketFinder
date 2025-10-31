/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Tabs from './navigation/Tabs';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView className="flex-1" style={{ flex: 1 }}>
        <NavigationContainer>
          <Tabs />
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
