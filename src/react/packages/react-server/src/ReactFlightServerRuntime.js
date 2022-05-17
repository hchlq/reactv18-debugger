/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {REACT_SERVER_BLOCK_TYPE} from 'shared/ReactSymbols';

export function serverBlock(moduleReference, loadData) {
  const blockComponent = [REACT_SERVER_BLOCK_TYPE, moduleReference, loadData];

  // $FlowFixMe: Upstream BlockComponent to Flow as a valid Node.
  return blockComponent;
}

export function serverBlockNoData(moduleReference) {
  const blockComponent = [REACT_SERVER_BLOCK_TYPE, moduleReference];
  // $FlowFixMe: Upstream BlockComponent to Flow as a valid Node.
  return blockComponent;
}
