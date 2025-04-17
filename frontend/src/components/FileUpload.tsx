import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogProps,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  styled,
  Typography,
} from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { useTheme } from '@emotion/react';
import { useState } from 'react';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { API_PREFIX_FS } from '../constans';

export type FileUploadProps = {
  dir: string;
};
export const FileUpload = ({ dir }: FileUploadProps) => {
  const theme = useTheme();
  const [fileList, setFileList] = useState<any[]>([]);
  const handleAddFiles = (event: any) => {
    setFileList(pre => [
      ...Array.from(event.target.files).map((item: any) => ({
        file: item,
        status: '',
      })),
      ...pre,
    ]);
  };
  const handleRemoveFile = (index: number) => {
    setFileList(pre =>
      pre
        .filter((item, i) => (i !== index ? item : null))
        .filter(v => v !== null)
    );
  };

  const handleChangeStatus = (index: number, status: string) => {
    setFileList(pre =>
      pre.map((item, i) => (i === index ? { ...item, status } : item))
    );
  };

  const handleUpload = async () => {
    setFileList(pre => pre.map(v => ({ ...v, status: 'uploading' })));

    const doUpload = async (file: File, index: number) => {
      const formData = new FormData();
      formData.append('file', file);
      handleChangeStatus(index, 'uploading');
      try {
        const rsp = await fetch(`${API_PREFIX_FS}/${dir}`, {
          method: 'POST',
          body: formData,
          headers: {
            // fetch 会自动设置 Content-Type 为 multipart/form-data 当 body 是 FormData 对象时
          },
        });
        if (rsp.ok) {
          handleChangeStatus(index, 'success');
        }
      } catch (err) {
        handleChangeStatus(index, 'error');
      }
    };

    for (let index = 0; index < fileList.length; index++) {
      const f = fileList[index];
      await doUpload(fileList[index].file, index);
    }
  };

  return (
    <Stack sx={{ width: '100%', height: '100%', padding: '15px' }}>
      <Stack direction="row" justifyContent="space-between">
        <ButtonGroup>
          <Button component="label" variant="contained">
            选择文件
            <VisuallyHiddenInput
              type="file"
              onChange={handleAddFiles}
              multiple
            />
          </Button>
          <Button variant="outlined" onClick={() => setFileList([])}>
            清空
          </Button>
        </ButtonGroup>
        <Button variant="contained" onClick={handleUpload}>
          上传
        </Button>
      </Stack>
      <Box sx={{ flex: 1, height: 0, overflow: 'auto', padding: '10px 0' }}>
        <List>
          {fileList.map((f, index) => (
            <ListItem key={f.file.name + index}>
              <InsertDriveFileIcon
                fontSize="small"
                color={f.status}
                sx={{ marginRight: '10px' }}
              />
              <ListItemText
                primary={
                  <Typography color={f.status}>{f.file.name}</Typography>
                }
                secondary={
                  f.status === 'uploading'
                    ? '上传中'
                    : f.status === 'success'
                    ? '上传成功'
                    : f.status === 'error'
                    ? '上传失败'
                    : null
                }
              />
              <IconButton onClick={() => handleRemoveFile(index)}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Stack>
  );
};

export type FileUploadDlgProps = FileUploadProps & {
  open: boolean;
  onClose: () => void;
};

export const FileUploadDlg = ({ dir, open, onClose }: FileUploadDlgProps) => {
  const theme = useTheme();
  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          padding: '5px 15px',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography>{`上传文件到目录${dir}`}</Typography>
        <IconButton onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
      <FileUpload dir={dir} />
    </Dialog>
  );
};

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});
