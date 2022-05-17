/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// Module provided by RN:
import {UIManager} from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface';

const ReactFabricGlobalResponderHandler = {
  onChange: function (from, to, blockNativeResponder) {
    if (to !== null) {
      const tag = to.stateNode.canonical._nativeTag;
      UIManager.setJSResponder(tag, blockNativeResponder);
    } else {
      UIManager.clearJSResponder();
    }
  },
};

export default ReactFabricGlobalResponderHandler;
