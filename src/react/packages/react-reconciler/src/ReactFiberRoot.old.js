/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {noTimeout, supportsHydration} from './ReactFiberHostConfig';
import {createHostRootFiber} from './ReactFiber.old';
import {
    NoLane,
    NoLanes,
    NoTimestamp,
    TotalLanes,
    createLaneMap,
} from './ReactFiberLane.old';
import {
    enableSuspenseCallback,
    enableCache,
    enableProfilerCommitHooks,
    enableProfilerTimer,
    enableUpdaterTracking,
    enableTransitionTracing,
} from 'shared/ReactFeatureFlags';
import {initializeUpdateQueue} from './ReactFiberClassUpdateQueue.old';
import {LegacyRoot, ConcurrentRoot} from './ReactRootTags';
import {createCache, retainCache} from './ReactFiberCacheComponent.old';

function FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError,
) {
    // 分为 ConcurrentRoot、LegacyRoot
    this.tag = tag;
    this.containerInfo = containerInfo;

    this.pendingChildren = null;
    // 根容器
    this.current = null;

    // 完成的根 fiber
    this.finishedWork = null;

    this.pingCache = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;

    this.callbackNode = null;
    this.callbackPriority = NoLane;

    this.eventTimes = createLaneMap(NoLanes);
    this.expirationTimes = createLaneMap(NoTimestamp);

    this.pendingLanes = NoLanes;
    this.expiredLanes = NoLanes;
    this.finishedLanes = NoLanes;

    this.suspendedLanes = NoLanes;
    this.pingedLanes = NoLanes;
    this.mutableReadLanes = NoLanes;

    this.entangledLanes = NoLanes;
    this.entanglements = createLaneMap(NoLanes);

    this.hiddenUpdates = createLaneMap(null);

    this.identifierPrefix = identifierPrefix;
    this.onRecoverableError = onRecoverableError;

    if (enableCache) {
        this.pooledCache = null;
        this.pooledCacheLanes = NoLanes;
    }

    if (supportsHydration) {
        this.mutableSourceEagerHydrationData = null;
    }

    if (enableSuspenseCallback) {
        this.hydrationCallbacks = null;
    }

    this.incompleteTransitions = new Map();

    if (enableTransitionTracing) {
        this.transitionCallbacks = null;
        const transitionLanesMap = (this.transitionLanes = []);
        for (let i = 0; i < TotalLanes; i++) {
            transitionLanesMap.push(null);
        }
    }

    if (enableProfilerTimer && enableProfilerCommitHooks) {
        this.effectDuration = 0;
        this.passiveEffectDuration = 0;
    }

    if (enableUpdaterTracking) {
        this.memoizedUpdaters = new Set();
        const pendingUpdatersLaneMap = (this.pendingUpdatersLaneMap = []);
        for (let i = 0; i < TotalLanes; i++) {
            pendingUpdatersLaneMap.push(new Set());
        }
    }
}

export function createFiberRoot(
    // 这两个用于创建 Fiber Root
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
) {
    // 创建 fiber root
    const root = new FiberRootNode(
        containerInfo,
        tag,
        hydrate,
        identifierPrefix,
        onRecoverableError,
    );

    // 创建根容器 fiber
    // Cyclic construction. This cheats the type system right now because
    // stateNode is any.
    const uninitializedFiber = createHostRootFiber(
        // 根据 tag 计算出 mode
        tag,
        isStrictMode,
        concurrentUpdatesByDefaultOverride,
    );

    // fiber root 和根容器关联起来
    root.current = uninitializedFiber;

    // 根 fiber stateNode 保存的是 fiber root
    uninitializedFiber.stateNode = root;

    // 根容器，初始化状态
    const initialState = {
        element: initialChildren,
        isDehydrated: hydrate,
        cache: null, // not enabled yet
    };

    uninitializedFiber.memoizedState = initialState;

    // 创建根容器的更新队列
    initializeUpdateQueue(uninitializedFiber);

    return root;
}
