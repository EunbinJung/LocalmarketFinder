/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './app/App';
import { name as appName } from './app.json';
import './app/style/global.css';
import 'react-native-get-random-values';

AppRegistry.registerComponent(appName, () => App);
