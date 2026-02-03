import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from '../screens/MapScreen';
import FeedScreen from '../screens/FeedScreen';
import MyScreen from '../screens/MyScreen';
import SearchScreen from '../screens/SearchScreen';
import { useSearch } from '../context/SearchContext';

import MapIcon from '../assets/icons/map.svg';
import FeedIcon from '../assets/icons/feed.svg';
import MyIcon from '../assets/icons/profile.svg';

function Tabs() {
  const { savedMarketIds } = useSearch();
  const savedCount = savedMarketIds.length;

  const Tab = createBottomTabNavigator();
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => (
          <Tab.Navigator
            initialRouteName="Map"
            screenOptions={{
              headerShown: false,
              tabBarHideOnKeyboard: true,
            }}
          >
            <Tab.Screen
              name="Map"
              component={MapScreen}
              options={{
                title: 'Map',
                tabBarActiveTintColor: '#E69DB8',
                tabBarInactiveTintColor: 'gray',
                tabBarIcon: ({ size }) => (
                  <MapIcon width={size} height={size} />
                ),
              }}
            />
            <Tab.Screen
              name="Feed"
              component={FeedScreen}
              options={{
                title: 'Alerts',
                tabBarBadge: savedCount > 0 ? savedCount : undefined,
                tabBarActiveTintColor: '#E69DB8',
                tabBarInactiveTintColor: 'gray',
                tabBarIcon: ({ size }) => (
                  <FeedIcon width={size} height={size} />
                ),
              }}
            />
            <Tab.Screen
              name="My"
              component={MyScreen}
              options={{
                title: 'My',
                tabBarActiveTintColor: '#E69DB8',
                tabBarInactiveTintColor: 'gray',
                tabBarIcon: ({ size }) => <MyIcon width={size} height={size} />,
              }}
            />
          </Tab.Navigator>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
}

export default Tabs;
