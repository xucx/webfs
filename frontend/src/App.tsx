import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouter } from './router';
import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';

export const welcom$ = atom<boolean>(true);
export const theme$ = atom<string>('system');

function App() {
  const theme = useAtomValue(theme$);
  const themeData = useMemo(() => {
    return theme === 'dark' || theme === 'light'
      ? createTheme({ palette: { mode: theme } })
      : createTheme({
          colorSchemes: {
            light: true,
            dark: true,
          },
        });
  }, [theme]);

  return (
    <ThemeProvider theme={themeData}>
      <CssBaseline />
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
