import {
  Box,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Grid,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  MenuItem,
  MenuList,
  Stack,
  Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import InsertPhotoOutlinedIcon from '@mui/icons-material/InsertPhotoOutlined';
import HomeIcon from '@mui/icons-material/Home';
import {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { FileInfo } from '../hooks';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import TextFieldsOutlinedIcon from '@mui/icons-material/TextFieldsOutlined';
import { useTheme } from '@emotion/react';
import { Fade } from 'transitions-kit';
import { AsyncImage } from 'loadable-image';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { download, getFileTransUrl } from '../utils';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { apis } from '../api';
import { FileUploadDlg } from './FileUpload';

const getFileIcon = (fi: any) => {
  if (fi.isDir) {
    return <FolderIcon />;
  }
  if (fi.mimeType.startsWith('image/')) {
    return <InsertPhotoOutlinedIcon />;
  }
  if (fi.mimeType.startsWith('video/')) {
    return <VideocamOutlinedIcon />;
  }
  if (fi.mimeType.startsWith('text/')) {
    return <TextFieldsOutlinedIcon />;
  }

  return <InsertDriveFileIcon />;
};

export const FileList = ({
  fileInfo,
  manage,
  onClick,
  onRefresh,
  onGoBack,
}: {
  fileInfo: FileInfo;
  manage?: boolean;
  onClick?: (f: FileInfo, index: number) => void;
  onRefresh?: () => void;
  onGoBack?: () => void;
}) => {
  const theme = useTheme();

  const [dirDesc, setDirDesc] = useState<string>('');
  useEffect(() => {
    if (!manage && fileInfo && fileInfo.descFileUrl) {
      fetch(fileInfo.descFileUrl)
        .then(res => res.text())
        .then(text => setDirDesc(text));
    }
  }, [fileInfo]);
  const [openUpload, setOpenUpload] = useState<boolean>(false);

  const handleFileClick = (f: FileInfo, index: number) => {
    if (onClick) onClick(f, f.isDir ? index : index - fileInfo.dirs.length);
  };

  const handleDownload = (f: FileInfo) => {
    if (f.isDir) return;
    download(f.path, f.fileName);
  };

  const handleDelete = (f: FileInfo) => {
    if (window.confirm(`确认删除"${f.fileName}"吗？`)) {
      apis.fsDel(f.path);
      if (onRefresh) onRefresh();
    }
  };

  const handleCreateDir = () => {
    let dir = window.prompt(`输入新建文件夹名称,当前目录为：${fileInfo.path}`);
    if (!!dir) {
      apis.fsCreate(`${fileInfo.path}/${dir.trim()}`);
      if (onRefresh) onRefresh();
    }
  };

  const handleGoBack = () => {
    if (onGoBack) onGoBack();
  };

  return (
    <Stack>
      {manage && (
        <Stack
          direction="row"
          alignContent="center"
          sx={{ padding: '10px 16px' }}
        >
          <ButtonGroup variant="outlined">
            <Button size="small" onClick={handleGoBack}>
              返回
            </Button>
            <Button size="small" onClick={() => setOpenUpload(true)}>
              上传文件
            </Button>
            <Button size="small" onClick={handleCreateDir}>
              新建文件夹
            </Button>
          </ButtonGroup>
        </Stack>
      )}
      {!manage && dirDesc && (
        <Typography
          sx={{
            margin: '10px 16px 0 16px;',
            color: theme.palette.primary.main,
          }}
          component="pre"
        >
          {dirDesc}
        </Typography>
      )}
      <Box
        sx={{
          padding: '10px 16px',
        }}
      >
        <MenuList>
          {[...fileInfo.dirs, ...(manage ? fileInfo.files : [])].map(
            (f: FileInfo, index: number) =>
              manage || !f.viewHidden ? (
                <MenuItem
                  key={f.path}
                  onClick={() => handleFileClick(f, index)}
                >
                  <ListItemIcon>{getFileIcon(f)}</ListItemIcon>
                  <ListItemText
                    sx={{
                      span: {
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-all',
                      },
                    }}
                  >
                    {manage ? f.fileName : f.name}
                  </ListItemText>

                  <Stack
                    direction="row"
                    justifyContent="end"
                    alignItems="center"
                  >
                    {manage && (
                      <>
                        {!f.isDir && (
                          <IconButton
                            onClick={e => {
                              e.stopPropagation();
                              handleDownload(f);
                            }}
                          >
                            <FileDownloadOutlinedIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(f);
                          }}
                        >
                          <DeleteOutlinedIcon fontSize="small" color="error" />
                        </IconButton>
                      </>
                    )}

                    {!manage && f.isDir && (
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary' }}
                      >
                        {'>'}
                      </Typography>
                    )}
                  </Stack>
                </MenuItem>
              ) : null
          )}
        </MenuList>

        {!manage && (
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            columns={{ xs: 4, sm: 8, md: 12, lg: 16 }}
            pt={2}
          >
            {fileInfo.files.map((f, index) =>
              f.viewHidden ? null : (
                <Grid
                  key={f.path}
                  id={`grid-item-${index}`}
                  size={{ xs: 2, sm: 4, md: 4, lg: 4, xl: 2 }}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '5px',
                    aspectRatio: 1,
                  }}
                  onClick={() => onClick && onClick(f, index)}
                >
                  {f.mimeType.startsWith('image/') ? (
                    <ListItem
                      containerId={`grid-item-${index}`}
                      onImgUrl={(w: number, h: number) =>
                        getFileTransUrl(f, { op: 'thumbnail', opts: { w, h } })
                      }
                    />
                  ) : f.mimeType.startsWith('video/') ? (
                    <ListItem
                      containerId={`grid-item-${index}`}
                      icon={<PlayArrowIcon fontSize="large" />}
                      text="视频"
                      onImgUrl={(w: number, h: number) =>
                        getFileTransUrl(f, [
                          { op: 'snapshot', opts: { w, h } },
                          { op: 'thumbnail', opts: { w, h } },
                        ])
                      }
                    />
                  ) : f.mimeType.startsWith('text/') ? (
                    <ListItem
                      containerId={`grid-item-${index}`}
                      icon={
                        <BorderColorIcon
                          fontSize="large"
                          sx={{ marginBottom: '5px' }}
                        />
                      }
                      text={!!f.name ? f.name : f.fileName}
                    />
                  ) : (
                    <ListItem
                      containerId={`grid-item-${index}`}
                      icon={
                        <InsertDriveFileIcon
                          fontSize="large"
                          sx={{ marginBottom: '5px' }}
                        />
                      }
                      text={!!f.name ? f.name : f.fileName}
                    />
                  )}
                </Grid>
              )
            )}
          </Grid>
        )}
      </Box>
      {openUpload && (
        <FileUploadDlg
          dir={fileInfo.path}
          open={openUpload}
          onClose={() => {
            setOpenUpload(false);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </Stack>
  );
};

const ListItem = ({
  containerId,
  onImgUrl,
  icon,
  text,
}: {
  containerId: string;
  onImgUrl?: (w: number, h: number) => string;
  icon?: ReactNode;
  text?: string;
}) => {
  const theme = useTheme();
  const [bgUrl, setBgUrl] = useState<string>();
  useEffect(() => {
    setTimeout(() => {
      const div: any = document.querySelector('#' + containerId);
      if (div) {
        if (onImgUrl) setBgUrl(onImgUrl(div.clientWidth, div.clientHeight));
      }
    }, 1);
  }, []);

  return (
    <Stack
      direction="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        height: '100%',
        width: '100%',
        padding: '10px',
        ...(!!bgUrl
          ? {
              backgroundImage: `url('${bgUrl}')`,
            }
          : {}),
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      {icon}
      {!!text && (
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      )}
    </Stack>
  );
};

const ImageItem = ({
  f,
  containerId,
}: {
  f: FileInfo;
  containerId: string;
}) => {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    setTimeout(() => {
      const div: any = document.querySelector('#' + containerId);
      if (div) {
        setSrc(
          getFileTransUrl(f, {
            op: 'thumbnail',
            opts: {
              w: div.clientWidth,
              h: div.clientHeight,
            },
          })
        );
      }
    }, 1);
  }, []);

  if (!src) return null;

  return (
    <AsyncImage
      src={src}
      style={{
        objectFit: 'cover',
        height: '100%',
        width: '100%',
      }}
      Transition={Fade}
    />
  );
};

const IconItem = ({
  f,
  text,
  children,
}: PropsWithChildren<{ f: FileInfo; text: string }>) => {
  return (
    <Stack
      direction="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        height: '100%',
        width: '100%',
        padding: '10px',
      }}
    >
      {children}
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  );
};
