import React, { createContext, useContext } from 'react';
import { useTopSnackbar } from '../components/common/TopSnackbar';

type SnackbarContextType = (message: string, type?: 'info' | 'success' | 'error') => void;

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { snackbar, showSnackbar } = useTopSnackbar();

  return (
    <SnackbarContext.Provider value={showSnackbar}>
      {children}
      {snackbar}
    </SnackbarContext.Provider>
  );
};

// 어디서든 훅으로 접근 가능
export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) throw new Error('useSnackbar must be used within SnackbarProvider');
  return context;
};
