import { Box } from '@mui/material';
import { PageContext } from './rootPage';
import { FileViewer } from '../components/FileViewer';
import { useNavigate } from 'react-router-dom';

export const FilePage = ({ ctx }: { ctx: PageContext }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <FileViewer f={ctx.fi} onClose={() => navigate(ctx.parentPath)} />
    </Box>
  );
};
