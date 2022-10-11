/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
    findCurrentHostFiber,
    findCurrentHostFiberWithNoPortals,
} from './ReactFiberTreeReflection';
import {get as getInstance} from 'shared/ReactInstanceMap';
import {
    HostComponent,
    ClassComponent,
    HostRoot,
    SuspenseComponent,
} from './ReactWorkTags';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import isArray from 'shared/isArray';
import {enableSchedulingProfiler} from 'shared/ReactFeatureFlags';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import {getPublicInstance} from './ReactFiberHostConfig';
import {
    findCurrentUnmaskedContext,
    processChildContext,
    emptyContextObject,
    isContextProvider as isLegacyContextProvider,
} from './ReactFiberContext.old';
import {createFiberRoot} from './ReactFiberRoot.old';
import {isRootDehydrated} from './ReactFiberShellHydration';
import {
    injectInternals,
    markRenderScheduled,
    onScheduleRoot,
} from './ReactFiberDevToolsHook.old';
import {
    requestEventTime,
    requestUpdateLane,
    scheduleUpdateOnFiber,
    scheduleInitialHydrationOnRoot,
    flushRoot,
    batchedUpdates,
    flushSync,
    isAlreadyRendering,
    flushControlled,
    deferredUpdates,
    discreteUpdates,
    flushPassiveEffects,
} from './ReactFiberWorkLoop.old';
import {enqueueConcurrentRenderForLane} from './ReactFiberConcurrentUpdates.old';
import {
    createUpdate,
    enqueueUpdate,
    entangleTransitions, UpdateState,
} from './ReactFiberClassUpdateQueue.old';
import {
    isRendering as ReactCurrentFiberIsRendering,
    current as ReactCurrentFiberCurrent,
    resetCurrentFiber as resetCurrentDebugFiberInDEV,
    setCurrentFiber as setCurrentDebugFiberInDEV,
} from './ReactCurrentFiber';
import {StrictLegacyMode} from './ReactTypeOfMode';
import {
    SyncLane,
    SelectiveHydrationLane,
    NoTimestamp,
    getHighestPriorityPendingLanes,
    higherPriorityLane,
} from './ReactFiberLane.old';
import {
    getCurrentUpdatePriority,
    runWithPriority,
} from './ReactEventPriorities.old';
import {
    scheduleRefresh,
    scheduleRoot,
    setRefreshHandler,
    findHostInstancesForRefresh,
} from './ReactFiberHotReloading.old';
import ReactVersion from 'shared/ReactVersion';

export {registerMutableSourceForHydration} from './ReactMutableSource.old';
export {createPortal} from './ReactPortal';
export {
    createComponentSelector,
    createHasPseudoClassSelector,
    createRoleSelector,
    createTestNameSelector,
    createTextSelector,
    getFindAllNodesFailureDescription,
    findAllNodes,
    findBoundingRects,
    focusWithin,
    observeVisibleRects,
} from './ReactTestSelectors';

// 0 is PROD, 1 is DEV.
// Might add PROFILE later.

let didWarnAboutNestedUpdates;
let didWarnAboutFindNodeInStrictMode;

if (__DEV__) {
    didWarnAboutNestedUpdates = false;
    didWarnAboutFindNodeInStrictMode = {};
}

function getContextForSubtree(parentComponent) {
    if (!parentComponent) {
        return emptyContextObject;
    }

    const fiber = getInstance(parentComponent);
    const parentContext = findCurrentUnmaskedContext(fiber);

    if (fiber.tag === ClassComponent) {
        const Component = fiber.type;
        if (isLegacyContextProvider(Component)) {
            return processChildContext(fiber, Component, parentContext);
        }
    }

    return parentContext;
}

function findHostInstance(component) {
    const fiber = getInstance(component);
    if (fiber === undefined) {
        if (typeof component.render === 'function') {
            throw new Error('Unable to find node on an unmounted component.');
        } else {
            const keys = Object.keys(component).join(',');
            throw new Error(
                `Argument appears to not be a ReactComponent. Keys: ${keys}`,
            );
        }
    }
    const hostFiber = findCurrentHostFiber(fiber);
    if (hostFiber === null) {
        return null;
    }
    return hostFiber.stateNode;
}

