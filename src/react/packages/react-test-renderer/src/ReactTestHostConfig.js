/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {REACT_OPAQUE_ID_TYPE} from 'shared/ReactSymbols';

// Unused

export * from 'react-reconciler/src/ReactFiberHostConfigWithNoPersistence';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoHydration';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoTestSelectors';

const NO_CONTEXT = {};
const UPDATE_SIGNAL = {};
const nodeToInstanceMap = new WeakMap();

if (__DEV__) {
  Object.freeze(NO_CONTEXT);
  Object.freeze(UPDATE_SIGNAL);
}

export function getPublicInstance(inst) {
  switch (inst.tag) {
    case 'INSTANCE':
      const createNodeMock = inst.rootContainerInstance.createNodeMock;
      const mockNode = createNodeMock({
        type: inst.type,
        props: inst.props,
      });
      if (typeof mockNode === 'object' && mockNode !== null) {
        nodeToInstanceMap.set(mockNode, inst);
      }
      return mockNode;
    default:
      return inst;
  }
}

export function appendChild(parentInstance, child) {
  if (__DEV__) {
    if (!Array.isArray(parentInstance.children)) {
      console.error(
        'An invalid container has been provided. ' +
          'This may indicate that another renderer is being used in addition to the test renderer. ' +
          '(For example, ReactDOM.createPortal inside of a ReactTestRenderer tree.) ' +
          'This is not supported.',
      );
    }
  }
  const index = parentInstance.children.indexOf(child);
  if (index !== -1) {
    parentInstance.children.splice(index, 1);
  }
  parentInstance.children.push(child);
}

export function insertBefore(parentInstance, child, beforeChild) {
  const index = parentInstance.children.indexOf(child);
  if (index !== -1) {
    parentInstance.children.splice(index, 1);
  }
  const beforeIndex = parentInstance.children.indexOf(beforeChild);
  parentInstance.children.splice(beforeIndex, 0, child);
}

export function removeChild(parentInstance, child) {
  const index = parentInstance.children.indexOf(child);
  parentInstance.children.splice(index, 1);
}

export function clearContainer(container) {
  container.children.splice(0);
}

export function getRootHostContext(rootContainerInstance) {
  return NO_CONTEXT;
}

export function getChildHostContext(
  parentHostContext,
  type,
  rootContainerInstance,
) {
  return NO_CONTEXT;
}

export function prepareForCommit(containerInfo) {
  // noop
  return null;
}

export function resetAfterCommit(containerInfo) {
  // noop
}

export function createInstance(
  type,
  props,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
) {
  return {
    type,
    props,
    isHidden: false,
    children: [],
    internalInstanceHandle,
    rootContainerInstance,
    tag: 'INSTANCE',
  };
}

export function appendInitialChild(parentInstance, child) {
  const index = parentInstance.children.indexOf(child);
  if (index !== -1) {
    parentInstance.children.splice(index, 1);
  }
  parentInstance.children.push(child);
}

export function finalizeInitialChildren(
  testElement,
  type,
  props,
  rootContainerInstance,
  hostContext,
) {
  return false;
}

export function prepareUpdate(
  testElement,
  type,
  oldProps,
  newProps,
  rootContainerInstance,
  hostContext,
) {
  return UPDATE_SIGNAL;
}

export function shouldSetTextContent(type, props) {
  return false;
}

export function createTextInstance(
  text,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
) {
  return {
    text,
    isHidden: false,
    tag: 'TEXT',
  };
}

export const isPrimaryRenderer = false;
export const warnsIfNotActing = true;

export const scheduleTimeout = setTimeout;
export const cancelTimeout = clearTimeout;
export const noTimeout = -1;

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

export function commitUpdate(
  instance,
  updatePayload,
  type,
  oldProps,
  newProps,
  internalInstanceHandle,
) {
  instance.type = type;
  instance.props = newProps;
}

export function commitMount(instance, type, newProps, internalInstanceHandle) {
  // noop
}

export function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.text = newText;
}

export function resetTextContent(testElement) {
  // noop
}

export const appendChildToContainer = appendChild;
export const insertInContainerBefore = insertBefore;
export const removeChildFromContainer = removeChild;

export function hideInstance(instance) {
  instance.isHidden = true;
}

export function hideTextInstance(textInstance) {
  textInstance.isHidden = true;
}

export function unhideInstance(instance, props) {
  instance.isHidden = false;
}

export function unhideTextInstance(textInstance, text) {
  textInstance.isHidden = false;
}

export function getFundamentalComponentInstance(fundamentalInstance) {
  const {impl, props, state} = fundamentalInstance;
  return impl.getInstance(null, props, state);
}

export function mountFundamentalComponent(fundamentalInstance) {
  const {impl, instance, props, state} = fundamentalInstance;
  const onMount = impl.onMount;
  if (onMount !== undefined) {
    onMount(null, instance, props, state);
  }
}

export function shouldUpdateFundamentalComponent(fundamentalInstance) {
  const {impl, prevProps, props, state} = fundamentalInstance;
  const shouldUpdate = impl.shouldUpdate;
  if (shouldUpdate !== undefined) {
    return shouldUpdate(null, prevProps, props, state);
  }
  return true;
}

export function updateFundamentalComponent(fundamentalInstance) {
  const {impl, instance, prevProps, props, state} = fundamentalInstance;
  const onUpdate = impl.onUpdate;
  if (onUpdate !== undefined) {
    onUpdate(null, instance, prevProps, props, state);
  }
}

export function unmountFundamentalComponent(fundamentalInstance) {
  const {impl, instance, props, state} = fundamentalInstance;
  const onUnmount = impl.onUnmount;
  if (onUnmount !== undefined) {
    onUnmount(null, instance, props, state);
  }
}

export function getInstanceFromNode(mockNode) {
  const instance = nodeToInstanceMap.get(mockNode);
  if (instance !== undefined) {
    return instance.internalInstanceHandle;
  }
  return null;
}

let clientId = 0;
export function makeClientId() {
  return 'c_' + (clientId++).toString(36);
}

export function makeClientIdInDEV(warnOnAccessInDEV) {
  const id = 'c_' + (clientId++).toString(36);
  return {
    toString() {
      warnOnAccessInDEV();
      return id;
    },
    valueOf() {
      warnOnAccessInDEV();
      return id;
    },
  };
}

export function isOpaqueHydratingObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.$$typeof === REACT_OPAQUE_ID_TYPE
  );
}

export function makeOpaqueHydratingObject(attemptToReadValue) {
  return {
    $$typeof: REACT_OPAQUE_ID_TYPE,
    toString: attemptToReadValue,
    valueOf: attemptToReadValue,
  };
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

export function prepareScopeUpdate(scopeInstance, inst) {
  nodeToInstanceMap.set(scopeInstance, inst);
}

export function getInstanceFromScope(scopeInstance) {
  return nodeToInstanceMap.get(scopeInstance) || null;
}
