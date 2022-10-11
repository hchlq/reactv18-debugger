/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
    NoLane,
    SyncLane,
    InputContinuousLane,
    DefaultLane,
    IdleLane,
    getHighestPriorityLane,
    includesNonIdleWork,
} from './ReactFiberLane.old';

export const DiscreteEventPriority = SyncLane;
export const ContinuousEventPriority = InputContinuousLane;
export const DefaultEventPriority = DefaultLane;
export const IdleEventPriority = IdleLane;

let currentUpdatePriority = NoLane;

export function getCurrentUpdatePriority() {
    return currentUpdatePriority;
}

export function setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
}

export function runWithPriority(priority, fn) {
    const previousPriority = currentUpdatePriority;
    try {
        currentUpdatePriority = priority;
        return fn();
    } finally {
        currentUpdatePriority = previousPriority;
    }
}

export function higherEventPriority(a, b) {
    return a !== 0 && a < b ? a : b;
}

export function lowerEventPriority(a, b) {
    return a === 0 || a > b ? a : b;
}

export function isHigherEventPriority(a, b) {
    return a !== 0 && a < b;
}

/**
 * 车道转为事件优先级
 */
export function lanesToEventPriority(lanes) {
    const lane = getHighestPriorityLane(lanes);
    // lane <= DiscreteEventPriority
    if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
        // lane 的优先级高
        return DiscreteEventPriority;
    }

    // lane <= ContinuousEventPriority
    if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
        // lane 的优先级高
        return ContinuousEventPriority;
    }


    // 包含没有 idle 的车道，返回 Default
    if (includesNonIdleWork(lane)) {
        return DefaultEventPriority;
    }
    return IdleEventPriority;
}
