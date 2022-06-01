/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  precacheFiberNode,
  updateFiberProps,
  getClosestInstanceFromNode,
  getFiberFromScopeInstance,
  getInstanceFromNode as getInstanceFromNodeDOMTree,
  isContainerMarkedAsRoot,
} from './ReactDOMComponentTree';
export {detachDeletedInstance} from './ReactDOMComponentTree';
import {hasRole} from './DOMAccessibilityRoles';
import {
  createElement,
  createTextNode,
  setInitialProperties,
  diffProperties,
  updateProperties,
  diffHydratedProperties,
  diffHydratedText,
  trapClickOnNonInteractiveElement,
  checkForUnmatchedText,
  warnForDeletedHydratableElement,
  warnForDeletedHydratableText,
  warnForInsertedHydratedElement,
  warnForInsertedHydratedText,
} from './ReactDOMComponent';
import {getSelectionInformation, restoreSelection} from './ReactInputSelection';
import setTextContent from './setTextContent';
import {validateDOMNesting, updatedAncestorInfo} from './validateDOMNesting';
import {
  isEnabled as ReactBrowserEventEmitterIsEnabled,
  setEnabled as ReactBrowserEventEmitterSetEnabled,
  getEventPriority,
} from '../events/ReactDOMEventListener';
import {getChildNamespace} from '../shared/DOMNamespaces';
import {
  ELEMENT_NODE,
  TEXT_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from '../shared/HTMLNodeType';
import dangerousStyleValue from '../shared/dangerousStyleValue';

import {retryIfBlockedOn} from '../events/ReactDOMEventReplaying';

import {
  enableCreateEventHandleAPI,
  enableScopeAPI,
} from 'shared/ReactFeatureFlags';
import {HostComponent, HostText} from 'react-reconciler/src/ReactWorkTags';
import {listenToAllSupportedEvents} from '../events/DOMPluginEventSystem';

import {DefaultEventPriority} from 'react-reconciler/src/ReactEventPriorities';

// TODO: Remove this deep import when we delete the legacy root API
import {ConcurrentMode, NoMode} from 'react-reconciler/src/ReactTypeOfMode';

// Unused

const SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';

const SUSPENSE_START_DATA = '$';
const SUSPENSE_END_DATA = '/$';
const SUSPENSE_PENDING_START_DATA = '$?';
const SUSPENSE_FALLBACK_START_DATA = '$!';

const STYLE = 'style';

let eventsEnabled = null;
let selectionInformation = null;

export * from 'react-reconciler/src/ReactFiberHostConfigWithNoPersistence';

/**
 * 获取 rootContainerInstance 的 namespaceURI
 */
export function getRootHostContext(rootContainerInstance) {
  let type;
  let namespace;
  const nodeType = rootContainerInstance.nodeType;
  switch (nodeType) {
    case DOCUMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE: {
      // 1. document
      // 2. documentFragment
      type = nodeType === DOCUMENT_NODE ? '#document' : '#fragment';

      // 根元素 html
      const root = rootContainerInstance.documentElement;
      namespace = root ? root.namespaceURI : getChildNamespace(null, '');
      break;
    }
    default: {
      const container =
        nodeType === COMMENT_NODE
          ? rootContainerInstance.parentNode
          : rootContainerInstance;
      const ownNamespace = container.namespaceURI || null;
      type = container.tagName;
      namespace = getChildNamespace(ownNamespace, type);
      break;
    }
  }

  // 返回 namespace
  return namespace;
}

/**
 * 获取 parentHostContext 的 namespace
 */
export function getChildHostContext(
  parentHostContext,
  type,
  rootContainerInstance,
) {
  const parentNamespace = parentHostContext;
  return getChildNamespace(parentNamespace, type);
}

/**
 * 获取 instance, 返回的还是参数本身
 */
export function getPublicInstance(instance) {
  return instance;
}

/**
 * commit 之前的准备，获取激活的元素对应的 fiber 节点
 */
export function prepareForCommit(containerInfo) {
  // 默认是 true
  eventsEnabled = ReactBrowserEventEmitterIsEnabled();

  // 获取当前激活的的元素节点
  selectionInformation = getSelectionInformation();

  let activeInstance = null;

  if (enableCreateEventHandleAPI) {
    const focusedElem = selectionInformation.focusedElem;
    if (focusedElem !== null) {
      // 获取最近的 fiber 节点
      activeInstance = getClosestInstanceFromNode(focusedElem);
    }
  }

  // 设置为 false
  ReactBrowserEventEmitterSetEnabled(false);

  return activeInstance;
}

/**
 * 激活的实例失焦之前
 */
export function beforeActiveInstanceBlur(internalInstanceHandle) {
  if (enableCreateEventHandleAPI) {
    ReactBrowserEventEmitterSetEnabled(true);

    dispatchBeforeDetachedBlur(
      selectionInformation.focusedElem,
      internalInstanceHandle,
    );

    ReactBrowserEventEmitterSetEnabled(false);
  }
}

/**
 * 触发 afterBlur 事件
 */
export function afterActiveInstanceBlur() {
  if (enableCreateEventHandleAPI) {
    ReactBrowserEventEmitterSetEnabled(true);
    dispatchAfterDetachedBlur(selectionInformation.focusedElem);
    ReactBrowserEventEmitterSetEnabled(false);
  }
}

/**
 * afterCommit 后重置变量
 */
export function resetAfterCommit(containerInfo) {
  restoreSelection(selectionInformation);
  ReactBrowserEventEmitterSetEnabled(eventsEnabled);
  eventsEnabled = null;
  selectionInformation = null;
}

/**
 * 创建元素实例
 */
export function createInstance(
  type,
  props,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
) {
  let parentNamespace;
  // if (__DEV__) {
  //   // TODO: take namespace into account when validating.
  //   const hostContextDev = hostContext;

  //   validateDOMNesting(type, null, hostContextDev.ancestorInfo);
  //   if (
  //     typeof props.children === 'string' ||
  //     typeof props.children === 'number'
  //   ) {
  //     const string = '' + props.children;
  //     const ownAncestorInfo = updatedAncestorInfo(
  //       hostContextDev.ancestorInfo,
  //       type,
  //     );
  //     validateDOMNesting(null, string, ownAncestorInfo);
  //   }

  //   parentNamespace = hostContextDev.namespace;
  // } else {
  parentNamespace = hostContext;
  // }

  const domElement = createElement(
    type,
    props,
    rootContainerInstance,
    parentNamespace,
  );

  // 预先缓存 fiber 节点
  // domElement[internalContainerInstanceKey] = internalInstanceHandle;
  precacheFiberNode(internalInstanceHandle, domElement);

  // 预先缓存 props
  // node[internalPropsKey] = props;
  updateFiberProps(domElement, props);

  return domElement;
}

/**
 * appendChild
 */
export function appendInitialChild(parentInstance, child) {
  parentInstance.appendChild(child);
}

/**
 *
 * @returns 返回值为 true, 那么 workInProgress 就增加 Update 的 effect, 即 workInProgress.flags = Update
 */
export function finalizeInitialChildren(
  domElement,
  type,
  props,
  rootContainerInstance,
  hostContext,
) {
  // 初始化 props
  setInitialProperties(domElement, type, props, rootContainerInstance);

  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      return !!props.autoFocus;
    case 'img':
      return true;
    default:
      return false;
  }
}

