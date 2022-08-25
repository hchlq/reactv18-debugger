/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// Modules provided by RN:
import {
  TextInputState,
  UIManager,
} from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface';

import {create} from './ReactNativeAttributePayload';
import {
  mountSafeCallback_NOT_REALLY_SAFE,
  warnForStyleProps,
} from './NativeMethodsMixinUtils';

class ReactNativeFiberHostComponent {
  _children;
  _nativeTag;
  _internalFiberInstanceHandleDEV;
  viewConfig;

  constructor(tag, viewConfig, internalInstanceHandleDEV) {
    this._nativeTag = tag;
    this._children = [];
    this.viewConfig = viewConfig;
    if (__DEV__) {
      this._internalFiberInstanceHandleDEV = internalInstanceHandleDEV;
    }
  }

  blur() {
    TextInputState.blurTextInput(this);
  }

  focus() {
    TextInputState.focusTextInput(this);
  }

  measure(callback) {
    UIManager.measure(
      this._nativeTag,
      mountSafeCallback_NOT_REALLY_SAFE(this, callback),
    );
  }

  measureInWindow(callback) {
    UIManager.measureInWindow(
      this._nativeTag,
      mountSafeCallback_NOT_REALLY_SAFE(this, callback),
    );
  }

  measureLayout(
    relativeToNativeNode,
    onSuccess,
    onFail /* currently unused */,
  ) {
    let relativeNode;

    if (typeof relativeToNativeNode === 'number') {
      // Already a node handle
      relativeNode = relativeToNativeNode;
    } else {
      const nativeNode = relativeToNativeNode;
      if (nativeNode._nativeTag) {
        relativeNode = nativeNode._nativeTag;
      }
    }

    if (relativeNode == null) {
      if (__DEV__) {
        console.error(
          'Warning: ref.measureLayout must be called with a node handle or a ref to a native component.',
        );
      }

      return;
    }

    UIManager.measureLayout(
      this._nativeTag,
      relativeNode,
      mountSafeCallback_NOT_REALLY_SAFE(this, onFail),
      mountSafeCallback_NOT_REALLY_SAFE(this, onSuccess),
    );
  }

  setNativeProps(nativeProps) {
    if (__DEV__) {
      warnForStyleProps(nativeProps, this.viewConfig.validAttributes);
    }

    const updatePayload = create(nativeProps, this.viewConfig.validAttributes);

    // Avoid the overhead of bridge calls if there's no update.
    // This is an expensive no-op for Android, and causes an unnecessary
    // view invalidation for certain components (eg RCTTextInput) on iOS.
    if (updatePayload != null) {
      UIManager.updateView(
        this._nativeTag,
        this.viewConfig.uiViewClassName,
        updatePayload,
      );
    }
  }
}

// eslint-disable-next-line no-unused-expressions
ReactNativeFiberHostComponent.prototype;

export default ReactNativeFiberHostComponent;
