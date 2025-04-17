import { memo, useMemo, useState } from 'react';
import { Swiper, SwiperClass, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { FileInfo } from '../hooks';
import { Mousewheel } from 'swiper/modules';
import {
  FileViewer,
  FileViewerContainer,
  FileViewerContent,
} from './FileViewer';

export const FileListViewer = ({
  manage,
  list,
  index,
  onClose,
}: {
  manage?: boolean;
  list: FileInfo[];
  index: number;
  onClose: () => void;
}) => {
  let fileIndex = index;
  let fileList = list.filter((f, i) => {
    if (f.isDir || (!manage && f.viewHidden)) {
      if (i <= fileIndex) fileIndex--;
      return false;
    }
    return true;
  });

  const [swiperIndex, setSwiperIndex] = useState<number>(fileIndex);
  const currFile = useMemo(() => {
    return fileList[swiperIndex];
  }, [fileList, swiperIndex]);

  return (
    <FileViewerContainer f={currFile} onClose={onClose}>
      <Swiper
        direction={'vertical'}
        lazyPreloadPrevNext={1}
        initialSlide={index}
        mousewheel={true}
        freeMode={true}
        modules={[Mousewheel]}
        loop={false}
        cssMode={true}
        style={{
          height: 'calc(100vh - var(--browser-address-bar, 0px))',
          width: '100vw',
        }}
        onActiveIndexChange={(swiper: SwiperClass) => {
          setSwiperIndex(swiper.activeIndex);
        }}
      >
        {fileList.map((f, index) => (
          <SwiperSlide
            style={{
              width: '100vw',
            }}
            autoCorrect=""
          >
            <FileViewerContentMemo f={f} isActive={index === swiperIndex} />
          </SwiperSlide>
        ))}
      </Swiper>
    </FileViewerContainer>
  );
};

const FileViewerContentMemo = memo(
  ({ f, isActive }: { f: FileInfo; isActive: boolean }) => {
    return <FileViewerContent f={f} deActive={!isActive} />;
  }
);
