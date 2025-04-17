import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouter } from './router';

const theme = createTheme({
  //   palette: {
  //     mode: 'dark',
  //   },
  colorSchemes: {
    light: true,
    dark: true,
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