/**
 * 准备更新，比较前后的 props
 */
export function prepareUpdate(
  domElement,
  type,
  oldProps,
  newProps,
  rootContainerInstance,
  hostContext,
) {
  return diffProperties(
    domElement,
    type,
    oldProps,
    newProps,
    rootContainerInstance,
  );
}

/**
 * 是否应该使用 textContent
 */
export function shouldSetTextContent(type, props) {
  return (
    type === 'textarea' ||
    type === 'noscript' ||
    typeof props.children === 'string' ||
    typeof props.children === 'number' ||
    (typeof props.dangerouslySetInnerHTML === 'object' &&
      props.dangerouslySetInnerHTML !== null &&
      props.dangerouslySetInnerHTML.__html != null)
  );
}

/**
 * 创建文本节点
 */
export function createTextInstance(
  text,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
) {
  const textNode = createTextNode(text, rootContainerInstance);
  precacheFiberNode(internalInstanceHandle, textNode);
  return textNode;
}

/**
 * 根据 window 当前正在处理的事件，获取事件的优先级
 */
export function getCurrentEventPriority() {
  // 当前浏览器正在处理的事件对象
  const currentEvent = window.event;
  if (currentEvent === undefined) {
    // 没有事件对象，返回默认的优先级
    return DefaultEventPriority;
  }

  // 根据事件的类型，获取优先级，比如 click
  return getEventPriority(currentEvent.type);
}

