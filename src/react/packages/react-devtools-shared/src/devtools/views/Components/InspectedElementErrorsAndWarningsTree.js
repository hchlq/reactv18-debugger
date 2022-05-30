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
  useContext,
  unstable_useCacheRefresh as useCacheRefresh,
  useTransition,
} from 'react';
import Button from '../Button';
import ButtonIcon from '../ButtonIcon';
import Store from '../../store';
import sharedStyles from './InspectedElementSharedStyles.css';
import styles from './InspectedElementErrorsAndWarningsTree.css';
import {SettingsContext} from '../Settings/SettingsContext';
import {
  clearErrorsForElement as clearErrorsForElementAPI,
  clearWarningsForElement as clearWarningsForElementAPI,
} from 'react-devtools-shared/src/backendAPI';

export default function InspectedElementErrorsAndWarningsTree({
  bridge,
  inspectedElement,
  store,
}) {
  const refresh = useCacheRefresh();

  const [isErrorsTransitionPending, startClearErrorsTransition] =
    useTransition();
  const clearErrorsForInspectedElement = () => {
    const {id} = inspectedElement;
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      startClearErrorsTransition(() => {
        clearErrorsForElementAPI({
          bridge,
          id,
          rendererID,
        });
        refresh();
      });
    }
  };

  const [isWarningsTransitionPending, startClearWarningsTransition] =
    useTransition();
  const clearWarningsForInspectedElement = () => {
    const {id} = inspectedElement;
    const rendererID = store.getRendererIDForElement(id);
    if (rendererID !== null) {
      startClearWarningsTransition(() => {
        clearWarningsForElementAPI({
          bridge,
          id,
          rendererID,
        });
        refresh();
      });
    }
  };

  const {showInlineWarningsAndErrors} = useContext(SettingsContext);
  if (!showInlineWarningsAndErrors) {
    return null;
  }

  const {errors, warnings} = inspectedElement;

  return (
    <React.Fragment>
      {errors.length > 0 && (
        <Tree
          badgeClassName={styles.ErrorBadge}
          bridge={bridge}
          className={styles.ErrorTree}
          clearMessages={clearErrorsForInspectedElement}
          entries={errors}
          isTransitionPending={isErrorsTransitionPending}
          label="errors"
          messageClassName={styles.Error}
        />
      )}
      {warnings.length > 0 && (
        <Tree
          badgeClassName={styles.WarningBadge}
          bridge={bridge}
          className={styles.WarningTree}
          clearMessages={clearWarningsForInspectedElement}
          entries={warnings}
          isTransitionPending={isWarningsTransitionPending}
          label="warnings"
          messageClassName={styles.Warning}
        />
      )}
    </React.Fragment>
  );
}

function Tree({
  badgeClassName,
  actions,
  className,
  clearMessages,
  entries,
  isTransitionPending,
  label,
  messageClassName,
}) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className={`${sharedStyles.InspectedElementTree} ${className}`}>
      <div className={`${sharedStyles.HeaderRow} ${styles.HeaderRow}`}>
        <div className={sharedStyles.Header}>{label}</div>
        <Button
          disabled={isTransitionPending}
          onClick={clearMessages}
          title={`Clear all ${label} for this component`}
        >
          <ButtonIcon type="clear" />
        </Button>
      </div>
      {entries.map(([message, count], index) => (
        <ErrorOrWarningView
          key={`${label}-${index}`}
          badgeClassName={badgeClassName}
          className={messageClassName}
          count={count}
          message={message}
        />
      ))}
    </div>
  );
}

function ErrorOrWarningView({className, badgeClassName, count, message}) {
  return (
    <div className={className}>
      {count > 1 && <div className={badgeClassName}>{count}</div>}
      <div className={styles.Message} title={message}>
        {message}
      </div>
    </div>
  );
}
