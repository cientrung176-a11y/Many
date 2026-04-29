import { createContext, useContext, useState, useCallback } from 'react';

type ExpenseContextType = {
  version: number;
  refresh: () => void;
};

const ExpenseContext = createContext<ExpenseContextType>({ version: 0, refresh: () => {} });

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return (
    <ExpenseContext.Provider value={{ version, refresh }}>
      {children}
    </ExpenseContext.Provider>
  );
}

export const useExpenseContext = () => useContext(ExpenseContext);