export const isPrimaryRenderer = true;
export const warnsIfNotActing = true;
// This initialization code may run even on server environments
// if a component just imports ReactDOM (e.g. for findDOMNode).
// Some environments might not have setTimeout or clearTimeout.
export const scheduleTimeout =
  typeof setTimeout === 'function' ? setTimeout : undefined;
export const cancelTimeout =
  typeof clearTimeout === 'function' ? clearTimeout : undefined;
export const noTimeout = -1;
const localPromise = typeof Promise === 'function' ? Promise : undefined;

// -------------------
//     Microtasks
// -------------------
export const supportsMicrotasks = true;
// queueMicrotask > promise > setTimeout
export const scheduleMicrotask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : typeof localPromise !== 'undefined'
    ? (callback) =>
        localPromise.resolve(null).then(callback).catch(handleErrorInNextTick)
    : scheduleTimeout; // TODO: Determine the best fallback here.

function handleErrorInNextTick(error) {
  setTimeout(() => {
    throw error;
  });
}

// -------------------
//     Mutation
// -------------------

export const supportsMutation = true;

/**
 * commit 挂载，主要处理「可替换元素」
 */
export function commitMount(
  domElement,
  type,
  newProps,
  internalInstanceHandle,
) {
  // Despite the naming that might imply otherwise, this method only
  // fires if there is an `Update` effect scheduled during mounting.
  // This happens if `finalizeInitialChildren` returns `true` (which it
  // does to implement the `autoFocus` attribute on the client). But
  // there are also other cases when this might happen (such as patching
  // up text content during hydration mismatch). So we'll check this again.
  switch (type) {
    case 'button':
    case 'input':
    case 'select':
    case 'textarea':
      if (newProps.autoFocus) {
        // 自动聚焦
        domElement.focus();
      }
      return;
    case 'img': {
      if (newProps.src) {
        // 设置图片元素
        domElement.src = newProps.src;
      }
      return;
    }
  }
}

/**
 * commit 更新
 */
export function commitUpdate(
  domElement,
  updatePayload,
  type,
  oldProps,
  newProps,
  internalInstanceHandle,
) {
  // Apply the diff to the DOM node.
  // 更新 props
  updateProperties(domElement, updatePayload, type, oldProps, newProps);

  // Update the props handle so that we know which props are the ones with
  // with current event handlers.
  // 更新 dom 上保存的 props
  // domElement[internalPropsKey] = newProps
  updateFiberProps(domElement, newProps);
}

/**
 * 清空元素的文本内容
 */
export function resetTextContent(domElement) {
  setTextContent(domElement, '');
}

/**
 * 更新文本内容
 */
export function commitTextUpdate(textInstance, oldText, newText) {
  textInstance.nodeValue = newText;
}

/**
 * appendChild
 */
export function appendChild(parentInstance, child) {
  parentInstance.appendChild(child);
}

/**
 * 将 child 插入到 container 中
 */
