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
import { SearchProvider } from './context/SearchContext';
import { SnackbarProvider } from './context/SnackbarContext';

function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView className="flex-1" style={{ flex: 1 }}>
        <SearchProvider>
          <SnackbarProvider>
            <NavigationContainer>
              <Tabs />
            </NavigationContainer>
          </SnackbarProvider>
        </SearchProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