function findHostInstanceWithWarning(component, methodName) {
    if (__DEV__) {
        const fiber = getInstance(component);
        if (fiber === undefined) {
            if (typeof component.render === 'function') {
                throw new Error('Unable to find node on an unmounted component.');
            } else {
                const keys = Object.keys(component).join(',');
                throw new Error(
                    `Argument appears to not be a ReactComponent. Keys: ${keys}`,
                );
            }
        }
        const hostFiber = findCurrentHostFiber(fiber);
        if (hostFiber === null) {
            return null;
        }
        if (hostFiber.mode & StrictLegacyMode) {
            const componentName = getComponentNameFromFiber(fiber) || 'Component';
            if (!didWarnAboutFindNodeInStrictMode[componentName]) {
                didWarnAboutFindNodeInStrictMode[componentName] = true;

                const previousFiber = ReactCurrentFiberCurrent;
                try {
                    setCurrentDebugFiberInDEV(hostFiber);
                    if (fiber.mode & StrictLegacyMode) {
                        console.error(
                            '%s is deprecated in StrictMode. ' +
                            '%s was passed an instance of %s which is inside StrictMode. ' +
                            'Instead, add a ref directly to the element you want to reference. ' +
                            'Learn more about using refs safely here: ' +
                            'https://reactjs.org/link/strict-mode-find-node',
                            methodName,
                            methodName,
                            componentName,
                        );
                    } else {
                        console.error(
                            '%s is deprecated in StrictMode. ' +
                            '%s was passed an instance of %s which renders StrictMode children. ' +
                            'Instead, add a ref directly to the element you want to reference. ' +
                            'Learn more about using refs safely here: ' +
                            'https://reactjs.org/link/strict-mode-find-node',
                            methodName,
                            methodName,
                            componentName,
                        );
                    }
                } finally {
                    // Ideally this should reset to previous but this shouldn't be called in
                    // render and there's another warning for that anyway.
                    if (previousFiber) {
                        setCurrentDebugFiberInDEV(previousFiber);
                    } else {
                        resetCurrentDebugFiberInDEV();
                    }
                }
            }
        }
        return hostFiber.stateNode;
    }
    return findHostInstance(component);
}

/**
 * 创建根容器
 */
export function createContainer(
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
) {
    const hydrate = false;
    const initialChildren = null;

    return createFiberRoot(
        //! 根元素
        containerInfo,

        //! 模式：Concurrent
        tag,

        // 是否是 ssr
        hydrate,

        // 初始化孩子
        initialChildren,

        // 为空
        hydrationCallbacks,

        // 严格模式
        isStrictMode,

        // 默认开启并发模式
        concurrentUpdatesByDefaultOverride,

        // 前缀
        identifierPrefix,

        // 回调函数
        onRecoverableError,

        // 过渡回调
        transitionCallbacks,
    );
}

export function createHydrationContainer(
    initialChildren,
    // TODO: Remove `callback` when we delete legacy mode.
    callback,
    containerInfo,
    tag,
    hydrationCallbacks,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks,
) {
    const hydrate = true;
    const root = createFiberRoot(
        containerInfo,
        tag,
        hydrate,
        initialChildren,
        hydrationCallbacks,
        isStrictMode,
        concurrentUpdatesByDefaultOverride,
        identifierPrefix,
        onRecoverableError,
        transitionCallbacks,
    );

    // TODO: Move this to FiberRoot constructor
    root.context = getContextForSubtree(null);

    // Schedule the initial render. In a hydration root, this is different from
    // a regular update because the initial render must match was was rendered
    // on the server.
    // NOTE: This update intentionally doesn't have a payload. We're only using
    // the update to schedule work on the root fiber (and, for legacy roots, to
    // enqueue the callback if one is provided).
    const current = root.current;
    const eventTime = requestEventTime();
    const lane = requestUpdateLane(current);
    const update = createUpdate(eventTime, lane);
    update.callback =
        callback !== undefined && callback !== null ? callback : null;
    enqueueUpdate(current, update, lane);
    scheduleInitialHydrationOnRoot(root, lane, eventTime);

    return root;
}

/**
 *
 * @param element 渲染的内容
 * @param container fiber root
 */
