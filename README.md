# LocalmarketFinder 📍

A React Native iOS app for discovering local markets near you. Built with React Native 0.82.1, TypeScript, NativeWind (Tailwind CSS), and Google Maps integration.

## 🚀 Features

- **Interactive Map**: View markets on Google Maps with custom markers
- **Location Search**: Search for markets using Google Places Autocomplete
- **Market Details**: View market information, opening hours, photos, and ratings
- **Bottom Sheet UI**: Swipeable bottom sheet with market listings
- **Real-time Status**: See if markets are open now or when they'll open next

## 📋 Prerequisites

- **Node.js**: >= 20
- **Xcode**: Latest version (for iOS development)
- **CocoaPods**: For iOS dependencies
- **Ruby**: For CocoaPods (comes with macOS)
- **Google Maps API Key**: Required for maps and places functionality

## 🛠️ Tech Stack

- **React Native**: 0.82.1
- **TypeScript**: 5.8.3
- **React Navigation**: Bottom tabs + Stack navigation
- **NativeWind**: Tailwind CSS for React Native
- **React Native Maps**: Google Maps integration
- **React Native Reanimated**: For smooth animations
- **React Native Gesture Handler**: For bottom sheet gestures
- **Google Places API**: For location search and market data

## 📁 Project Structure

```
localmarketfinder/
├── app/                          # Main application code
│   ├── App.tsx                   # Root component
│   ├── assets/                   # Static assets
│   │   └── icons/               # SVG icons
│   ├── components/               # Reusable components
│   │   ├── bottomsheet/         # Bottom sheet components
│   │   ├── header/              # Header components
│   │   ├── map/                 # Map components
│   │   └── marketList/          # Market list components
│   ├── context/                 # React Context providers
│   │   └── SearchContext.tsx    # Global state management
│   ├── hook/                    # Custom hooks
│   │   └── useBottomSheet.tsx   # Bottom sheet hook
│   ├── navigation/              # Navigation configuration
│   │   └── Tabs.tsx             # Tab navigator
│   ├── screens/                 # Screen components
│   │   ├── MapScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── FeedScreen.tsx
│   │   └── MyScreen.tsx
│   └── style/                   # Global styles
│       └── global.css           # Tailwind CSS
├── ios/                         # iOS native code
│   ├── localmarketfinder/      # iOS app configuration
│   │   ├── AppDelegate.swift   # App delegate
│   │   └── Info.plist          # iOS configuration
│   ├── Podfile                 # CocoaPods dependencies
│   └── localmarketfinder.xcworkspace
├── babel.config.js             # Babel configuration
├── metro.config.js             # Metro bundler configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Node dependencies
└── .env                        # Environment variables (create this)
```

## 🔧 Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install Node dependencies
npm install

# Install CocoaPods dependencies
cd ios
bundle install
bundle exec pod install
cd ..
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Important**: Make sure your Google Maps API key has the following APIs enabled:
- Maps SDK for iOS
- Places API
- Geocoding API

### 3. iOS Configuration

The app is configured to use:
- **Minimum iOS Version**: 17.0
- **Google Maps**: Enabled via `RCT_MAPS_IOS_USE_GOOGLE_MAPS`
- **Location Permissions**: Configured in `Info.plist`

### 4. Run the App

```bash
# Start Metro bundler
npm start

# In a new terminal, run iOS app
npm run ios
```

Or open the workspace in Xcode:
```bash
open ios/localmarketfinder.xcworkspace
```

## 📱 Running on Device

1. Connect your iOS device via USB
2. Trust your computer on the device
3. Open Xcode and select your device
4. Run the app from Xcode or use:
   ```bash
   npm run ios -- --device
   ```

## 🎨 Styling

This project uses **NativeWind** (Tailwind CSS for React Native). 

### Custom Colors

Defined in `tailwind.config.js`:
- `bg`: #F1E7E7
- `primary`: #E69DB8
- `secondary`: #FFD0C7
- `tertiary`: #FFF7F3

### Usage

```tsx
<View className="bg-primary rounded-lg p-4">
  <Text className="text-white font-bold">Hello</Text>
</View>
```

## 🔑 Key Configuration Files

### `babel.config.js`
- React Native preset
- NativeWind preset
- React Native Dotenv for environment variables
- React Native Reanimated plugin

### `metro.config.js`
- SVG transformer for importing SVG files as components
- NativeWind integration
- Reanimated support

### `ios/Podfile`
- iOS 17.0 minimum
- Google Maps SDK 7.4.0
- React Native Maps with Google Maps provider

### `ios/localmarketfinder/Info.plist`
- Location permissions
- App Transport Security settings
- Bundle configuration

## 🧪 Development

### Hot Reload

The app supports Fast Refresh. Changes will automatically reflect when you save files.

### Manual Reload

- **iOS Simulator**: Press `R` key or `Cmd + R`
- **Device**: Shake device to open Dev Menu

### Debugging

- **React Native Debugger**: Use Chrome DevTools
- **Xcode Console**: View native logs
- **Flipper**: Optional debugging tool

## 📦 Dependencies

### Core
- `react`: 19.1.1
- `react-native`: 0.82.1
- `typescript`: 5.8.3

### Navigation
- `@react-navigation/native`: ^7.1.18
- `@react-navigation/bottom-tabs`: ^7.5.0
- `@react-navigation/native-stack`: ^7.5.1

### Maps & Location
- `react-native-maps`: ^1.10.3
- `react-native-google-places-autocomplete`: ^2.5.7
- `react-native-geolocation-service`: ^5.3.1

### UI & Styling
- `nativewind`: ^4.2.1
- `tailwindcss`: ^3.4.18
- `react-native-svg`: ^15.14.0
- `react-native-reanimated`: ^4.1.3
- `react-native-gesture-handler`: ^2.29.0

### Utilities
- `react-native-dotenv`: ^3.4.11
- `react-native-safe-area-context`: ^5.6.1

## 🐛 Troubleshooting

### Pod Install Issues

```bash
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install
cd ..
```

### Metro Bundler Issues

```bash
npm start -- --reset-cache
```

### Build Issues

1. Clean build folder in Xcode: `Product > Clean Build Folder` (Shift + Cmd + K)
2. Delete derived data
3. Reinstall pods

### Google Maps Not Showing

1. Verify API key is correct in `.env`
2. Check API key has Maps SDK for iOS enabled
3. Verify API key restrictions allow your bundle ID

## 📝 Notes

- This project is **iOS only** - Android support is not included
- Requires a valid Google Maps API key with billing enabled
- Location permissions are required for the app to function
- Minimum iOS version: 17.0

## 📄 License

Private project

## 👤 Author

Built with ❤️ using React Native
