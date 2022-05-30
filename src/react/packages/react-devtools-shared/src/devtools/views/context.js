/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {createContext} from 'react';
import Store from '../store';

export const BridgeContext = createContext(null);
BridgeContext.displayName = 'BridgeContext';

export const StoreContext = createContext(null);
StoreContext.displayName = 'StoreContext';

export const ContextMenuContext = createContext({
  isEnabledForInspectedElement: false,
  viewAttributeSourceFunction: null,
});
ContextMenuContext.displayName = 'ContextMenuContext';

export const OptionsContext = createContext({
  readOnly: false,
  hideSettings: false,
  hideToggleErrorAction: false,
  hideToggleSuspenseAction: false,
  hideLogAction: false,
  hideViewSourceAction: false,
});