export function updateContainer(element, container, parentComponent, callback) {
    const current = container.current;

    // 1. 获取执行时间戳
    const eventTime = requestEventTime();

    // 2. 获取车道优先级
    const lane = requestUpdateLane(current);

    // 3. 为子树获取上下文
    const context = getContextForSubtree(parentComponent);
    if (container.context === null) {
        container.context = context;
    } else {
        container.pendingContext = context;
    }


    // 4. 创建更新任务
    //  { eventTime, lane, payload, callback, tag, next }
    const update = createUpdate(eventTime, lane);

    // 根容器 fiber 的 payload 是 element, 比较特殊
    // being called "element".
    update.payload = {element};

    callback = callback === undefined ? null : callback;
    if (callback !== null) {
        update.callback = callback;
    }

    // 5. 加入更新队列
    const root = enqueueUpdate(current, update, lane);

    if (root !== null) {
        // 6. 存在 fiber root，调度更新
        scheduleUpdateOnFiber(root, current, lane, eventTime);
        entangleTransitions(root, current, lane);
    }

    // 7. 返回该车道
    return lane;
}

export {
    batchedUpdates,
    deferredUpdates,
    discreteUpdates,
    flushControlled,
    flushSync,
    isAlreadyRendering,
    flushPassiveEffects,
};

export function getPublicRootInstance(container) {
    const containerFiber = container.current;
    if (!containerFiber.child) {
        return null;
    }
    switch (containerFiber.child.tag) {
        case HostComponent:
            return getPublicInstance(containerFiber.child.stateNode);
        default:
            return containerFiber.child.stateNode;
    }
}

export function attemptSynchronousHydration(fiber) {
    switch (fiber.tag) {
        case HostRoot: {
            const root = fiber.stateNode;
            if (isRootDehydrated(root)) {
                // Flush the first scheduled "update".
                const lanes = getHighestPriorityPendingLanes(root);
                flushRoot(root, lanes);
            }
            break;
        }
        case SuspenseComponent: {
            flushSync(() => {
                const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
                if (root !== null) {
                    const eventTime = requestEventTime();
                    scheduleUpdateOnFiber(root, fiber, SyncLane, eventTime);
                }
            });
            // If we're still blocked after this, we need to increase
            // the priority of any promises resolving within this
            // boundary so that they next attempt also has higher pri.
            const retryLane = SyncLane;
            markRetryLaneIfNotHydrated(fiber, retryLane);
            break;
        }
    }
}

function markRetryLaneImpl(fiber, retryLane) {
    const suspenseState = fiber.memoizedState;
    if (suspenseState !== null && suspenseState.dehydrated !== null) {
        suspenseState.retryLane = higherPriorityLane(
            suspenseState.retryLane,
            retryLane,
        );
    }
}

// Increases the priority of thenables when they resolve within this boundary.
function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    const alternate = fiber.alternate;
    if (alternate) {
        markRetryLaneImpl(alternate, retryLane);
    }
}

export function attemptDiscreteHydration(fiber) {
    if (fiber.tag !== SuspenseComponent) {
        // We ignore HostRoots here because we can't increase
        // their priority and they should not suspend on I/O,
        // since you have to wrap anything that might suspend in
        // Suspense.
        return;
    }
    const lane = SyncLane;
    const root = enqueueConcurrentRenderForLane(fiber, lane);
    if (root !== null) {
        const eventTime = requestEventTime();
        scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    }
    markRetryLaneIfNotHydrated(fiber, lane);
}

export function attemptContinuousHydration(fiber) {
    if (fiber.tag !== SuspenseComponent) {
        // We ignore HostRoots here because we can't increase
        // their priority and they should not suspend on I/O,
        // since you have to wrap anything that might suspend in
        // Suspense.
        return;
    }
    const lane = SelectiveHydrationLane;
    const root = enqueueConcurrentRenderForLane(fiber, lane);
    if (root !== null) {
        const eventTime = requestEventTime();
        scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    }
    markRetryLaneIfNotHydrated(fiber, lane);
}

export function attemptHydrationAtCurrentPriority(fiber) {
    if (fiber.tag !== SuspenseComponent) {
        // We ignore HostRoots here because we can't increase
        // their priority other than synchronously flush it.
        return;
    }
    const lane = requestUpdateLane(fiber);
    const root = enqueueConcurrentRenderForLane(fiber, lane);
    if (root !== null) {
        const eventTime = requestEventTime();
        scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    }
    markRetryLaneIfNotHydrated(fiber, lane);
}

export {getCurrentUpdatePriority, runWithPriority};

export {findHostInstance};

export {findHostInstanceWithWarning};

export function findHostInstanceWithNoPortals(fiber) {
    const hostFiber = findCurrentHostFiberWithNoPortals(fiber);
    if (hostFiber === null) {
        return null;
    }
    return hostFiber.stateNode;
}

let shouldErrorImpl = (fiber) => null;

