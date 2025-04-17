import '@emotion/react';
import { Theme as MuiTheme } from '@mui/material';

declare module '@emotion/react' {
  interface Theme extends MuiTheme {}
}
