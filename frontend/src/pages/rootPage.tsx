import { Box, Stack, Typography } from '@mui/material';
import { FileInfo, useFileInfo } from '../hooks';
import { useEffect, useMemo, useState } from 'react';
import { WelcomePage } from './welcomePage';
import { DirPage } from './dirPage';
import { FilePage } from './filePage';
import { atom, useAtom, useSetAtom } from 'jotai';
import { Helmet } from 'react-helmet';
import { theme$, welcom$ } from '../App';

export type PageContext = {
  path: string;
  pathItems: string[];
  parentPath: string;
  fi: FileInfo;
  refresh: () => void;
  hideWelcom: () => void;
};

export const RootPage = () => {
  const { path, pathItems, parentPath, info, loading, error, refresh } =
    useFileInfo();
  const [showWelcom, setShowWelcom] = useAtom(welcom$);
  const setTheme = useSetAtom(theme$);
  const ctx = {
    path,
    pathItems,
    parentPath,
    fi: info,
    refresh,
    hideWelcom: () => {
      setShowWelcom(false);
    },
  } as PageContext;

  useEffect(() => {
    if (!info) return;
    if (info.frontend?.theme) setTheme(info.frontend?.theme);
  }, [info]);

  return (
    <>
      {info?.frontend?.title && (
        <Helmet>
          <title>{info?.frontend?.title}</title>
        </Helmet>
      )}

      {info ? (
        <>
          {path === '' && !!info.frontend?.welcome && showWelcom ? (
            <WelcomePage ctx={ctx} />
          ) : info.isDir ? (
            <DirPage ctx={ctx} />
          ) : (
            <FilePage ctx={ctx} />
          )}
        </>
      ) : (
        <Stack
          sx={{
            height: '100%',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {loading && <Typography> 加载中...</Typography>}
          {!!error && <Typography color="error"> {error} </Typography>}
        </Stack>
      )}
    </>
  );
};