export function shouldError(fiber) {
    return shouldErrorImpl(fiber);
}

let shouldSuspendImpl = (fiber) => false;

export function shouldSuspend(fiber) {
    return shouldSuspendImpl(fiber);
}

let overrideHookState = null;
let overrideHookStateDeletePath = null;
let overrideHookStateRenamePath = null;
let overrideProps = null;
let overridePropsDeletePath = null;
let overridePropsRenamePath = null;
let scheduleUpdate = null;
let setErrorHandler = null;
let setSuspenseHandler = null;

if (__DEV__) {
    const copyWithDeleteImpl = (obj, path, index) => {
        const key = path[index];
        const updated = isArray(obj) ? obj.slice() : {...obj};
        if (index + 1 === path.length) {
            if (isArray(updated)) {
                updated.splice(key, 1);
            } else {
                delete updated[key];
            }
            return updated;
        }
        // $FlowFixMe number or string is fine here
        updated[key] = copyWithDeleteImpl(obj[key], path, index + 1);
        return updated;
    };

    const copyWithDelete = (obj, path) => {
        return copyWithDeleteImpl(obj, path, 0);
    };

    const copyWithRenameImpl = (obj, oldPath, newPath, index) => {
        const oldKey = oldPath[index];
        const updated = isArray(obj) ? obj.slice() : {...obj};
        if (index + 1 === oldPath.length) {
            const newKey = newPath[index];
            // $FlowFixMe number or string is fine here
            updated[newKey] = updated[oldKey];
            if (isArray(updated)) {
                updated.splice(oldKey, 1);
            } else {
                delete updated[oldKey];
            }
        } else {
            // $FlowFixMe number or string is fine here
            updated[oldKey] = copyWithRenameImpl(
                // $FlowFixMe number or string is fine here
                obj[oldKey],
                oldPath,
                newPath,
                index + 1,
            );
        }
        return updated;
    };

    const copyWithRename = (obj, oldPath, newPath) => {
        if (oldPath.length !== newPath.length) {
            console.warn('copyWithRename() expects paths of the same length');
            return;
        } else {
            for (let i = 0; i < newPath.length - 1; i++) {
                if (oldPath[i] !== newPath[i]) {
                    console.warn(
                        'copyWithRename() expects paths to be the same except for the deepest key',
                    );
                    return;
                }
            }
        }
        return copyWithRenameImpl(obj, oldPath, newPath, 0);
    };

    const copyWithSetImpl = (obj, path, index, value) => {
        if (index >= path.length) {
            return value;
        }
        const key = path[index];
        const updated = isArray(obj) ? obj.slice() : {...obj};
        // $FlowFixMe number or string is fine here
        updated[key] = copyWithSetImpl(obj[key], path, index + 1, value);
        return updated;
    };

    const copyWithSet = (obj, path, value) => {
        return copyWithSetImpl(obj, path, 0, value);
    };

    const findHook = (fiber, id) => {
        // For now, the "id" of stateful hooks is just the stateful hook index.
        // This may change in the future with e.g. nested hooks.
        let currentHook = fiber.memoizedState;
        while (currentHook !== null && id > 0) {
            currentHook = currentHook.next;
            id--;
        }
        return currentHook;
    };

    // Support DevTools editable values for useState and useReducer.
    overrideHookState = (fiber, id, path, value) => {
        const hook = findHook(fiber, id);
        if (hook !== null) {
            const newState = copyWithSet(hook.memoizedState, path, value);
            hook.memoizedState = newState;
            hook.baseState = newState;

            // We aren't actually adding an update to the queue,
            // because there is no update we can add for useReducer hooks that won't trigger an error.
            // (There's no appropriate action type for DevTools overrides.)
            // As a result though, React will see the scheduled update as a noop and bailout.
            // Shallow cloning props works as a workaround for now to bypass the bailout check.
            fiber.memoizedProps = {...fiber.memoizedProps};

            const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
            if (root !== null) {
                scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
            }
        }
    };
    overrideHookStateDeletePath = (fiber, id, path) => {
        const hook = findHook(fiber, id);
        if (hook !== null) {
            const newState = copyWithDelete(hook.memoizedState, path);
            hook.memoizedState = newState;
            hook.baseState = newState;

            // We aren't actually adding an update to the queue,
            // because there is no update we can add for useReducer hooks that won't trigger an error.
            // (There's no appropriate action type for DevTools overrides.)
            // As a result though, React will see the scheduled update as a noop and bailout.
            // Shallow cloning props works as a workaround for now to bypass the bailout check.
            fiber.memoizedProps = {...fiber.memoizedProps};

            const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
            if (root !== null) {
                scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
            }
        }
    };
    overrideHookStateRenamePath = (fiber, id, oldPath, newPath) => {
        const hook = findHook(fiber, id);
        if (hook !== null) {
            const newState = copyWithRename(hook.memoizedState, oldPath, newPath);
            hook.memoizedState = newState;
            hook.baseState = newState;

            // We aren't actually adding an update to the queue,
            // because there is no update we can add for useReducer hooks that won't trigger an error.
            // (There's no appropriate action type for DevTools overrides.)
            // As a result though, React will see the scheduled update as a noop and bailout.
            // Shallow cloning props works as a workaround for now to bypass the bailout check.
            fiber.memoizedProps = {...fiber.memoizedProps};

            const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
            if (root !== null) {
                scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
            }
        }
    };

    // Support DevTools props for function components, forwardRef, memo, host components, etc.
    overrideProps = (fiber, path, value) => {
        fiber.pendingProps = copyWithSet(fiber.memoizedProps, path, value);
        if (fiber.alternate) {
            fiber.alternate.pendingProps = fiber.pendingProps;
        }
        const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
        if (root !== null) {
            scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
        }
    };
    overridePropsDeletePath = (fiber, path) => {
        fiber.pendingProps = copyWithDelete(fiber.memoizedProps, path);
        if (fiber.alternate) {
            fiber.alternate.pendingProps = fiber.pendingProps;
        }
        const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
        if (root !== null) {
            scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
        }
    };
    overridePropsRenamePath = (fiber, oldPath, newPath) => {
        fiber.pendingProps = copyWithRename(fiber.memoizedProps, oldPath, newPath);
        if (fiber.alternate) {
            fiber.alternate.pendingProps = fiber.pendingProps;
        }
        const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
        if (root !== null) {
            scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
        }
    };

    scheduleUpdate = (fiber) => {
        const root = enqueueConcurrentRenderForLane(fiber, SyncLane);
        if (root !== null) {
            scheduleUpdateOnFiber(root, fiber, SyncLane, NoTimestamp);
        }
    };

    setErrorHandler = (newShouldErrorImpl) => {
        shouldErrorImpl = newShouldErrorImpl;
    };

    setSuspenseHandler = (newShouldSuspendImpl) => {
        shouldSuspendImpl = newShouldSuspendImpl;
    };
}

