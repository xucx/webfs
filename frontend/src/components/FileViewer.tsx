import { Box, IconButton, Stack, Typography } from '@mui/material';
import { FileInfo } from '../hooks';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { AsyncImage } from 'loadable-image';
import { download, getFileTransUrl } from '../utils';
import { Fade } from 'transitions-kit';
import CancelIcon from '@mui/icons-material/Cancel';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Video } from './Video';

export const FileViewer = ({
  f,
  deActive,
  onClose,
}: {
  f: FileInfo;
  deActive?: boolean;
  onClose?: () => void;
}) => {
  return (
    <FileViewerContainer f={f} deActive={deActive} onClose={onClose}>
      <FileViewerContent f={f} deActive={deActive} />
    </FileViewerContainer>
  );
};

export const FileViewerContainer = ({
  f,
  deActive,
  onClose,
  children,
}: PropsWithChildren<{
  f: FileInfo;
  deActive?: boolean;
  onClose?: () => void;
}>) => {
  const [showInfo, setShowInfo] = useState<boolean>(true);
  const [desc, setDesc] = useState<string>('');

  useEffect(() => {
    setDesc('');
    if (deActive || !showInfo) return;
    if (f && f.descFileUrl) {
      fetch(f.descFileUrl)
        .then(res => res.text())
        .then(text => setDesc(text));
    }
  }, [deActive, showInfo]);

  return (
    <Box
      sx={{ width: '100%', height: '100%', position: 'relative' }}
      onClick={() => setShowInfo(p => !p)}
    >
      <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
        {children}
      </Box>
      {onClose && (
        <IconButton
          sx={{
            position: 'absolute',
            right: 10,
            top: 20,
            zIndex: 10,
          }}
          onClick={onClose}
        >
          <CancelIcon fontSize="small" />
        </IconButton>
      )}
      {showInfo && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            background: '#12121240',
            zIndex: 10,
          }}
        >
          {desc && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.primary',
                padding: '10px 16px',
                width: '100%',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              {desc}
            </Typography>
          )}
          <Stack
            flexDirection="row"
            justifyContent="start"
            alignItems="center"
            sx={{ paddingBottom: '10px' }}
          >
            <IconButton
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                download(f.path, f.fileName);
              }}
            >
              <FileDownloadOutlinedIcon />
            </IconButton>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export const FileViewerContent = ({
  f,
  deActive,
}: {
  f: FileInfo;
  deActive?: boolean;
}) => {
  return (
    <>
      {f.mimeType.startsWith('image/') ? (
        <ImageViewer f={f} deActive={deActive} />
      ) : f.mimeType.startsWith('video/') ? (
        <VideoViewer f={f} deActive={deActive} />
      ) : f.mimeType.startsWith('text/') ? (
        <TextViewer f={f} deActive={deActive} />
      ) : (
        <DefaultViewer f={f} />
      )}
    </>
  );
};

const ImageViewer = ({ f, deActive }: { f: FileInfo; deActive?: boolean }) => {
  return (
    <AsyncImage
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      src={getFileTransUrl(f, {
        op: 'resize',
        opts: {
          w: window.innerWidth,
          h: window.innerHeight,
        },
      })}
      Transition={Fade}
    />
  );
};

const VideoViewer = ({ f, deActive }: { f: FileInfo; deActive?: boolean }) => {
  const videoOptions = useMemo(
    () => ({
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      sources: [
        {
          src: f.url,
          type: f.mimeType,
        },
      ],
    }),
    [f.path, f.mimeType] // 依赖文件路径和类型
  );

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      {!deActive && <Video options={videoOptions} />}
    </Box>
  );
};

const TextViewer = ({ f, deActive }: { f: FileInfo; deActive?: boolean }) => {
  const [text, setText] = useState<string>('');
  useEffect(() => {
    if (deActive) return;
    try {
      fetch(f.url)
        .then(res => res.text())
        .then(text => setText(text));
    } catch (e) {
      //...
    }
  }, [f, deActive]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '23px',
        boxSizing: 'border-box',
      }}
    >
      <Typography component="pre" variant="body1" sx={{ overflow: 'auto' }}>
        {text}
      </Typography>
    </Box>
  );
};

const DefaultViewer = ({ f }: { f: FileInfo }) => {
  return (
    <Stack
      justifyContent="center"
      alignItems="center"
      sx={{ width: '100%', height: '100%' }}
    >
      <InsertDriveFileIcon fontSize="large" sx={{ marginBottom: '10px' }} />
      {!!f.name ? f.name : f.fileName}
    </Stack>
  );
};
