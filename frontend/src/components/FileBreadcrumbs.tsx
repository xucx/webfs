import { Breadcrumbs, Link as MuiLink, SxProps, Theme } from '@mui/material';
import { useMemo } from 'react';
import HomeIcon from '@mui/icons-material/Home';
import { Link, useNavigate } from 'react-router-dom';

export const FileBreadcrumbs = ({
  pathItems,
  sx,
}: {
  pathItems: string[];
  sx?: SxProps<Theme>;
}) => {
  const navigae = useNavigate();
  const pathUrls = useMemo(() => {
    return pathItems
      .map(item => decodeURIComponent(item))
      .reduce((all, item) => {
        all.push({
          name: item,
          path: all.length > 0 ? all[all.length - 1].path + '/' + item : item,
        });
        return all;
      }, [] as { name: string; path: string }[]);
  }, [pathItems]);

  const handleNavClick = (e: any, to: string) => {
    e.stopPropagation();
    navigae(to);
  };

  return (
    <Breadcrumbs sx={sx}>
      <MuiLink
        underline="hover"
        sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        color="text.disabled"
        onClick={e => handleNavClick(e, '/')}
      >
        <HomeIcon fontSize="small" />
      </MuiLink>

      {pathUrls.map((item, index) => {
        return index < pathItems.length - 1 ? (
          <MuiLink
            underline="hover"
            color="inherit"
            onClick={e => handleNavClick(e, `/${item.path}`)}
            sx={{ cursor: 'pointer' }}
          >
            {item.name}
          </MuiLink>
        ) : (
          <MuiLink underline="hover">{item.name}</MuiLink>
        );
      })}
    </Breadcrumbs>
  );
};
