/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import ErrorStackParser from 'error-stack-parser';
import testErrorStack, {
  SOURCE_STACK_FRAME_LINE_NUMBER,
} from './ErrorTesterCompiled';

let sourceMapsAreAppliedToErrors = null;

// Source maps are automatically applied to Error stack frames.
export function areSourceMapsAppliedToErrors() {
  if (sourceMapsAreAppliedToErrors === null) {
    try {
      testErrorStack();
      sourceMapsAreAppliedToErrors = false;
    } catch (error) {
      const parsed = ErrorStackParser.parse(error);
      const topStackFrame = parsed[0];
      const lineNumber = topStackFrame.lineNumber;
      if (lineNumber === SOURCE_STACK_FRAME_LINE_NUMBER) {
        sourceMapsAreAppliedToErrors = true;
      }
    }
  }

  return sourceMapsAreAppliedToErrors === true;
}
