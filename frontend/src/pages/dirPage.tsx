import { Box, IconButton, Stack } from '@mui/material';
import { PageContext } from './rootPage';
import { FileList } from '../components/FileList';
import { useState } from 'react';
import { FileBreadcrumbs } from '../components/FileBreadcrumbs';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { useTheme } from '@emotion/react';
import { FileInfo } from '../hooks';
import { useNavigate } from 'react-router-dom';
import { FileListViewer } from '../components/FileListViewer';

export const DirPage = ({ ctx }: { ctx: PageContext }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [manage, setManage] = useState<boolean>(false);
  const [viewIndex, setViewIndex] = useState<number>(-1);

  const handleFileClick = (fi: FileInfo, index: number) => {
    if (fi.isDir) {
      navigate('/' + fi.path);
    } else {
      if (manage || !fi.viewHidden) setViewIndex(index);
    }
  };

  const handleGoParentDir = () => {
    navigate(`/${ctx.parentPath}`);
  };

  return (
    <>
      <Box
        sx={{
          display: viewIndex > -1 ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <FileBreadcrumbs pathItems={ctx.pathItems} sx={{ padding: '16px' }} />
          <IconButton onClick={() => setManage(pre => !pre)}>
            {manage ? (
              <RemoveRedEyeOutlinedIcon
                fontSize="small"
                sx={{ fill: theme.palette.text.disabled }}
              />
            ) : (
              <FileUploadOutlinedIcon
                fontSize="small"
                sx={{ fill: theme.palette.text.disabled }}
              />
            )}
          </IconButton>
        </Stack>

        <Box
          sx={{
            width: '100%',
            flex: 1,
            height: 0,
            overflow: 'auto',
          }}
        >
          <FileList
            fileInfo={ctx.fi}
            manage={manage}
            onClick={handleFileClick}
            onRefresh={ctx.refresh}
            onGoBack={handleGoParentDir}
          />
        </Box>
      </Box>

      {viewIndex > -1 && (
        <Box sx={{ height: '100%', width: '100%', zIndex: 100 }}>
          <FileListViewer
            manage={manage}
            list={ctx.fi.files}
            index={viewIndex}
            onClose={() => setViewIndex(-1)}
          />
        </Box>
      )}
    </>
  );
};
