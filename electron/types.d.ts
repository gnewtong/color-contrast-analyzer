declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
      onNewRamp: (callback: () => void) => void;
      onExportSvg: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
      platform: string;
      isDev: boolean;
      saveColorRamps: (colorRamps: any[]) => Promise<{ success: boolean; error?: string }>;
      loadColorRamps: () => Promise<{ success: boolean; data?: any; error?: string }>;
    };
  }
}

export {}; 