/**
 * @format
 */

import {AppRegistry} from 'react-native';

import App from './App';
import {name as appName} from './app.json';
import {installGlobalHandlers} from './src/app/runtime/installGlobalHandlers';

installGlobalHandlers();

AppRegistry.registerComponent(appName, () => App);
