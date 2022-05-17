/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {useContext} from 'react';
import {createPortal} from 'react-dom';
import ErrorBoundary from './ErrorBoundary';
import {StoreContext} from './context';
import Store from '../store';

export default function portaledContent(Component, onErrorRetry) {
  return function PortaledContent({portalContainer, ...rest}) {
    const store = useContext(StoreContext);

    const children = (
      <ErrorBoundary store={store} onRetry={onErrorRetry}>
        <Component {...rest} />
      </ErrorBoundary>
    );

    return portalContainer != null
      ? createPortal(children, portalContainer)
      : children;
  };
}
