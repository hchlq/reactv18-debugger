/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import {REACT_PORTAL_TYPE} from 'shared/ReactSymbols';

                                                                  

export function createPortal(
  children               ,
  containerInfo     ,
  // TODO: figure out the API for cross-renderer implementation.
  implementation     ,
  key          = null,
)              {
  return {
    // This tag allow us to uniquely identify this as a React Portal
    $$typeof: REACT_PORTAL_TYPE,
    key: key == null ? null : '' + key,
    children,
    containerInfo,
    implementation,
  };
}
