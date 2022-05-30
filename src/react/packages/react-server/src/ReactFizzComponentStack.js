/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  describeBuiltInComponentFrame,
  describeFunctionComponentFrame,
  describeClassComponentFrame,
} from 'shared/ReactComponentStackFrame';

// DEV-only reverse linked list representing the current component stack

export function getStackByComponentStackNode(componentStack) {
  try {
    let info = '';
    let node = componentStack;
    do {
      switch (node.tag) {
        case 0:
          info += describeBuiltInComponentFrame(node.type, null, null);
          break;
        case 1:
          info += describeFunctionComponentFrame(node.type, null, null);
          break;
        case 2:
          info += describeClassComponentFrame(node.type, null, null);
          break;
      }
      node = node.parent;
    } while (node);
    return info;
  } catch (x) {
    return '\nError generating stack: ' + x.message + '\n' + x.stack;
  }
}