function findHostInstanceByFiber(fiber) {
    const hostFiber = findCurrentHostFiber(fiber);
    if (hostFiber === null) {
        return null;
    }
    return hostFiber.stateNode;
}

function emptyFindFiberByHostInstance(instance) {
    return null;
}

function getCurrentFiberForDevTools() {
    return ReactCurrentFiberCurrent;
}

export function injectIntoDevTools(devToolsConfig) {
    const {findFiberByHostInstance} = devToolsConfig;
    const {ReactCurrentDispatcher} = ReactSharedInternals;

    return injectInternals({
        bundleType: devToolsConfig.bundleType,
        version: devToolsConfig.version,
        rendererPackageName: devToolsConfig.rendererPackageName,
        rendererConfig: devToolsConfig.rendererConfig,
        overrideHookState,
        overrideHookStateDeletePath,
        overrideHookStateRenamePath,
        overrideProps,
        overridePropsDeletePath,
        overridePropsRenamePath,
        setErrorHandler,
        setSuspenseHandler,
        scheduleUpdate,
        currentDispatcherRef: ReactCurrentDispatcher,
        findHostInstanceByFiber,
        findFiberByHostInstance:
            findFiberByHostInstance || emptyFindFiberByHostInstance,
        // React Refresh
        findHostInstancesForRefresh: __DEV__ ? findHostInstancesForRefresh : null,
        scheduleRefresh: __DEV__ ? scheduleRefresh : null,
        scheduleRoot: __DEV__ ? scheduleRoot : null,
        setRefreshHandler: __DEV__ ? setRefreshHandler : null,
        // Enables DevTools to append owner stacks to error messages in DEV mode.
        getCurrentFiber: __DEV__ ? getCurrentFiberForDevTools : null,
        // Enables DevTools to detect reconciler version rather than renderer version
        // which may not match for third party renderers.
        reconcilerVersion: ReactVersion,
    });
}
