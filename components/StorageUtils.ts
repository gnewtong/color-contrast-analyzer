import { ColorRamp } from './ContrastUtils';

// Type declaration for the Electron API
declare global {
  interface Window {
    electronAPI: {
      saveColorRamps: (colorRamps: ColorRamp[]) => Promise<{ success: boolean; error?: string }>;
      loadColorRamps: () => Promise<{ success: boolean; data?: ColorRamp[]; error?: string }>;
    };
  }
}

export const StorageUtils = {
  /**
   * Save color ramps to persistent storage
   */
  async saveColorRamps(colorRamps: ColorRamp[]): Promise<boolean> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveColorRamps(colorRamps);
        return result.success;
      }
      // Fallback to localStorage for web version
      localStorage.setItem('colorRamps', JSON.stringify(colorRamps));
      return true;
    } catch (error) {
      console.error('Error saving color ramps:', error);
      return false;
    }
  },

  /**
   * Load color ramps from persistent storage
   */
  async loadColorRamps(): Promise<ColorRamp[] | null> {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.loadColorRamps();
        if (result.success && result.data) {
          return result.data;
        }
        return null;
      }
      // Fallback to localStorage for web version
      const stored = localStorage.getItem('colorRamps');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading color ramps:', error);
      return null;
    }
  },

  /**
   * Check if we're running in Electron
   */
  isElectron(): boolean {
    return !!window.electronAPI;
  }
}; 