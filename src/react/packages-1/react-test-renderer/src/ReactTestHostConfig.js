/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import isArray from 'shared/isArray';
import {DefaultEventPriority} from 'react-reconciler/src/ReactEventPriorities';

// Unused

export * from 'react-reconciler/src/ReactFiberHostConfigWithNoPersistence';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoHydration';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoTestSelectors';
export * from 'react-reconciler/src/ReactFiberHostConfigWithNoMicrotasks';

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
    if (!isArray(parentInstance.children)) {
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

export function getCurrentEventPriority() {
  return DefaultEventPriority;
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

export function getInstanceFromNode(mockNode) {
  const instance = nodeToInstanceMap.get(mockNode);
  if (instance !== undefined) {
    return instance.internalInstanceHandle;
  }
  return null;
}

export function beforeActiveInstanceBlur(internalInstanceHandle) {
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

export function detachDeletedInstance(node) {
  // noop
}

export function logRecoverableError(error) {
  // noop
}