export function appendChildToContainer(container, child) {
  let parentNode;
  if (container.nodeType === COMMENT_NODE) {
    // container 是注释节点，插入到其 parentNode 中
    parentNode = container.parentNode;
    // 将 child 插入到注释节点 container 前
    parentNode.insertBefore(child, container);
  } else {
    parentNode = container;
    parentNode.appendChild(child);
  }
  // This container might be used for a portal.
  // If something inside a portal is clicked, that click should bubble
  // through the React tree. However, on Mobile Safari the click would
  // never bubble through the *DOM* tree unless an ancestor with onclick
  // event exists. So we wouldn't see it and dispatch it.
  // This is why we ensure that non React root containers have inline onclick
  // defined.
  // https://github.com/facebook/react/issues/11918
  const reactRootContainer = container._reactRootContainer;
  if (
    (reactRootContainer === null || reactRootContainer === undefined) &&
    parentNode.onclick === null
  ) {
    // TODO: This cast may not be sound for SVG, MathML or custom elements.
    trapClickOnNonInteractiveElement(parentNode);
  }
}

/**
 * 以 beforeChild 为参考节点，将 child 插入到 parentInstance 中
 */
export function insertBefore(parentInstance, child, beforeChild) {
  parentInstance.insertBefore(child, beforeChild);
}

/**
 * 以 beforeChild 为参考节点，将 child 插入到 container 中
 *
 * 如果 container 是注释节点，那么插入到其父节点中
 */
export function insertInContainerBefore(container, child, beforeChild) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild);
  } else {
    container.insertBefore(child, beforeChild);
  }
}

/**
 * 创建事件类型为 type 的事件对象
 */
function createEvent(type, bubbles) {
  const event = document.createEvent('Event');
  event.initEvent(type, bubbles, false);
  return event;
}

/**
 * 派发 beforeblur 事件
 */
function dispatchBeforeDetachedBlur(target, internalInstanceHandle) {
  if (enableCreateEventHandleAPI) {
    const event = createEvent('beforeblur', true);
    // Dispatch "beforeblur" directly on the target,
    // so it gets picked up by the event system and
    // can propagate through the React internal tree.
    // $FlowFixMe: internal field
    event._detachedInterceptFiber = internalInstanceHandle;

    target.dispatchEvent(event);
  }
}

/**
 * 派发 afterblur 事件
 */
function dispatchAfterDetachedBlur(target) {
  if (enableCreateEventHandleAPI) {
    const event = createEvent('afterblur', false);
    // So we know what was detached, make the relatedTarget the
    // detached target on the "afterblur" event.
    event.relatedTarget = target;
    // Dispatch the event on the document.
    document.dispatchEvent(event);
  }
}

/**
 * 移除 parentInstance 下的 child 孩子
 */
export function removeChild(parentInstance, child) {
  parentInstance.removeChild(child);
}

/**
 * 移除 container 下的 child 孩子
 *
 * 如果 container 是注释节点，那么使用 container.parentNode 来移除 child
 */
export function removeChildFromContainer(container, child) {
  if (container.nodeType === COMMENT_NODE) {
    container.parentNode.removeChild(child);
  } else {
    container.removeChild(child);
  }
}

export function clearSuspenseBoundary(parentInstance, suspenseInstance) {
  let node = suspenseInstance;
  // Delete all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  do {
    const nextNode = node.nextSibling;
    parentInstance.removeChild(node);
    if (nextNode && nextNode.nodeType === COMMENT_NODE) {
      const data = nextNode.data;
      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          parentInstance.removeChild(nextNode);
          // Retry if any event replaying was blocked on this.
          retryIfBlockedOn(suspenseInstance);
          return;
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA
      ) {
        depth++;
      }
    }
    node = nextNode;
  } while (node);
  // TODO: Warn, we didn't find the end comment boundary.
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(suspenseInstance);
}

export function clearSuspenseBoundaryFromContainer(
  container,
  suspenseInstance,
) {
  if (container.nodeType === COMMENT_NODE) {
    clearSuspenseBoundary(container.parentNode, suspenseInstance);
  } else if (container.nodeType === ELEMENT_NODE) {
    clearSuspenseBoundary(container, suspenseInstance);
  } else {
    // Document nodes should never contain suspense boundaries.
  }
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(container);
}

