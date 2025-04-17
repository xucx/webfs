import { FileInfo } from './hooks';
import { API_PREFIX_FS } from './constans';

export type transOp = {
  op: 'thumbnail' | 'resize' | 'snapshot';
  opts: { w?: number; h?: number; format?: string; framenum?: number };
};

export const getFileTransUrl = (
  f: FileInfo | string,
  ops: transOp | transOp[]
): string => {
  const path = typeof f === 'string' ? f : f.path;

  let opStrs: string[] = [];
  for (const op of Array.isArray(ops) ? ops : [ops]) {
    const opStr = Object.entries({ op: op.op, ...op.opts })
      .filter(([k, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    opStrs.push(opStr);
  }

  const querys: any = {
    mtime: typeof f !== 'string' ? f.mtime : undefined,
    t: opStrs.join('|'),
  };

  const queryStr = Object.entries(querys)
    .filter(([k, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  return `${API_PREFIX_FS}/${path}?${queryStr}`;
};

export const download = (path: string, name: string) => {
  const link = document.createElement('a');
  link.download = name;
  link.href = `${API_PREFIX_FS}/${path}`;
  link.click();

  //????
  //should add to body and delete after use ?????
};
