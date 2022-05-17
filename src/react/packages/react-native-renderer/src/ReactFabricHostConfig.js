/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {mountSafeCallback_NOT_REALLY_SAFE} from './NativeMethodsMixinUtils';
import {create, diff} from './ReactNativeAttributePayload';

import invariant from 'shared/invariant';

import {dispatchEvent} from './ReactFabricEventEmitter';

// Modules provided by RN:
import {
  ReactNativeViewConfigRegistry,
  TextInputState,
  deepFreezeAndThrowOnMutationInDev,
} from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface';

const {
  createNode,
  cloneNode,
  cloneNodeWithNewChildren,
  cloneNodeWithNewChildrenAndProps,
  cloneNodeWithNewProps,
  createChildSet: createChildNodeSet,
  appendChild: appendChildNode,
  appendChildToSet: appendChildNodeToSet,
  completeRoot,
  registerEventHandler,
  measure: fabricMeasure,
  measureInWindow: fabricMeasureInWindow,
  measureLayout: fabricMeasureLayout,
} = nativeFabricUIManager;

const {get: getViewConfigForType} = ReactNativeViewConfigRegistry;

// Counter for uniquely identifying views.
// % 10 === 1 means it is a rootTag.
// % 2 === 0 means it is a Fabric tag.
// This means that they never overlap.
let nextReactTag = 2;

// TODO: Remove this conditional once all changes have propagated.
if (registerEventHandler) {
  /**
   * Register the event emitter with the native bridge
   */
  registerEventHandler(dispatchEvent);
}

/**
 * This is used for refs on host components.
 */
class ReactFabricHostComponent {
  _nativeTag;
  viewConfig;
  currentProps;
  _internalInstanceHandle;

  constructor(tag, viewConfig, props, internalInstanceHandle) {
    this._nativeTag = tag;
    this.viewConfig = viewConfig;
    this.currentProps = props;
    this._internalInstanceHandle = internalInstanceHandle;
  }

  blur() {
    TextInputState.blurTextInput(this);
  }

  focus() {
    TextInputState.focusTextInput(this);
  }

  measure(callback) {
    fabricMeasure(
      this._internalInstanceHandle.stateNode.node,
      mountSafeCallback_NOT_REALLY_SAFE(this, callback),
    );
  }

  measureInWindow(callback) {
    fabricMeasureInWindow(
      this._internalInstanceHandle.stateNode.node,
      mountSafeCallback_NOT_REALLY_SAFE(this, callback),
    );
  }

  measureLayout(
    relativeToNativeNode,
    onSuccess,
    onFail /* currently unused */,
  ) {
    if (
      typeof relativeToNativeNode === 'number' ||
      !(relativeToNativeNode instanceof ReactFabricHostComponent)
    ) {
      if (__DEV__) {
        console.error(
          'Warning: ref.measureLayout must be called with a ref to a native component.',
        );
      }

      return;
    }

    fabricMeasureLayout(
      this._internalInstanceHandle.stateNode.node,
      relativeToNativeNode._internalInstanceHandle.stateNode.node,
      mountSafeCallback_NOT_REALLY_SAFE(this, onFail),
      mountSafeCallback_NOT_REALLY_SAFE(this, onSuccess),
    );
  }

  setNativeProps(nativeProps) {
    if (__DEV__) {
      console.error(
        'Warning: setNativeProps is not currently supported in Fabric',
      );
    }

    return;
  }
}

// eslint-disable-next-line no-unused-expressions
ReactFabricHostComponent.prototype;

export * from 'react-reconciler/src/ReactFiberHostConfigWithNoMutation';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoHydration';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoScopes';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoTestSelectors';

export function appendInitialChild(parentInstance, child) {
  appendChildNode(parentInstance.node, child.node);
}

export function createInstance(
  type,
  props,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
) {
  const tag = nextReactTag;
  nextReactTag += 2;

  const viewConfig = getViewConfigForType(type);

  if (__DEV__) {
    for (const key in viewConfig.validAttributes) {
      if (props.hasOwnProperty(key)) {
        deepFreezeAndThrowOnMutationInDev(props[key]);
      }
    }
  }

  const updatePayload = create(props, viewConfig.validAttributes);

  const node = createNode(
    tag, // reactTag
    viewConfig.uiViewClassName, // viewName
    rootContainerInstance, // rootTag
    updatePayload, // props
    internalInstanceHandle, // internalInstanceHandle
  );

  const component = new ReactFabricHostComponent(
    tag,
    viewConfig,
    props,
    internalInstanceHandle,
  );

  return {
    node: node,
    canonical: component,
  };
}

export function createTextInstance(
  text,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
) {
  invariant(
    hostContext.isInAParentText,
    'Text strings must be rendered within a <Text> component.',
  );

  const tag = nextReactTag;
  nextReactTag += 2;

  const node = createNode(
    tag, // reactTag
    'RCTRawText', // viewName
    rootContainerInstance, // rootTag
    {text: text}, // props
    internalInstanceHandle, // instance handle
  );

  return {
    node: node,
  };
}

export function finalizeInitialChildren(
  parentInstance,
  type,
  props,
  rootContainerInstance,
  hostContext,
) {
  return false;
}