/**
 * 隐藏 instance 元素
 */
export function hideInstance(instance) {
  // TODO: Does this work for all element types? What about MathML? Should we
  // pass host context to this method?
  instance = instance;
  const style = instance.style;
  if (typeof style.setProperty === 'function') {
    style.setProperty('display', 'none', 'important');
  } else {
    style.display = 'none';
  }
}

/**
 * 清空文本节点的内容
 */
export function hideTextInstance(textInstance) {
  textInstance.nodeValue = '';
}

/**
 * 显示 instance 元素，从 props 中取出 display 属性
 */
export function unhideInstance(instance, props) {
  const styleProp = props[STYLE];

  // 获取 display 值
  const display =
    styleProp !== undefined &&
    styleProp !== null &&
    styleProp.hasOwnProperty('display')
      ? styleProp.display
      : null;

  instance.style.display = dangerousStyleValue('display', display);
}

/**
 * 设置文本节点的内容
 */
export function unhideTextInstance(textInstance, text) {
  textInstance.nodeValue = text;
}

/**
 * 清除元素内容
 */
export function clearContainer(container) {
  if (container.nodeType === ELEMENT_NODE) {
    // 元素节点
    container.textContent = '';
  } else if (container.nodeType === DOCUMENT_NODE) {
    // document 节点
    if (container.documentElement) {
      // document.documentElement 就是 html 元素
      container.removeChild(container.documentElement);
    }
  }
}

// -------------------
//     Hydration
// -------------------

export const supportsHydration = true;

export function canHydrateInstance(instance, type, props) {
  if (
    instance.nodeType !== ELEMENT_NODE ||
    type.toLowerCase() !== instance.nodeName.toLowerCase()
  ) {
    return null;
  }
  // This has now been refined to an element node.
  return instance;
}

export function canHydrateTextInstance(instance, text) {
  if (text === '' || instance.nodeType !== TEXT_NODE) {
    // Empty strings are not parsed by HTML so there won't be a correct match here.
    return null;
  }
  // This has now been refined to a text node.
  return instance;
}

export function canHydrateSuspenseInstance(instance) {
  if (instance.nodeType !== COMMENT_NODE) {
    // Empty strings are not parsed by HTML so there won't be a correct match here.
    return null;
  }
  // This has now been refined to a suspense node.
  return instance;
}

export function isSuspenseInstancePending(instance) {
  return instance.data === SUSPENSE_PENDING_START_DATA;
}

export function isSuspenseInstanceFallback(instance) {
  return instance.data === SUSPENSE_FALLBACK_START_DATA;
}

export function registerSuspenseInstanceRetry(instance, callback) {
  instance._reactRetry = callback;
}

function getNextHydratable(node) {
  // Skip non-hydratable nodes.
  for (; node != null; node = node.nextSibling) {
    const nodeType = node.nodeType;
    if (nodeType === ELEMENT_NODE || nodeType === TEXT_NODE) {
      break;
    }
    if (nodeType === COMMENT_NODE) {
      const nodeData = node.data;
      if (
        nodeData === SUSPENSE_START_DATA ||
        nodeData === SUSPENSE_FALLBACK_START_DATA ||
        nodeData === SUSPENSE_PENDING_START_DATA
      ) {
        break;
      }
      if (nodeData === SUSPENSE_END_DATA) {
        return null;
      }
    }
  }
  return node;
}

export function getNextHydratableSibling(instance) {
  return getNextHydratable(instance.nextSibling);
}

export function getFirstHydratableChild(parentInstance) {
  return getNextHydratable(parentInstance.firstChild);
}

export function getFirstHydratableChildWithinContainer(parentContainer) {
  return getNextHydratable(parentContainer.firstChild);
}

export function getFirstHydratableChildWithinSuspenseInstance(parentInstance) {
  return getNextHydratable(parentInstance.nextSibling);
}

