import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RootPage } from './pages/rootPage';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<RootPage />} />
      </Routes>
    </BrowserRouter>
  );
};
