import { useEffect, useMemo, useState } from 'react';
import { apis } from './api';
import { API_PREFIX_FS } from './constans';
import { useLocation } from 'react-router-dom';

export interface FileInfo {
  name: string;
  fileName: string;
  fileExt: string;
  path: string;
  isDir: boolean;
  mimeType: string;
  size: number;
  mtime: number;
  dirs: FileInfo[];
  files: FileInfo[];

  welcome: any;

  //addation
  url: string;
  viewHidden: boolean;
  descFilePath: string;
  descFileUrl: string;
}

export const useFileInfo = () => {
  const location = useLocation();
  const [refresh, setRefresh] = useState<number>(0);
  const [info, setInfo] = useState<FileInfo>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>();

  const { path, pathItems, parentPath } = useMemo(() => {
    let pathItems = location.pathname.split('/').filter(v => !!v);
    let path = pathItems.join('/');
    let parentPath =
      '/' +
      (pathItems.length > 1
        ? pathItems.slice(0, pathItems.length - 1).join('/')
        : '');
    return { path, pathItems, parentPath };
  }, [location.pathname]);

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    apis
      .fsInfo(path)
      .then(data => {
        setInfo(processFileInfo(data as FileInfo));
      })
      .catch(e => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [path, refresh]);

  return {
    path,
    pathItems,
    parentPath,
    info,
    loading,
    error,
    refresh: () => setRefresh(p => p + 1),
  };
};

const processFileInfo = (dirInfo: FileInfo): FileInfo => {
  const processFile = (f: FileInfo): FileInfo => {
    return {
      ...f,
      viewHidden: f.fileName.startsWith('.'),
      url: f.isDir
        ? `${API_PREFIX_FS}/${f.path}`
        : `${API_PREFIX_FS}/${f.path}?mtime=${f.mtime}`,
    };
  };

  const dirs = dirInfo.dirs.map(f => processFile(f));
  const files = dirInfo.files.map(f => processFile(f));

  const all = [...dirInfo.dirs, ...dirInfo.files];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.fileExt === '.txt') {
      if (f.name === '.' + dirInfo.name) {
        dirInfo.descFilePath = f.path;
        dirInfo.descFileUrl = f.url;
      } else {
        for (let j = 0; j < all.length; j++) {
          const ff = all[j];
          if (f.name === '.' + ff.name) {
            ff.descFilePath = f.path;
            ff.descFileUrl = f.url;
            break;
          }
        }
      }
    }
  }

  return {
    ...processFile(dirInfo),
    dirs,
    files,
  };
};
