/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import Button from './Button';
import {useModalDismissSignal} from './hooks';

import styles from './ModalDialog.css';

const ModalDialogContext = createContext(null);
ModalDialogContext.displayName = 'ModalDialogContext';

function dialogReducer(state, action) {
  switch (action.type) {
    case 'HIDE':
      return {
        dialogs: state.dialogs.filter((dialog) => dialog.id !== action.id),
      };
    case 'SHOW':
      return {
        dialogs: [
          ...state.dialogs,
          {
            canBeDismissed: action.canBeDismissed !== false,
            content: action.content,
            id: action.id,
            title: action.title || null,
          },
        ],
      };
    default:
      throw new Error(`Invalid action "${action.type}"`);
  }
}

function ModalDialogContextController({children}) {
  const [state, dispatch] = useReducer(dialogReducer, {
    dialogs: [],
  });

  const value = useMemo(
    () => ({
      dialogs: state.dialogs,
      dispatch,
    }),
    [state, dispatch],
  );

  return (
    <ModalDialogContext.Provider value={value}>
      {children}
    </ModalDialogContext.Provider>
  );
}

function ModalDialog(_) {
  const {dialogs, dispatch} = useContext(ModalDialogContext);

  if (dialogs.length === 0) {
    return null;
  }

  return (
    <div className={styles.Background}>
      {dialogs.map((dialog) => (
        <ModalDialogImpl
          key={dialog.id}
          canBeDismissed={dialog.canBeDismissed}
          content={dialog.content}
          dispatch={dispatch}
          id={dialog.id}
          title={dialog.title}
        />
      ))}
    </div>
  );
}

function ModalDialogImpl({canBeDismissed, content, dispatch, id, title}) {
  const dismissModal = useCallback(() => {
    if (canBeDismissed) {
      dispatch({type: 'HIDE', id});
    }
  }, [canBeDismissed, dispatch]);
  const dialogRef = useRef(null);

  // It's important to trap click events within the dialog,
  // so the dismiss hook will use it for click hit detection.
  // Because multiple tabs may be showing this ModalDialog,
  // the normal `dialog.contains(target)` check would fail on a background tab.
  useModalDismissSignal(dialogRef, dismissModal, false);

  // Clicks on the dialog should not bubble.
  // This way we can dismiss by listening to clicks on the background.
  const handleDialogClick = (event) => {
    event.stopPropagation();

    // It is important that we don't also prevent default,
    // or clicks within the dialog (e.g. on links) won't work.
  };

  return (
    <div ref={dialogRef} className={styles.Dialog} onClick={handleDialogClick}>
      {title !== null && <div className={styles.Title}>{title}</div>}
      {content}
      {canBeDismissed && (
        <div className={styles.Buttons}>
          <Button
            autoFocus={true}
            className={styles.Button}
            onClick={dismissModal}
          >
            Okay
          </Button>
        </div>
      )}
    </div>
  );
}

export {ModalDialog, ModalDialogContext, ModalDialogContextController};