export function hydrateInstance(
  instance,
  type,
  props,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle,
  shouldWarnDev,
) {
  precacheFiberNode(internalInstanceHandle, instance);
  // TODO: Possibly defer this until the commit phase where all the events
  // get attached.
  updateFiberProps(instance, props);
  let parentNamespace;
  if (__DEV__) {
    const hostContextDev = hostContext;
    parentNamespace = hostContextDev.namespace;
  } else {
    parentNamespace = hostContext;
  }

  // TODO: Temporary hack to check if we're in a concurrent root. We can delete
  // when the legacy root API is removed.
  const isConcurrentMode =
    (internalInstanceHandle.mode & ConcurrentMode) !== NoMode;

  return diffHydratedProperties(
    instance,
    type,
    props,
    parentNamespace,
    rootContainerInstance,
    isConcurrentMode,
    shouldWarnDev,
  );
}

export function hydrateTextInstance(
  textInstance,
  text,
  internalInstanceHandle,
  shouldWarnDev,
) {
  precacheFiberNode(internalInstanceHandle, textInstance);

  // TODO: Temporary hack to check if we're in a concurrent root. We can delete
  // when the legacy root API is removed.
  const isConcurrentMode =
    (internalInstanceHandle.mode & ConcurrentMode) !== NoMode;

  return diffHydratedText(textInstance, text, isConcurrentMode);
}

export function hydrateSuspenseInstance(
  suspenseInstance,
  internalInstanceHandle,
) {
  precacheFiberNode(internalInstanceHandle, suspenseInstance);
}

export function getNextHydratableInstanceAfterSuspenseInstance(
  suspenseInstance,
) {
  let node = suspenseInstance.nextSibling;
  // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      const data = node.data;
      if (data === SUSPENSE_END_DATA) {
        if (depth === 0) {
          return getNextHydratableSibling(node);
        } else {
          depth--;
        }
      } else if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA
      ) {
        depth++;
      }
    }
    node = node.nextSibling;
  }
  // TODO: Warn, we didn't find the end comment boundary.
  return null;
}

// Returns the SuspenseInstance if this node is a direct child of a
// SuspenseInstance. I.e. if its previous sibling is a Comment with
// SUSPENSE_x_START_DATA. Otherwise, null.
export function getParentSuspenseInstance(targetInstance) {
  let node = targetInstance.previousSibling;
  // Skip past all nodes within this suspense boundary.
  // There might be nested nodes so we need to keep track of how
  // deep we are and only break out when we're back on top.
  let depth = 0;
  while (node) {
    if (node.nodeType === COMMENT_NODE) {
      const data = node.data;
      if (
        data === SUSPENSE_START_DATA ||
        data === SUSPENSE_FALLBACK_START_DATA ||
        data === SUSPENSE_PENDING_START_DATA
      ) {
        if (depth === 0) {
          return node;
        } else {
          depth--;
        }
      } else if (data === SUSPENSE_END_DATA) {
        depth++;
      }
    }
    node = node.previousSibling;
  }
  return null;
}

export function commitHydratedContainer(container) {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(container);
}

export function commitHydratedSuspenseInstance(suspenseInstance) {
  // Retry if any event replaying was blocked on this.
  retryIfBlockedOn(suspenseInstance);
}

export function shouldDeleteUnhydratedTailInstances(parentType) {
  return parentType !== 'head' && parentType !== 'body';
}

export function didNotMatchHydratedContainerTextInstance(
  parentContainer,
  textInstance,
  text,
  isConcurrentMode,
) {
  const shouldWarnDev = true;
  checkForUnmatchedText(
    textInstance.nodeValue,
    text,
    isConcurrentMode,
    shouldWarnDev,
  );
}

export function didNotMatchHydratedTextInstance(
  parentType,
  parentProps,
  parentInstance,
  textInstance,
  text,
  isConcurrentMode,
) {
  if (parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
    const shouldWarnDev = true;
    checkForUnmatchedText(
      textInstance.nodeValue,
      text,
      isConcurrentMode,
      shouldWarnDev,
    );
  }
}

