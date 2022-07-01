/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  ElementTypeClass,
  ElementTypeFunction,
  ElementTypeRoot,
  ElementTypeHostComponent,
  ElementTypeOtherOrUnknown,
} from 'react-devtools-shared/src/types';
import {getUID, utfEncodeString, printOperationsArray} from '../../utils';
import {
  cleanForBridge,
  copyToClipboard,
  copyWithDelete,
  copyWithRename,
  copyWithSet,
} from '../utils';
import {
  deletePathInObject,
  getDisplayName,
  getInObject,
  renamePathInObject,
  setInObject,
} from 'react-devtools-shared/src/utils';
import {
  __DEBUG__,
  TREE_OPERATION_ADD,
  TREE_OPERATION_REMOVE,
  TREE_OPERATION_REORDER_CHILDREN,
} from '../../constants';
import {decorateMany, forceUpdate, restoreMany} from './utils';

function getData(internalInstance) {
  let displayName = null;
  let key = null;

  // != used deliberately here to catch undefined and null
  if (internalInstance._currentElement != null) {
    if (internalInstance._currentElement.key) {
      key = String(internalInstance._currentElement.key);
    }

    const elementType = internalInstance._currentElement.type;
    if (typeof elementType === 'string') {
      displayName = elementType;
    } else if (typeof elementType === 'function') {
      displayName = getDisplayName(elementType);
    }
  }

  return {
    displayName,
    key,
  };
}

function getElementType(internalInstance) {
  // != used deliberately here to catch undefined and null
  if (internalInstance._currentElement != null) {
    const elementType = internalInstance._currentElement.type;
    if (typeof elementType === 'function') {
      const publicInstance = internalInstance.getPublicInstance();
      if (publicInstance !== null) {
        return ElementTypeClass;
      } else {
        return ElementTypeFunction;
      }
    } else if (typeof elementType === 'string') {
      return ElementTypeHostComponent;
    }
  }
  return ElementTypeOtherOrUnknown;
}

function getChildren(internalInstance) {
  const children = [];

  // If the parent is a native node without rendered children, but with
  // multiple string children, then the `element` that gets passed in here is
  // a plain value -- a string or number.
  if (typeof internalInstance !== 'object') {
    // No children
  } else if (
    internalInstance._currentElement === null ||
    internalInstance._currentElement === false
  ) {
    // No children
  } else if (internalInstance._renderedComponent) {
    const child = internalInstance._renderedComponent;
    if (getElementType(child) !== ElementTypeOtherOrUnknown) {
      children.push(child);
    }
  } else if (internalInstance._renderedChildren) {
    const renderedChildren = internalInstance._renderedChildren;
    for (const name in renderedChildren) {
      const child = renderedChildren[name];
      if (getElementType(child) !== ElementTypeOtherOrUnknown) {
        children.push(child);
      }
    }
  }
  // Note: we skip the case where children are just strings or numbers
  // because the new DevTools skips over host text nodes anyway.
  return children;
}

