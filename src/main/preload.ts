// 通信文档 https://www.electronjs.org/zh/docs/latest/tutorial/ipc
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const hygraphSyncHandler = {
  hygraphSync_start: (projectInfo: any) => ipcRenderer.invoke('hygraphSync:start', projectInfo),
  hygraphSync_openLog: () => ipcRenderer.invoke('hygraphSync:openLog'),
  onHygraphSync: (callback: (msg: { type: string, msg: string }) => void) => ipcRenderer.on('hygraphSync:msg', (_event, value) => callback(value))
}

contextBridge.exposeInMainWorld('hygraphSyncApi', hygraphSyncHandler);

export type HygraphSyncHandler = typeof hygraphSyncHandler;