export function didNotHydrateInstanceWithinContainer(
  parentContainer,
  instance,
) {
  if (__DEV__) {
    if (instance.nodeType === ELEMENT_NODE) {
      warnForDeletedHydratableElement(parentContainer, instance);
    } else if (instance.nodeType === COMMENT_NODE) {
      // TODO: warnForDeletedHydratableSuspenseBoundary
    } else {
      warnForDeletedHydratableText(parentContainer, instance);
    }
  }
}

export function didNotHydrateInstanceWithinSuspenseInstance(
  parentInstance,
  instance,
) {
  if (__DEV__) {
    // $FlowFixMe: Only Element or Document can be parent nodes.
    const parentNode = parentInstance.parentNode;
    if (parentNode !== null) {
      if (instance.nodeType === ELEMENT_NODE) {
        warnForDeletedHydratableElement(parentNode, instance);
      } else if (instance.nodeType === COMMENT_NODE) {
        // TODO: warnForDeletedHydratableSuspenseBoundary
      } else {
        warnForDeletedHydratableText(parentNode, instance);
      }
    }
  }
}

export function didNotHydrateInstance(
  parentType,
  parentProps,
  parentInstance,
  instance,
  isConcurrentMode,
) {
  if (__DEV__) {
    if (isConcurrentMode || parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
      if (instance.nodeType === ELEMENT_NODE) {
        warnForDeletedHydratableElement(parentInstance, instance);
      } else if (instance.nodeType === COMMENT_NODE) {
        // TODO: warnForDeletedHydratableSuspenseBoundary
      } else {
        warnForDeletedHydratableText(parentInstance, instance);
      }
    }
  }
}

export function didNotFindHydratableInstanceWithinContainer(
  parentContainer,
  type,
  props,
) {
  if (__DEV__) {
    warnForInsertedHydratedElement(parentContainer, type, props);
  }
}

export function didNotFindHydratableTextInstanceWithinContainer(
  parentContainer,
  text,
) {
  if (__DEV__) {
    warnForInsertedHydratedText(parentContainer, text);
  }
}

export function didNotFindHydratableSuspenseInstanceWithinContainer(
  parentContainer,
) {
  if (__DEV__) {
    // TODO: warnForInsertedHydratedSuspense(parentContainer);
  }
}

export function didNotFindHydratableInstanceWithinSuspenseInstance(
  parentInstance,
  type,
  props,
) {
  if (__DEV__) {
    // $FlowFixMe: Only Element or Document can be parent nodes.
    const parentNode = parentInstance.parentNode;
    if (parentNode !== null)
      warnForInsertedHydratedElement(parentNode, type, props);
  }
}

export function didNotFindHydratableTextInstanceWithinSuspenseInstance(
  parentInstance,
  text,
) {
  if (__DEV__) {
    // $FlowFixMe: Only Element or Document can be parent nodes.
    const parentNode = parentInstance.parentNode;
    if (parentNode !== null) warnForInsertedHydratedText(parentNode, text);
  }
}

export function didNotFindHydratableSuspenseInstanceWithinSuspenseInstance(
  parentInstance,
) {
  if (__DEV__) {
    // const parentNode: Element | Document | null = parentInstance.parentNode;
    // TODO: warnForInsertedHydratedSuspense(parentNode);
  }
}

export function didNotFindHydratableInstance(
  parentType,
  parentProps,
  parentInstance,
  type,
  props,
  isConcurrentMode,
) {
  if (__DEV__) {
    if (isConcurrentMode || parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
      warnForInsertedHydratedElement(parentInstance, type, props);
    }
  }
}

export function didNotFindHydratableTextInstance(
  parentType,
  parentProps,
  parentInstance,
  text,
  isConcurrentMode,
) {
  if (__DEV__) {
    if (isConcurrentMode || parentProps[SUPPRESS_HYDRATION_WARNING] !== true) {
      warnForInsertedHydratedText(parentInstance, text);
    }
  }
}