export function attach(hook, rendererID, renderer, global) {
  const idToInternalInstanceMap = new Map();
  const internalInstanceToIDMap = new WeakMap();
  const internalInstanceToRootIDMap = new WeakMap();

  let getInternalIDForNative = null;
  let findNativeNodeForInternalID;
  let getFiberForNative = (node) => {
    // Not implemented.
    return null;
  };

  if (renderer.ComponentTree) {
    getInternalIDForNative = (node, findNearestUnfilteredAncestor) => {
      const internalInstance =
        renderer.ComponentTree.getClosestInstanceFromNode(node);
      return internalInstanceToIDMap.get(internalInstance) || null;
    };
    findNativeNodeForInternalID = (id) => {
      const internalInstance = idToInternalInstanceMap.get(id);
      return renderer.ComponentTree.getNodeFromInstance(internalInstance);
    };
    getFiberForNative = (node) => {
      return renderer.ComponentTree.getClosestInstanceFromNode(node);
    };
  } else if (renderer.Mount.getID && renderer.Mount.getNode) {
    getInternalIDForNative = (node, findNearestUnfilteredAncestor) => {
      // Not implemented.
      return null;
    };
    findNativeNodeForInternalID = (id) => {
      // Not implemented.
      return null;
    };
  }

  function getDisplayNameForFiberID(id) {
    const internalInstance = idToInternalInstanceMap.get(id);
    return internalInstance ? getData(internalInstance).displayName : null;
  }

  function getID(internalInstance) {
    if (typeof internalInstance !== 'object' || internalInstance === null) {
      throw new Error('Invalid internal instance: ' + internalInstance);
    }
    if (!internalInstanceToIDMap.has(internalInstance)) {
      const id = getUID();
      internalInstanceToIDMap.set(internalInstance, id);
      idToInternalInstanceMap.set(id, internalInstance);
    }
    return internalInstanceToIDMap.get(internalInstance);
  }

  function areEqualArrays(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  // This is shared mutable state that lets us keep track of where we are.
  let parentIDStack = [];

  let oldReconcilerMethods = null;
  if (renderer.Reconciler) {
    // React 15
    oldReconcilerMethods = decorateMany(renderer.Reconciler, {
      mountComponent(fn, args) {
        const internalInstance = args[0];
        const hostContainerInfo = args[3];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          return fn.apply(this, args);
        }
        if (hostContainerInfo._topLevelWrapper === undefined) {
          // SSR
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        // Push the operation.
        const parentID =
          parentIDStack.length > 0
            ? parentIDStack[parentIDStack.length - 1]
            : 0;
        recordMount(internalInstance, id, parentID);
        parentIDStack.push(id);

        // Remember the root.
        internalInstanceToRootIDMap.set(
          internalInstance,
          getID(hostContainerInfo._topLevelWrapper),
        );

        try {
          const result = fn.apply(this, args);
          parentIDStack.pop();
          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
      performUpdateIfNecessary(fn, args) {
        const internalInstance = args[0];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        parentIDStack.push(id);

        const prevChildren = getChildren(internalInstance);
        try {
          const result = fn.apply(this, args);

          const nextChildren = getChildren(internalInstance);
          if (!areEqualArrays(prevChildren, nextChildren)) {
            // Push the operation
            recordReorder(internalInstance, id, nextChildren);
          }

          parentIDStack.pop();
          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
      receiveComponent(fn, args) {
        const internalInstance = args[0];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        parentIDStack.push(id);

        const prevChildren = getChildren(internalInstance);
        try {
          const result = fn.apply(this, args);

          const nextChildren = getChildren(internalInstance);
          if (!areEqualArrays(prevChildren, nextChildren)) {
            // Push the operation
            recordReorder(internalInstance, id, nextChildren);
          }

          parentIDStack.pop();
          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
      unmountComponent(fn, args) {
        const internalInstance = args[0];
        if (getElementType(internalInstance) === ElementTypeOtherOrUnknown) {
          return fn.apply(this, args);
        }

        const id = getID(internalInstance);
        parentIDStack.push(id);
        try {
          const result = fn.apply(this, args);
          parentIDStack.pop();

          // Push the operation.
          recordUnmount(internalInstance, id);

          return result;
        } catch (err) {
          parentIDStack = [];
          throw err;
        } finally {
          if (parentIDStack.length === 0) {
            const rootID = internalInstanceToRootIDMap.get(internalInstance);
            if (rootID === undefined) {
              throw new Error('Expected to find root ID.');
            }
            flushPendingEvents(rootID);
          }
        }
      },
    });
  }

  function cleanup() {
    if (oldReconcilerMethods !== null) {
      if (renderer.Component) {
        restoreMany(renderer.Component.Mixin, oldReconcilerMethods);
      } else {
        restoreMany(renderer.Reconciler, oldReconcilerMethods);
      }
    }
    oldReconcilerMethods = null;
  }

  function recordMount(internalInstance, id, parentID) {
    const isRoot = parentID === 0;

    if (__DEBUG__) {
      console.log(
        '%crecordMount()',
        'color: green; font-weight: bold;',
        id,
        getData(internalInstance).displayName,
      );
    }

    if (isRoot) {
      // TODO Is this right? For all versions?
      const hasOwnerMetadata =
        internalInstance._currentElement != null &&
        internalInstance._currentElement._owner != null;

      pushOperation(TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(ElementTypeRoot);
      pushOperation(0); // StrictMode compliant?
      pushOperation(0); // Profiling flag
      pushOperation(0); // StrictMode supported?
      pushOperation(hasOwnerMetadata ? 1 : 0);
    } else {
      const type = getElementType(internalInstance);
      const {displayName, key} = getData(internalInstance);

      const ownerID =
        internalInstance._currentElement != null &&
        internalInstance._currentElement._owner != null
          ? getID(internalInstance._currentElement._owner)
          : 0;

      const displayNameStringID = getStringID(displayName);
      const keyStringID = getStringID(key);
      pushOperation(TREE_OPERATION_ADD);
      pushOperation(id);
      pushOperation(type);
      pushOperation(parentID);
      pushOperation(ownerID);
      pushOperation(displayNameStringID);
      pushOperation(keyStringID);
    }
  }

  function recordReorder(internalInstance, id, nextChildren) {
    pushOperation(TREE_OPERATION_REORDER_CHILDREN);
    pushOperation(id);
    const nextChildIDs = nextChildren.map(getID);
    pushOperation(nextChildIDs.length);
    for (let i = 0; i < nextChildIDs.length; i++) {
      pushOperation(nextChildIDs[i]);
    }
  }

  function recordUnmount(internalInstance, id) {
    pendingUnmountedIDs.push(id);
    idToInternalInstanceMap.delete(id);
  }

  function crawlAndRecordInitialMounts(id, parentID, rootID) {
    if (__DEBUG__) {
      console.group('crawlAndRecordInitialMounts() id:', id);
    }

    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      internalInstanceToRootIDMap.set(internalInstance, rootID);
      recordMount(internalInstance, id, parentID);
      getChildren(internalInstance).forEach((child) =>
        crawlAndRecordInitialMounts(getID(child), id, rootID),
      );
    }

    if (__DEBUG__) {
      console.groupEnd();
    }
  }

  function flushInitialOperations() {
    // Crawl roots though and register any nodes that mounted before we were injected.

    const roots =
      renderer.Mount._instancesByReactRootID ||
      renderer.Mount._instancesByContainerID;

    for (const key in roots) {
      const internalInstance = roots[key];
      const id = getID(internalInstance);
      crawlAndRecordInitialMounts(id, 0, id);
      flushPendingEvents(id);
    }
  }

  const pendingOperations = [];
  const pendingStringTable = new Map();
  let pendingUnmountedIDs = [];
  let pendingStringTableLength = 0;
  let pendingUnmountedRootID = null;

  function flushPendingEvents(rootID) {
    if (
      pendingOperations.length === 0 &&
      pendingUnmountedIDs.length === 0 &&
      pendingUnmountedRootID === null
    ) {
      return;
    }

    const numUnmountIDs =
      pendingUnmountedIDs.length + (pendingUnmountedRootID === null ? 0 : 1);

    const operations = new Array(
      // Identify which renderer this update is coming from.
      2 + // [rendererID, rootFiberID]
        // How big is the string table?
        1 + // [stringTableLength]
        // Then goes the actual string table.
        pendingStringTableLength +
        // All unmounts are batched in a single message.
        // [TREE_OPERATION_REMOVE, removedIDLength, ...ids]
        (numUnmountIDs > 0 ? 2 + numUnmountIDs : 0) +
        // Mount operations
        pendingOperations.length,
    );

    // Identify which renderer this update is coming from.
    // This enables roots to be mapped to renderers,
    // Which in turn enables fiber properations, states, and hooks to be inspected.
    let i = 0;
    operations[i++] = rendererID;
    operations[i++] = rootID;

    // Now fill in the string table.
    // [stringTableLength, str1Length, ...str1, str2Length, ...str2, ...]
    operations[i++] = pendingStringTableLength;
    pendingStringTable.forEach((value, key) => {
      operations[i++] = key.length;
      const encodedKey = utfEncodeString(key);
      for (let j = 0; j < encodedKey.length; j++) {
        operations[i + j] = encodedKey[j];
      }
      i += key.length;
    });

    if (numUnmountIDs > 0) {
      // All unmounts except roots are batched in a single message.
      operations[i++] = TREE_OPERATION_REMOVE;
      // The first number is how many unmounted IDs we're gonna send.
      operations[i++] = numUnmountIDs;
      // Fill in the unmounts
      for (let j = 0; j < pendingUnmountedIDs.length; j++) {
        operations[i++] = pendingUnmountedIDs[j];
      }
      // The root ID should always be unmounted last.
      if (pendingUnmountedRootID !== null) {
        operations[i] = pendingUnmountedRootID;
        i++;
      }
    }

    // Fill in the rest of the operations.
    for (let j = 0; j < pendingOperations.length; j++) {
      operations[i + j] = pendingOperations[j];
    }
    i += pendingOperations.length;

    if (__DEBUG__) {
      printOperationsArray(operations);
    }

    // If we've already connected to the frontend, just pass the operations through.
    hook.emit('operations', operations);

    pendingOperations.length = 0;
    pendingUnmountedIDs = [];
    pendingUnmountedRootID = null;
    pendingStringTable.clear();
    pendingStringTableLength = 0;
  }

  function pushOperation(op) {
    if (__DEV__) {
      if (!Number.isInteger(op)) {
        console.error(
          'pushOperation() was called but the value is not an integer.',
          op,
        );
      }
    }
    pendingOperations.push(op);
  }

  function getStringID(str) {
    if (str === null) {
      return 0;
    }
    const existingID = pendingStringTable.get(str);
    if (existingID !== undefined) {
      return existingID;
    }
    const stringID = pendingStringTable.size + 1;
    pendingStringTable.set(str, stringID);
    // The string table total length needs to account
    // both for the string length, and for the array item
    // that contains the length itself. Hence + 1.
    pendingStringTableLength += str.length + 1;
    return stringID;
  }

  let currentlyInspectedElementID = null;
  let currentlyInspectedPaths = {};

  // Track the intersection of currently inspected paths,
  // so that we can send their data along if the element is re-rendered.
  function mergeInspectedPaths(path) {
    let current = currentlyInspectedPaths;
    path.forEach((key) => {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    });
  }

  function createIsPathAllowed(key) {
    // This function helps prevent previously-inspected paths from being dehydrated in updates.
    // This is important to avoid a bad user experience where expanded toggles collapse on update.
    return function isPathAllowed(path) {
      let current = currentlyInspectedPaths[key];
      if (!current) {
        return false;
      }
      for (let i = 0; i < path.length; i++) {
        current = current[path[i]];
        if (!current) {
          return false;
        }
      }
      return true;
    };
  }

  // Fast path props lookup for React Native style editor.
  function getInstanceAndStyle(id) {
    let instance = null;
    let style = null;

    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      instance = internalInstance._instance || null;

      const element = internalInstance._currentElement;
      if (element != null && element.props != null) {
        style = element.props.style || null;
      }
    }

    return {
      instance,
      style,
    };
  }

  function updateSelectedElement(id) {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance == null) {
      console.warn(`Could not find instance with id "${id}"`);
      return;
    }

    switch (getElementType(internalInstance)) {
      case ElementTypeClass:
        global.$r = internalInstance._instance;
        break;
      case ElementTypeFunction:
        const element = internalInstance._currentElement;
        if (element == null) {
          console.warn(`Could not find element with id "${id}"`);
          return;
        }

        global.$r = {
          props: element.props,
          type: element.type,
        };
        break;
      default:
        global.$r = null;
        break;
    }
  }

  function storeAsGlobal(id, path, count) {
    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement !== null) {
      const value = getInObject(inspectedElement, path);
      const key = `$reactTemp${count}`;

      window[key] = value;

      console.log(key);
      console.log(value);
    }
  }

  function copyElementPath(id, path) {
    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement !== null) {
      copyToClipboard(getInObject(inspectedElement, path));
    }
  }

  function inspectElement(requestID, id, path, forceFullData) {
    if (forceFullData || currentlyInspectedElementID !== id) {
      currentlyInspectedElementID = id;
      currentlyInspectedPaths = {};
    }

    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement === null) {
      return {
        id,
        responseID: requestID,
        type: 'not-found',
      };
    }

    if (path !== null) {
      mergeInspectedPaths(path);
    }

    // Any time an inspected element has an update,
    // we should update the selected $r value as wel.
    // Do this before dehydration (cleanForBridge).
    updateSelectedElement(id);

    inspectedElement.context = cleanForBridge(
      inspectedElement.context,
      createIsPathAllowed('context'),
    );
    inspectedElement.props = cleanForBridge(
      inspectedElement.props,
      createIsPathAllowed('props'),
    );
    inspectedElement.state = cleanForBridge(
      inspectedElement.state,
      createIsPathAllowed('state'),
    );

    return {
      id,
      responseID: requestID,
      type: 'full-data',
      value: inspectedElement,
    };
  }

  function inspectElementRaw(id) {
    const internalInstance = idToInternalInstanceMap.get(id);

    if (internalInstance == null) {
      return null;
    }

    const {displayName, key} = getData(internalInstance);
    const type = getElementType(internalInstance);

    let context = null;
    let owners = null;
    let props = null;
    let state = null;
    let source = null;

    const element = internalInstance._currentElement;
    if (element !== null) {
      props = element.props;
      source = element._source != null ? element._source : null;

      let owner = element._owner;
      if (owner) {
        owners = [];
        while (owner != null) {
          owners.push({
            displayName: getData(owner).displayName || 'Unknown',
            id: getID(owner),
            key: element.key,
            type: getElementType(owner),
          });
          if (owner._currentElement) {
            owner = owner._currentElement._owner;
          }
        }
      }
    }

    const publicInstance = internalInstance._instance;
    if (publicInstance != null) {
      context = publicInstance.context || null;
      state = publicInstance.state || null;
    }

    // Not implemented
    const errors = [];
    const warnings = [];

    return {
      id,

      // Does the current renderer support editable hooks and function props?
      canEditHooks: false,
      canEditFunctionProps: false,

      // Does the current renderer support advanced editing interface?
      canEditHooksAndDeletePaths: false,
      canEditHooksAndRenamePaths: false,
      canEditFunctionPropsDeletePaths: false,
      canEditFunctionPropsRenamePaths: false,

      // Toggle error boundary did not exist in legacy versions
      canToggleError: false,
      isErrored: false,
      targetErrorBoundaryID: null,

      // Suspense did not exist in legacy versions
      canToggleSuspense: false,

      // Can view component source location.
      canViewSource: type === ElementTypeClass || type === ElementTypeFunction,

      // Only legacy context exists in legacy versions.
      hasLegacyContext: true,

      displayName: displayName,

      type: type,

      key: key != null ? key : null,

      // Inspectable properties.
      context,
      hooks: null,
      props,
      state,
      errors,
      warnings,

      // List of owners
      owners,

      // Location of component in source code.
      source,

      rootType: null,
      rendererPackageName: null,
      rendererVersion: null,

      plugins: {
        stylex: null,
      },
    };
  }

  function logElementToConsole(id) {
    const result = inspectElementRaw(id);
    if (result === null) {
      console.warn(`Could not find element with id "${id}"`);
      return;
    }

    const supportsGroup = typeof console.groupCollapsed === 'function';
    if (supportsGroup) {
      console.groupCollapsed(
        `[Click to expand] %c<${result.displayName || 'Component'} />`,
        // --dom-tag-name-color is the CSS variable Chrome styles HTML elements with in the console.
        'color: var(--dom-tag-name-color); font-weight: normal;',
      );
    }
    if (result.props !== null) {
      console.log('Props:', result.props);
    }
    if (result.state !== null) {
      console.log('State:', result.state);
    }
    if (result.context !== null) {
      console.log('Context:', result.context);
    }
    const nativeNode = findNativeNodeForInternalID(id);
    if (nativeNode !== null) {
      console.log('Node:', nativeNode);
    }
    if (window.chrome || /firefox/i.test(navigator.userAgent)) {
      console.log(
        'Right-click any value to save it as a global variable for further inspection.',
      );
    }
    if (supportsGroup) {
      console.groupEnd();
    }
  }

  function prepareViewAttributeSource(id, path) {
    const inspectedElement = inspectElementRaw(id);
    if (inspectedElement !== null) {
      window.$attribute = getInObject(inspectedElement, path);
    }
  }

  function prepareViewElementSource(id) {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance == null) {
      console.warn(`Could not find instance with id "${id}"`);
      return;
    }

    const element = internalInstance._currentElement;
    if (element == null) {
      console.warn(`Could not find element with id "${id}"`);
      return;
    }

    global.$type = element.type;
  }

  function deletePath(type, id, hookID, path) {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      const publicInstance = internalInstance._instance;
      if (publicInstance != null) {
        switch (type) {
          case 'context':
            deletePathInObject(publicInstance.context, path);
            forceUpdate(publicInstance);
            break;
          case 'hooks':
            throw new Error('Hooks not supported by this renderer');
          case 'props':
            const element = internalInstance._currentElement;
            internalInstance._currentElement = {
              ...element,
              props: copyWithDelete(element.props, path),
            };
            forceUpdate(publicInstance);
            break;
          case 'state':
            deletePathInObject(publicInstance.state, path);
            forceUpdate(publicInstance);
            break;
        }
      }
    }
  }

  function renamePath(type, id, hookID, oldPath, newPath) {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      const publicInstance = internalInstance._instance;
      if (publicInstance != null) {
        switch (type) {
          case 'context':
            renamePathInObject(publicInstance.context, oldPath, newPath);
            forceUpdate(publicInstance);
            break;
          case 'hooks':
            throw new Error('Hooks not supported by this renderer');
          case 'props':
            const element = internalInstance._currentElement;
            internalInstance._currentElement = {
              ...element,
              props: copyWithRename(element.props, oldPath, newPath),
            };
            forceUpdate(publicInstance);
            break;
          case 'state':
            renamePathInObject(publicInstance.state, oldPath, newPath);
            forceUpdate(publicInstance);
            break;
        }
      }
    }
  }

  function overrideValueAtPath(type, id, hookID, path, value) {
    const internalInstance = idToInternalInstanceMap.get(id);
    if (internalInstance != null) {
      const publicInstance = internalInstance._instance;
      if (publicInstance != null) {
        switch (type) {
          case 'context':
            setInObject(publicInstance.context, path, value);
            forceUpdate(publicInstance);
            break;
          case 'hooks':
            throw new Error('Hooks not supported by this renderer');
          case 'props':
            const element = internalInstance._currentElement;
            internalInstance._currentElement = {
              ...element,
              props: copyWithSet(element.props, path, value),
            };
            forceUpdate(publicInstance);
            break;
          case 'state':
            setInObject(publicInstance.state, path, value);
            forceUpdate(publicInstance);
            break;
        }
      }
    }
  }

  // v16+ only features
  const getProfilingData = () => {
    throw new Error('getProfilingData not supported by this renderer');
  };
  const handleCommitFiberRoot = () => {
    throw new Error('handleCommitFiberRoot not supported by this renderer');
  };
  const handleCommitFiberUnmount = () => {
    throw new Error('handleCommitFiberUnmount not supported by this renderer');
  };
  const handlePostCommitFiberRoot = () => {
    throw new Error('handlePostCommitFiberRoot not supported by this renderer');
  };
  const overrideError = () => {
    throw new Error('overrideError not supported by this renderer');
  };
  const overrideSuspense = () => {
    throw new Error('overrideSuspense not supported by this renderer');
  };
  const startProfiling = () => {
    // Do not throw, since this would break a multi-root scenario where v15 and v16 were both present.
  };
  const stopProfiling = () => {
    // Do not throw, since this would break a multi-root scenario where v15 and v16 were both present.
  };

  function getBestMatchForTrackedPath() {
    // Not implemented.
    return null;
  }

  function getPathForElement(id) {
    // Not implemented.
    return null;
  }

  function updateComponentFilters(componentFilters) {
    // Not implemented.
  }

  function setTraceUpdatesEnabled(enabled) {
    // Not implemented.
  }

  function setTrackedPath(path) {
    // Not implemented.
  }

  function getOwnersList(id) {
    // Not implemented.
    return null;
  }

  function clearErrorsAndWarnings() {
    // Not implemented
  }

  function clearErrorsForFiberID(id) {
    // Not implemented
  }

  function clearWarningsForFiberID(id) {
    // Not implemented
  }

  function patchConsoleForStrictMode() {}

  function unpatchConsoleForStrictMode() {}

  return {
    clearErrorsAndWarnings,
    clearErrorsForFiberID,
    clearWarningsForFiberID,
    cleanup,
    copyElementPath,
    deletePath,
    flushInitialOperations,
    getBestMatchForTrackedPath,
    getDisplayNameForFiberID,
    getFiberForNative,
    getFiberIDForNative: getInternalIDForNative,
    getInstanceAndStyle,
    findNativeNodesForFiberID: (id) => {
      const nativeNode = findNativeNodeForInternalID(id);
      return nativeNode == null ? null : [nativeNode];
    },
    getOwnersList,
    getPathForElement,
    getProfilingData,
    handleCommitFiberRoot,
    handleCommitFiberUnmount,
    handlePostCommitFiberRoot,
    inspectElement,
    logElementToConsole,
    overrideError,
    overrideSuspense,
    overrideValueAtPath,
    renamePath,
    patchConsoleForStrictMode,
    prepareViewAttributeSource,
    prepareViewElementSource,
    renderer,
    setTraceUpdatesEnabled,
    setTrackedPath,
    startProfiling,
    stopProfiling,
    storeAsGlobal,
    unpatchConsoleForStrictMode,
    updateComponentFilters,
  };
}
