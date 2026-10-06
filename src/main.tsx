import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/utilities.css';
import { App } from './app';
import { settingsStore } from './store/settings';
import { applyDisplaySettings, applyTheme, resolveTheme } from './ui/theme/theme';

// Paint the correct theme before the first frame to avoid a flash.
const initial = settingsStore.get();
applyTheme(resolveTheme(initial));
applyDisplaySettings(initial);

const root = document.getElementById('app');
if (root) render(<App />, root);