export function didNotFindHydratableSuspenseInstance(
  parentType,
  parentProps,
  parentInstance,
) {
  if (__DEV__) {
    // TODO: warnForInsertedHydratedSuspense(parentInstance);
  }
}

export function errorHydratingContainer(parentContainer) {
  if (__DEV__) {
    // TODO: This gets logged by onRecoverableError, too, so we should be
    // able to remove it.
    console.error(
      'An error occurred during hydration. The server HTML was replaced with client content in <%s>.',
      parentContainer.nodeName.toLowerCase(),
    );
  }
}

export function getInstanceFromNode(node) {
  return getClosestInstanceFromNode(node) || null;
}

export function preparePortalMount(portalInstance) {
  listenToAllSupportedEvents(portalInstance);
}

export function prepareScopeUpdate(scopeInstance, internalInstanceHandle) {
  if (enableScopeAPI) {
    precacheFiberNode(internalInstanceHandle, scopeInstance);
  }
}

export function getInstanceFromScope(scopeInstance) {
  if (enableScopeAPI) {
    return getFiberFromScopeInstance(scopeInstance);
  }
  return null;
}

export const supportsTestSelectors = true;

export function findFiberRoot(node) {
  const stack = [node];
  let index = 0;
  while (index < stack.length) {
    const current = stack[index++];
    if (isContainerMarkedAsRoot(current)) {
      return getInstanceFromNodeDOMTree(current);
    }
    stack.push(...current.children);
  }
  return null;
}

export function getBoundingRect(node) {
  const rect = node.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function matchAccessibilityRole(node, role) {
  if (hasRole(node, role)) {
    return true;
  }

  return false;
}

export function getTextContent(fiber) {
  switch (fiber.tag) {
    case HostComponent:
      let textContent = '';
      const childNodes = fiber.stateNode.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];
        if (childNode.nodeType === Node.TEXT_NODE) {
          textContent += childNode.textContent;
        }
      }
      return textContent;
    case HostText:
      return fiber.stateNode.textContent;
  }

  return null;
}

export function isHiddenSubtree(fiber) {
  return fiber.tag === HostComponent && fiber.memoizedProps.hidden === true;
}

export function setFocusIfFocusable(node) {
  // The logic for determining if an element is focusable is kind of complex,
  // and since we want to actually change focus anyway- we can just skip it.
  // Instead we'll just listen for a "focus" event to verify that focus was set.
  //
  // We could compare the node to document.activeElement after focus,
  // but this would not handle the case where application code managed focus to automatically blur.
  let didFocus = false;
  const handleFocus = () => {
    didFocus = true;
  };

  const element = node;
  try {
    element.addEventListener('focus', handleFocus);
    (element.focus || HTMLElement.prototype.focus).call(element);
  } finally {
    element.removeEventListener('focus', handleFocus);
  }

  return didFocus;
}

export function setupIntersectionObserver(targets, callback, options) {
  const rectRatioCache = new Map();
  targets.forEach((target) => {
    rectRatioCache.set(target, {
      rect: getBoundingRect(target),
      ratio: 0,
    });
  });

  const handleIntersection = (entries) => {
    entries.forEach((entry) => {
      const {boundingClientRect, intersectionRatio, target} = entry;
      rectRatioCache.set(target, {
        rect: {
          x: boundingClientRect.left,
          y: boundingClientRect.top,
          width: boundingClientRect.width,
          height: boundingClientRect.height,
        },
        ratio: intersectionRatio,
      });
    });

    callback(Array.from(rectRatioCache.values()));
  };

  const observer = new IntersectionObserver(handleIntersection, options);
  targets.forEach((target) => {
    observer.observe(target);
  });

  return {
    disconnect: () => observer.disconnect(),
    observe: (target) => {
      rectRatioCache.set(target, {
        rect: getBoundingRect(target),
        ratio: 0,
      });
      observer.observe(target);
    },
    unobserve: (target) => {
      rectRatioCache.delete(target);
      observer.unobserve(target);
    },
  };
}
