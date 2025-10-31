import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/MapScreen';
import FeedScreen from '../screens/FeedScreen';
import MyScreen from '../screens/MyScreen';

function Tabs() {
  const Tab = createBottomTabNavigator();

  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: 'Feed', tabBarBadge: 3 }}
      />
      <Tab.Screen name="My" component={MyScreen} options={{ title: 'My' }} />
    </Tab.Navigator>
  );
}

export default Tabs;