export function getRootHostContext(rootContainerInstance) {
  return {isInAParentText: false};
}

export function getChildHostContext(
  parentHostContext,
  type,
  rootContainerInstance,
) {
  const prevIsInAParentText = parentHostContext.isInAParentText;
  const isInAParentText =
    type === 'AndroidTextInput' || // Android
    type === 'RCTMultilineTextInputView' || // iOS
    type === 'RCTSinglelineTextInputView' || // iOS
    type === 'RCTText' ||
    type === 'RCTVirtualText';

  if (prevIsInAParentText !== isInAParentText) {
    return {isInAParentText};
  } else {
    return parentHostContext;
  }
}

export function getPublicInstance(instance) {
  return instance.canonical;
}

export function prepareForCommit(containerInfo) {
  // Noop
  return null;
}

export function prepareUpdate(
  instance,
  type,
  oldProps,
  newProps,
  rootContainerInstance,
  hostContext,
) {
  const viewConfig = instance.canonical.viewConfig;
  const updatePayload = diff(oldProps, newProps, viewConfig.validAttributes);
  // TODO: If the event handlers have changed, we need to update the current props
  // in the commit phase but there is no host config hook to do it yet.
  // So instead we hack it by updating it in the render phase.
  instance.canonical.currentProps = newProps;
  return updatePayload;
}

export function resetAfterCommit(containerInfo) {
  // Noop
}

export function shouldSetTextContent(type, props) {
  // TODO (bvaughn) Revisit this decision.
  // Always returning false simplifies the createInstance() implementation,
  // But creates an additional child Fiber for raw text children.
  // No additional native views are created though.
  // It's not clear to me which is better so I'm deferring for now.
  // More context @ github.com/facebook/react/pull/8560#discussion_r92111303
  return false;
}

// The Fabric renderer is secondary to the existing React Native renderer.
export const isPrimaryRenderer = false;

// The Fabric renderer shouldn't trigger missing act() warnings
export const warnsIfNotActing = false;

export const scheduleTimeout = setTimeout;
export const cancelTimeout = clearTimeout;
export const noTimeout = -1;

// -------------------
//     Persistence
// -------------------

export const supportsPersistence = true;

export function cloneInstance(
  instance,
  updatePayload,
  type,
  oldProps,
  newProps,
  internalInstanceHandle,
  keepChildren,
  recyclableInstance,
) {
  const node = instance.node;
  let clone;
  if (keepChildren) {
    if (updatePayload !== null) {
      clone = cloneNodeWithNewProps(node, updatePayload);
    } else {
      clone = cloneNode(node);
    }
  } else {
    if (updatePayload !== null) {
      clone = cloneNodeWithNewChildrenAndProps(node, updatePayload);
    } else {
      clone = cloneNodeWithNewChildren(node);
    }
  }
  return {
    node: clone,
    canonical: instance.canonical,
  };
}

export function cloneHiddenInstance(
  instance,
  type,
  props,
  internalInstanceHandle,
) {
  const viewConfig = instance.canonical.viewConfig;
  const node = instance.node;
  const updatePayload = create(
    {style: {display: 'none'}},
    viewConfig.validAttributes,
  );
  return {
    node: cloneNodeWithNewProps(node, updatePayload),
    canonical: instance.canonical,
  };
}

export function cloneHiddenTextInstance(
  instance,
  text,
  internalInstanceHandle,
) {
  throw new Error('Not yet implemented.');
}

export function createContainerChildSet(container) {
  return createChildNodeSet(container);
}

export function appendChildToContainerChildSet(childSet, child) {
  appendChildNodeToSet(childSet, child.node);
}

export function finalizeContainerChildren(container, newChildren) {
  completeRoot(container, newChildren);
}

export function replaceContainerChildren(container, newChildren) {}

export function getFundamentalComponentInstance(fundamentalInstance) {
  throw new Error('Not yet implemented.');
}

export function mountFundamentalComponent(fundamentalInstance) {
  throw new Error('Not yet implemented.');
}

export function shouldUpdateFundamentalComponent(fundamentalInstance) {
  throw new Error('Not yet implemented.');
}

export function updateFundamentalComponent(fundamentalInstance) {
  throw new Error('Not yet implemented.');
}

export function unmountFundamentalComponent(fundamentalInstance) {
  throw new Error('Not yet implemented.');
}

export function cloneFundamentalInstance(fundamentalInstance) {
  throw new Error('Not yet implemented.');
}

export function getInstanceFromNode(node) {
  throw new Error('Not yet implemented.');
}

export function isOpaqueHydratingObject(value) {
  throw new Error('Not yet implemented');
}

export function makeOpaqueHydratingObject(attemptToReadValue) {
  throw new Error('Not yet implemented.');
}

export function makeClientId() {
  throw new Error('Not yet implemented');
}

export function makeClientIdInDEV(warnOnAccessInDEV) {
  throw new Error('Not yet implemented');
}

export function beforeActiveInstanceBlur() {
  // noop
}

export function afterActiveInstanceBlur() {
  // noop
}

export function preparePortalMount(portalInstance) {
  // noop
}
