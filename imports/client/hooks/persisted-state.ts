import { Dispatch, SetStateAction } from 'react';
import createPersistedState from 'use-persisted-state';

export type OperatorActionsHiddenState = Record<string /* huntId */, boolean>;
export const useOperatorActionsHidden: () => [
  OperatorActionsHiddenState | undefined,
  Dispatch<SetStateAction<OperatorActionsHiddenState | undefined>>
] =
  createPersistedState('operatorActionsHidden');

export const useOperatorActionsHiddenForHunt = (huntId: string): readonly [
  boolean,
  Dispatch<SetStateAction<boolean>>,
] => {
  const [operatorActionsHidden, setOperatorActionsHidden] = useOperatorActionsHidden();
  return [
    operatorActionsHidden?.[huntId] ?? false,
    (update: SetStateAction<boolean>) => {
      setOperatorActionsHidden((prevHidden) => {
        const newHidden = {
          ...prevHidden,
          [huntId]: typeof update === 'function' ? update(prevHidden?.[huntId] ?? false) : update,
        };
        return newHidden;
      });
    },
  ] as const;
};
