import {
  Avatar,
  Box,
  Button,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { PageContext } from './rootPage';
import { getFileTransUrl } from '../utils';
import { API_PREFIX_FS } from '../constans';

export const WelcomePage = ({ ctx }: { ctx: PageContext }) => {
  const theme = useTheme();
  const welcome = ctx.fi.frontend?.welcome;

  return (
    <>
      <Stack
        alignItems="center"
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: theme.palette.background.default,
          ...(welcome.backgroundImageFile
            ? {
                backgroundImage: `url(${API_PREFIX_FS}/${welcome.backgroundImageFile})`,
                // backgroundPosition: 'center',
                // backgroundRepeat: 'no-repeat',
                // backgroundSize: 'contain',
              }
            : {}),
        }}
      >
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            flex: 1,
            height: 0,
          }}
        >
          {!!welcome.avatarImageFile && (
            <Avatar
              src={getFileTransUrl(welcome.avatarImageFile, {
                op: 'thumbnail',
                opts: {
                  w: 140,
                  h: 140,
                },
              })}
              sizes="large"
              sx={{ width: 140, height: 140 }}
            />
          )}
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ padding: '17px 0 6px 0' }}
          >
            {welcome.title ? welcome.title : 'WEBFS'}
          </Typography>
          {!!welcome.introduction && (
            <Typography color="text.secondary">{welcome.subTitle}</Typography>
          )}
          {!!welcome.introduction && (
            <Typography
              variant="h6"
              color="text.primary"
              sx={{ padding: '20px 0px' }}
            >
              {welcome.introduction}
            </Typography>
          )}
        </Stack>

        <Button sx={{ margin: '20px 0px' }} onClick={() => ctx.hideWelcom()}>
          {welcome.enterText ? welcome.enterText : '浏览文件'}
        </Button>
      </Stack>
    </>
  );
};
