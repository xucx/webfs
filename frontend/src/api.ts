import { API_PREFIX_FS } from './constans';

export const apis = {
  fs: async (path: string, opt?: {
    info?:boolean,
    create?:boolean,
    delete?:boolean;
}) => {
    if (!path.startsWith('/')) path = '/' + path 
    if (opt?.info) path += '?info'
    const rsp = await fetch(`${API_PREFIX_FS}${path}`, {
      method : opt?.create ? 'post' : opt?.delete ? 'delete' : 'get',
    });
    if (!rsp.ok) {
      throw new Error(`Error: ${rsp.status} ${rsp.statusText}`);
    }

    const contentType = rsp.headers.get('Content-Type');
    if (contentType?.startsWith('application/json')) {
      return await rsp.json();
    }
    if (contentType?.startsWith('text/json')) {
      return await rsp.text();
    }

    return await (rsp as any).bytes();
  },

  fsInfo: async (path: string) => apis.fs(path, {info:true}),
  fsDel: async (path: string) => apis.fs(path, {delete:true}),
  fsCreate: async (path: string) => apis.fs(path, {create:true}),
};
