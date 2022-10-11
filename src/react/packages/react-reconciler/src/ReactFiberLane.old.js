/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// TODO: Ideally these types would be opaque but that doesn't work well with
// our reconciler fork infra, since these leak into non-reconciler packages.

import {
    enableSchedulingProfiler,
    enableUpdaterTracking,
    allowConcurrentByDefault,
    enableTransitionTracing,
} from 'shared/ReactFeatureFlags';
import {isDevToolsPresent} from './ReactFiberDevToolsHook.old';
import {ConcurrentUpdatesByDefaultMode, NoMode} from './ReactTypeOfMode';
import {clz32} from './clz32';

// Lane values below should be kept in sync with getLabelForLane(), used by react-devtools-timeline.
// If those values are changed that package should be rebuilt and redeployed.

export const TotalLanes = 31;

export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane = /*                */ 0b0000000000000000000000000100000;
const TransitionLanes = /*                       */ 0b0000000001111111111111111000000;
const TransitionLane1 = /*                        */ 0b0000000000000000000000001000000;
const TransitionLane2 = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane3 = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane4 = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane5 = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane6 = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane7 = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane8 = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane9 = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane10 = /*                       */ 0b0000000000000001000000000000000;
const TransitionLane11 = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane12 = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane13 = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane14 = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane15 = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane16 = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes = /*                            */ 0b0000111110000000000000000000000;
const RetryLane1 = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2 = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3 = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4 = /*                             */ 0b0000010000000000000000000000000;
const RetryLane5 = /*                             */ 0b0000100000000000000000000000000;

export const SomeRetryLane = RetryLane1;

export const SelectiveHydrationLane = /*          */ 0b0001000000000000000000000000000;

const NonIdleLanes = /*                          */ 0b0001111111111111111111111111111;

export const IdleHydrationLane = /*               */ 0b0010000000000000000000000000000;
export const IdleLane = /*                        */ 0b0100000000000000000000000000000;

export const OffscreenLane = /*                   */ 0b1000000000000000000000000000000;

// This function is used for the experimental timeline (react-devtools-timeline)
// It should be kept in sync with the Lanes values above.
export function getLabelForLane(lane) {
    if (enableSchedulingProfiler) {
        if (lane & SyncLane) {
            return 'Sync';
        }
        if (lane & InputContinuousHydrationLane) {
            return 'InputContinuousHydration';
        }
        if (lane & InputContinuousLane) {
            return 'InputContinuous';
        }
        if (lane & DefaultHydrationLane) {
            return 'DefaultHydration';
        }
        if (lane & DefaultLane) {
            return 'Default';
        }
        if (lane & TransitionHydrationLane) {
            return 'TransitionHydration';
        }
        if (lane & TransitionLanes) {
            return 'Transition';
        }
        if (lane & RetryLanes) {
            return 'Retry';
        }
        if (lane & SelectiveHydrationLane) {
            return 'SelectiveHydration';
        }
        if (lane & IdleHydrationLane) {
            return 'IdleHydration';
        }
        if (lane & IdleLane) {
            return 'Idle';
        }
        if (lane & OffscreenLane) {
            return 'Offscreen';
        }
    }
}

export const NoTimestamp = -1;

let nextTransitionLane = TransitionLane1;
let nextRetryLane = RetryLane1;

function getHighestPriorityLanes(lanes) {
    // 从 lanes 中获取优先级最高的车道
    switch (getHighestPriorityLane(lanes)) {
        case SyncLane:
            return SyncLane;
        case InputContinuousLane:
            return InputContinuousLane;
        case DefaultLane:
            return DefaultLane;
        case TransitionLane1:
        case TransitionLane2:
        case TransitionLane3:
        case TransitionLane4:
        case TransitionLane5:
        case TransitionLane6:
        case TransitionLane7:
        case TransitionLane8:
        case TransitionLane9:
        case TransitionLane10:
        case TransitionLane11:
        case TransitionLane12:
        case TransitionLane13:
        case TransitionLane14:
        case TransitionLane15:
        case TransitionLane16:
            return lanes & TransitionLanes;
        case RetryLane1:
        case RetryLane2:
        case RetryLane3:
        case RetryLane4:
        case RetryLane5:
            return lanes & RetryLanes;
        case IdleLane:
            return IdleLane;
        case OffscreenLane:
            return OffscreenLane;
        default:
            // This shouldn't be reachable, but as a fallback, return the entire bitmask.
            return lanes;
    }
}

/**
 * 获取本次更新的车道
 * 可能包含多个车道，即多个批次
 */
export function getNextLanes(root, wipLanes) {
    // Early bailout if there's no pending work left.
    // 判断有没有更新的任务，如果没有，直接返回空
    const pendingLanes = root.pendingLanes;
    if (pendingLanes === NoLanes) {
        return NoLanes;
    }

    let nextLanes = NoLanes;

    const suspendedLanes = root.suspendedLanes;
    const pingedLanes = root.pingedLanes;

    //! 1. 选取优先级最高的车道
    // 优先处理非 idle 的任务
    // Do not work on any idle work until all the non-idle work has finished,
    // even if the work is suspended.
    const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
    if (nonIdlePendingLanes !== NoLanes) {
        // 非 idle 的任务
        const nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
        if (nonIdleUnblockedLanes !== NoLanes) {
            // 获取优先级最高的车道
            nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes);
        } else {
            // 只剩下了 suspendedLanes
            const nonIdlePingedLanes = nonIdlePendingLanes & pingedLanes;
            if (nonIdlePingedLanes !== NoLanes) {
                nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
            }
        }
    } else {
        // 只剩下了 idle 任务
        // The only remaining work is Idle.
        const unblockedLanes = pendingLanes & ~suspendedLanes;
        if (unblockedLanes !== NoLanes) {
            // 获取优先级最高的车道
            nextLanes = getHighestPriorityLanes(unblockedLanes);
        } else {
            // 只剩下了 suspendedLanes
            if (pingedLanes !== NoLanes) {
                nextLanes = getHighestPriorityLanes(pingedLanes);
            }
        }
    }

    // 没有要更新的车道
    if (nextLanes === NoLanes) {
        // This should only be reachable if we're suspended
        // 只有在 suspense 的情况下才会出现
        return NoLanes;
    }

    //! 2. 处理在渲染中更新
    // If we're already in the middle of a render, switching lanes will interrupt
    // it and we'll lose our progress. We should only do this if the new lanes are
    // higher priority.
    if (
        wipLanes !== NoLanes &&
        wipLanes !== nextLanes &&
        // If we already suspended with a delay, then interrupting is fine. Don't
        // bother waiting until the root is complete.
        // 只处理不带 suspendedLanes 的 wipLanes
        (wipLanes & suspendedLanes) === NoLanes
    ) {
        const nextLane = getHighestPriorityLane(nextLanes);
        const wipLane = getHighestPriorityLane(wipLanes);
        if (
            // Tests whether the next lane is equal or lower priority than the wip
            // one. This works because the bits decrease in priority as you go left.
            // wipLane 优先级大于等于 nextLane
            nextLane >= wipLane ||
            // Default priority updates should not interrupt transition updates. The
            // only difference between default updates and transition updates is that
            // default updates do not support refresh transitions.

            // wipLane 比 nextLane 优先级低， 但是 nextLanes 是 DefaultLane 并且 wipLane 是 transition
            // 因为 DefaultLane 不应该阻断 TransitionLane
            (nextLane === DefaultLane && (wipLane & TransitionLanes) !== NoLanes)
        ) {
            // Keep working on the existing in-progress tree. Do not interrupt.
            // nextLane 不阻断正在更新的任务
            return wipLanes;
        }
    }

    // 到这的结论：
    // 1. 没有 wipLane
    // 2. wipLane 比 nextLane 的优先级低 并且 (nextLane 不是 DefaultLane 或者 wipLane 不是 Transition)

    //! 3. 处理纠缠的 InputContinuous 和 Default 车道
    if ((nextLanes & InputContinuousLane) !== NoLanes) {
        // When updates are sync by default, we entangle continuous priority updates
        // and default updates, so they render in the same batch. The only reason
        // they use separate lanes is because continuous updates should interrupt
        // transitions, but default updates should not.

        // 本次更新是 InputContinuous, 将 DefaultLane 和其放到同一批次中更新
        // InputContinuous 和 Default 使用单独车道的原因是 InputContinuous 会中断 Transition, 但是 Default 不会
        nextLanes |= pendingLanes & DefaultLane;
    }

    //! 4. 检查包含本次更新的纠缠的车道，加入到更新批次中
    // Check for entangled lanes and add them to the batch.
    //
    // 当不允许渲染时，称一条车道与另一条车道纠缠在不包括其他车道的批次中。
    // 通常我们这样做，当多个更新具有相同的源时，我们只想响应来自该来源的最新事件。
    //
    // A lane is said to be entangled with another when it's not allowed to render
    // in a batch that does not also include the other lane. Typically we do this
    // when multiple updates have the same source, and we only want to respond to
    // the most recent event from that source.
    //
    // Note that we apply entanglements *after* checking for partial work above.
    // This means that if a lane is entangled during an interleaved event while
    // it's already rendering, we won't interrupt it. This is intentional, since
    // entanglement is usually "best effort": we'll try our best to render the
    // lanes in the same batch, but it's not worth throwing out partially
    // completed work in order to do it.
    // TODO: Reconsider this. The counter-argument is that the partial work
    // represents an intermediate state, which we don't want to show to the user.
    // And by spending extra time finishing it, we're increasing the amount of
    // time it takes to show the final state, which is what they are actually
    // waiting for.
    //
    // For those exceptions where entanglement is semantically important, like
    // useMutableSource, we should ensure that there is no partial work at the
    // time we apply the entanglement.
    const entangledLanes = root.entangledLanes;
    if (entangledLanes !== NoLanes) {
        const entanglements = root.entanglements;
        // 包含在本次更新的所有的纠缠车道
        let lanes = nextLanes & entangledLanes;
        while (lanes > 0) {
            const index = pickArbitraryLaneIndex(lanes);
            const lane = 1 << index;

            // 合并该索引处所有纠缠的车道
            nextLanes |= entanglements[index];

            lanes &= ~lane;
        }
    }

    return nextLanes;
}

export function getMostRecentEventTime(root, lanes) {
    const eventTimes = root.eventTimes;

    let mostRecentEventTime = NoTimestamp;
    while (lanes > 0) {
        const index = pickArbitraryLaneIndex(lanes);
        const lane = 1 << index;

        const eventTime = eventTimes[index];
        if (eventTime > mostRecentEventTime) {
            mostRecentEventTime = eventTime;
        }

        lanes &= ~lane;
    }

    return mostRecentEventTime;
}

/**
 * 计算过期的时间
 * 优先级越高，过期时间越快
 */
function computeExpirationTime(lane, currentTime) {
    switch (lane) {
        case SyncLane:
        case InputContinuousHydrationLane:
        case InputContinuousLane:
            // User interactions should expire slightly more quickly.
            //
            // NOTE: This is set to the corresponding constant as in Scheduler.js.
            // When we made it larger, a product metric in www regressed, suggesting
            // there's a user interaction that's being starved by a series of
            // synchronous updates. If that theory is correct, the proper solution is
            // to fix the starvation. However, this scenario supports the idea that
            // expiration times are an important safeguard when starvation
            // does happen.
            return currentTime + 250;
        case DefaultHydrationLane:
        case DefaultLane:
        case TransitionHydrationLane:
        case TransitionLane1:
        case TransitionLane2:
        case TransitionLane3:
        case TransitionLane4:
        case TransitionLane5:
        case TransitionLane6:
        case TransitionLane7:
        case TransitionLane8:
        case TransitionLane9:
        case TransitionLane10:
        case TransitionLane11:
        case TransitionLane12:
        case TransitionLane13:
        case TransitionLane14:
        case TransitionLane15:
        case TransitionLane16:
            return currentTime + 5000;
        case RetryLane1:
        case RetryLane2:
        case RetryLane3:
        case RetryLane4:
        case RetryLane5:
            // TODO: Retries should be allowed to expire if they are CPU bound for
            // too long, but when I made this change it caused a spike in browser
            // crashes. There must be some other underlying bug; not super urgent but
            // ideally should figure out why and fix it. Unfortunately we don't have
            // a repro for the crashes, only detected via production metrics.
            return NoTimestamp;
        case SelectiveHydrationLane:
        case IdleHydrationLane:
        case IdleLane:
        case OffscreenLane:
            // Anything idle priority or lower should never expire.
            return NoTimestamp;
        default:
            return NoTimestamp;
    }
}

export function markStarvedLanesAsExpired(root, currentTime) {
    // TODO: This gets called every time we yield. We can optimize by storing
    // the earliest expiration time on the root. Then use that to quickly bail out
    // of this function.

    const pendingLanes = root.pendingLanes;
    const suspendedLanes = root.suspendedLanes;
    const pingedLanes = root.pingedLanes;
    const expirationTimes = root.expirationTimes;

    // Iterate through the pending lanes and check if we've reached their
    // expiration time. If so, we'll assume the update is being starved and mark
    // it as expired to force it to finish.
    // 处理所有待更新的任务（有 1 说明有任务）
    let lanes = pendingLanes;
    while (lanes > 0) {
        // 获取优先级最高的车道车道索引 e.g. 0001110 -> 1
        const index = pickArbitraryLaneIndex(lanes);

        // 获取该车道的值 e.g. 1 << 1 = 0010
        const lane = 1 << index;

        // 获取该车道对应的过期时间
        const expirationTime = expirationTimes[index];

        if (expirationTime === NoTimestamp) {
            // 该车道没有过期时间，说明是新的待更新任务

            // Found a pending lane with no expiration time. If it's not suspended, or
            // if it's pinged, assume it's CPU-bound. Compute a new expiration time
            // using the current time.
            if (
                (lane & suspendedLanes) === NoLanes ||
                (lane & pingedLanes) !== NoLanes
            ) {
                // 不是 suspense 和 pinged
                // Assumes timestamps are monotonically increasing.
                // 计算一个过期时间
                expirationTimes[index] = computeExpirationTime(lane, currentTime);
            }
        } else if (expirationTime <= currentTime) {
            // This lane expired
            // 小于当前时间，说明已经过期了，expiredLanes 增加该车道
            root.expiredLanes |= lane;
        }

        // 去掉本次的车道
        lanes &= ~lane;
    }
}

// This returns the highest priority pending lanes regardless of whether they
// are suspended.
export function getHighestPriorityPendingLanes(root) {
    return getHighestPriorityLanes(root.pendingLanes);
}

export function getLanesToRetrySynchronouslyOnError(root) {
    const everythingButOffscreen = root.pendingLanes & ~OffscreenLane;
    if (everythingButOffscreen !== NoLanes) {
        return everythingButOffscreen;
    }
    if (everythingButOffscreen & OffscreenLane) {
        return OffscreenLane;
    }
    return NoLanes;
}

export function includesSyncLane(lanes) {
    return (lanes & SyncLane) !== NoLanes;
}

export function includesNonIdleWork(lanes) {
    return (lanes & NonIdleLanes) !== NoLanes;
}

export function includesOnlyRetries(lanes) {
    return (lanes & RetryLanes) === lanes;
}

export function includesOnlyNonUrgentLanes(lanes) {
    const UrgentLanes = SyncLane | InputContinuousLane | DefaultLane;
    return (lanes & UrgentLanes) === NoLanes;
}

export function includesOnlyTransitions(lanes) {
    return (lanes & TransitionLanes) === lanes;
}

export function includesBlockingLane(root, lanes) {
    if (
        allowConcurrentByDefault &&
        (root.current.mode & ConcurrentUpdatesByDefaultMode) !== NoMode
    ) {
        // Concurrent updates by default always use time slicing.
        return false;
    }
    const SyncDefaultLanes =
        InputContinuousHydrationLane |
        InputContinuousLane |
        DefaultHydrationLane |
        DefaultLane;
    return (lanes & SyncDefaultLanes) !== NoLanes;
}

export function includesExpiredLane(root, lanes) {
    // This is a separate check from includesBlockingLane because a lane can
    // expire after a render has already started.
    return (lanes & root.expiredLanes) !== NoLanes;
}

export function isTransitionLane(lane) {
    return (lane & TransitionLanes) !== NoLanes;
}

/**
 * 获取下一个 Transition 车道
 */
export function claimNextTransitionLane() {
    // Cycle through the lanes, assigning each new transition to the next lane.
    // In most cases, this means every transition gets its own lane, until we
    // run out of lanes and cycle back to the beginning.
    const lane = nextTransitionLane;

    nextTransitionLane <<= 1;

    // 左移动到了边界了，重新从 TransitionLane1 开始
    // 0b0000000001111111111111111000000
    if ((nextTransitionLane & TransitionLanes) === NoLanes) {
        // 确定下一个 Transition 车道
        nextTransitionLane = TransitionLane1;
    }

    return lane;
}

export function claimNextRetryLane() {
    const lane = nextRetryLane;
    nextRetryLane <<= 1;
    if ((nextRetryLane & RetryLanes) === NoLanes) {
        nextRetryLane = RetryLane1;
    }
    return lane;
}

/**
 * 选取 lanes 中右边的 1 的大小，即获取优先级最高的车道
 * e.g. 0b110 -> 2
 */
export function getHighestPriorityLane(lanes) {
    // -lanes 的二进制：lanes 二进制取反 - 1
    return lanes & -lanes;
}

export function pickArbitraryLane(lanes) {
    // This wrapper function gets inlined. Only exists so to communicate that it
    // doesn't matter which bit is selected; you can pick any bit without
    // affecting the algorithms where its used. Here I'm using
    // getHighestPriorityLane because it requires the fewest operations.

    // 在不知道选择哪个车道之后，使用这个去选取任意的车道
    // 可以选择任意方法去获取，使用 getHighestPriorityLane 的原因该方法最少的操作
    return getHighestPriorityLane(lanes);
}

function pickArbitraryLaneIndex(lanes) {
    return 31 - clz32(lanes);
}

function laneToIndex(lane) {
    return pickArbitraryLaneIndex(lane);
}

export function includesSomeLane(a, b) {
    return (a & b) !== NoLanes;
}

export function isSubsetOfLanes(set, subset) {
    return (set & subset) === subset;
}

export function mergeLanes(a, b) {
    return a | b;
}

export function removeLanes(set, subset) {
    return set & ~subset;
}

export function intersectLanes(a, b) {
    return a & b;
}

// Seems redundant, but it changes the type from a single lane (used for
// updates) to a group of lanes (used for flushing work).
export function laneToLanes(lane) {
    return lane;
}

export function higherPriorityLane(a, b) {
    // This works because the bit ranges decrease in priority as you go left.
    return a !== NoLane && a < b ? a : b;
}

export function createLaneMap(initial) {
    // Intentionally pushing one by one.
    // https://v8.dev/blog/elements-kinds#avoid-creating-holes
    const laneMap = [];
    for (let i = 0; i < TotalLanes; i++) {
        laneMap.push(initial);
    }
    return laneMap;
}

export function markRootUpdated(root, updateLane, eventTime) {
    // 1. pendingLanes 加上本次更新的车道 updateLane
    root.pendingLanes |= updateLane;


    if (updateLane !== IdleLane) {
        root.suspendedLanes = NoLanes;
        root.pingedLanes = NoLanes;
    }

    // 2. 更新对应车道上的 eventTime
    const eventTimes = root.eventTimes;
    const index = laneToIndex(updateLane);

    // We can always overwrite an existing timestamp because we prefer the most
    // recent event, and we assume time is monotonically increasing.
    eventTimes[index] = eventTime;
}

export function markRootSuspended(root, suspendedLanes) {
    root.suspendedLanes |= suspendedLanes;
    root.pingedLanes &= ~suspendedLanes;

    // The suspended lanes are no longer CPU-bound. Clear their expiration times.
    const expirationTimes = root.expirationTimes;
    let lanes = suspendedLanes;
    while (lanes > 0) {
        const index = pickArbitraryLaneIndex(lanes);
        const lane = 1 << index;

        expirationTimes[index] = NoTimestamp;

        lanes &= ~lane;
    }
}

export function markRootPinged(root, pingedLanes, eventTime) {
    root.pingedLanes |= root.suspendedLanes & pingedLanes;
}

export function markRootMutableRead(root, updateLane) {
    root.mutableReadLanes |= updateLane & root.pendingLanes;
}

export function markRootFinished(root, remainingLanes) {
    const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;

    root.pendingLanes = remainingLanes;

    // Let's try everything again
    root.suspendedLanes = NoLanes;
    root.pingedLanes = NoLanes;

    root.expiredLanes &= remainingLanes;
    root.mutableReadLanes &= remainingLanes;

    root.entangledLanes &= remainingLanes;

    const entanglements = root.entanglements;
    const eventTimes = root.eventTimes;
    const expirationTimes = root.expirationTimes;
    const hiddenUpdates = root.hiddenUpdates;

    // Clear the lanes that no longer have pending work
    let lanes = noLongerPendingLanes;
    while (lanes > 0) {
        const index = pickArbitraryLaneIndex(lanes);
        const lane = 1 << index;

        entanglements[index] = NoLanes;
        eventTimes[index] = NoTimestamp;
        expirationTimes[index] = NoTimestamp;

        const hiddenUpdatesForLane = hiddenUpdates[index];
        if (hiddenUpdatesForLane !== null) {
            hiddenUpdates[index] = null;
            // "Hidden" updates are updates that were made to a hidden component. They
            // have special logic associated with them because they may be entangled
            // with updates that occur outside that tree. But once the outer tree
            // commits, they behave like regular updates.
            for (let i = 0; i < hiddenUpdatesForLane.length; i++) {
                const update = hiddenUpdatesForLane[i];
                if (update !== null) {
                    update.lane &= ~OffscreenLane;
                }
            }
        }

        lanes &= ~lane;
    }
}

export function markRootEntangled(root, entangledLanes) {
    // In addition to entangling each of the given lanes with each other, we also
    // have to consider _transitive_ entanglements. For each lane that is already
    // entangled with *any* of the given lanes, that lane is now transitively
    // entangled with *all* the given lanes.
    //
    // Translated: If C is entangled with A, then entangling A with B also
    // entangles C with B.
    //
    // If this is hard to grasp, it might help to intentionally break this
    // function and look at the tests that fail in ReactTransition-test.js. Try
    // commenting out one of the conditions below.

    const rootEntangledLanes = (root.entangledLanes |= entangledLanes);
    const entanglements = root.entanglements;
    let lanes = rootEntangledLanes;
    // e.g.
    // root.entangledLanes: 0011
    // root.entanglements: [6, 1, 0, 0]
    // entangledLanes: 0100
    // lanes: 0111
    while (lanes) {
        const index = pickArbitraryLaneIndex(lanes);
        const lane = 1 << index;
        if (
            // 新的纠缠的索引
            // Is this one of the newly entangled lanes
            // e.g.
            // 4 & 0100 === 4
            (lane & entangledLanes) |
            // 传递性的纠缠
            // Is this lane transitively entangled with the newly entangled lanes
            // e.g.
            // 0001 & 0100 = 0
            // 6 & 0100 = 4
            (entanglements[index] & entangledLanes)
        ) {
            // (lane 或者 entanglements[index]) 中包含 entangleLanes 即可
            //! 该位置加上传入的 entangledLanes
            entanglements[index] |= entangledLanes;
        }
        lanes &= ~lane;
    }
}

export function markHiddenUpdate(root, update, lane) {
    const index = laneToIndex(lane);
    const hiddenUpdates = root.hiddenUpdates;
    const hiddenUpdatesForLane = hiddenUpdates[index];
    if (hiddenUpdatesForLane === null) {
        hiddenUpdates[index] = [update];
    } else {
        hiddenUpdatesForLane.push(update);
    }
    update.lane = lane | OffscreenLane;
}

export function getBumpedLaneForHydration(root, renderLanes) {
    const renderLane = getHighestPriorityLane(renderLanes);

    let lane;
    switch (renderLane) {
        case InputContinuousLane:
            lane = InputContinuousHydrationLane;
            break;
        case DefaultLane:
            lane = DefaultHydrationLane;
            break;
        case TransitionLane1:
        case TransitionLane2:
        case TransitionLane3:
        case TransitionLane4:
        case TransitionLane5:
        case TransitionLane6:
        case TransitionLane7:
        case TransitionLane8:
        case TransitionLane9:
        case TransitionLane10:
        case TransitionLane11:
        case TransitionLane12:
        case TransitionLane13:
        case TransitionLane14:
        case TransitionLane15:
        case TransitionLane16:
        case RetryLane1:
        case RetryLane2:
        case RetryLane3:
        case RetryLane4:
        case RetryLane5:
            lane = TransitionHydrationLane;
            break;
        case IdleLane:
            lane = IdleHydrationLane;
            break;
        default:
            // Everything else is already either a hydration lane, or shouldn't
            // be retried at a hydration lane.
            lane = NoLane;
            break;
    }

    // Check if the lane we chose is suspended. If so, that indicates that we
    // already attempted and failed to hydrate at that level. Also check if we're
    // already rendering that lane, which is rare but could happen.
    if ((lane & (root.suspendedLanes | renderLanes)) !== NoLane) {
        // Give up trying to hydrate and fall back to client render.
        return NoLane;
    }

    return lane;
}

export function addFiberToLanesMap(root, fiber, lanes) {
    if (!enableUpdaterTracking) {
        return;
    }
    if (!isDevToolsPresent) {
        return;
    }
    const pendingUpdatersLaneMap = root.pendingUpdatersLaneMap;
    while (lanes > 0) {
        const index = laneToIndex(lanes);
        const lane = 1 << index;

        const updaters = pendingUpdatersLaneMap[index];
        updaters.add(fiber);

        lanes &= ~lane;
    }
}

export function movePendingFibersToMemoized(root, lanes) {
    if (!enableUpdaterTracking) {
        return;
    }
    if (!isDevToolsPresent) {
        return;
    }
    const pendingUpdatersLaneMap = root.pendingUpdatersLaneMap;
    const memoizedUpdaters = root.memoizedUpdaters;
    while (lanes > 0) {
        const index = laneToIndex(lanes);
        const lane = 1 << index;

        const updaters = pendingUpdatersLaneMap[index];
        if (updaters.size > 0) {
            updaters.forEach((fiber) => {
                const alternate = fiber.alternate;
                if (alternate === null || !memoizedUpdaters.has(alternate)) {
                    memoizedUpdaters.add(fiber);
                }
            });
            updaters.clear();
        }

        lanes &= ~lane;
    }
}

export function addTransitionToLanesMap(root, transition, lane) {
    if (enableTransitionTracing) {
        const transitionLanesMap = root.transitionLanes;
        const index = laneToIndex(lane);
        let transitions = transitionLanesMap[index];
        if (transitions === null) {
            transitions = new Set();
        }
        transitions.add(transition);

        transitionLanesMap[index] = transitions;
    }
}

export function getTransitionsForLanes(root, lanes) {
    if (!enableTransitionTracing) {
        return null;
    }

    const transitionsForLanes = [];
    while (lanes > 0) {
        const index = laneToIndex(lanes);
        const lane = 1 << index;
        const transitions = root.transitionLanes[index];
        if (transitions !== null) {
            transitions.forEach((transition) => {
                transitionsForLanes.push(transition);
            });
        }

        lanes &= ~lane;
    }

    if (transitionsForLanes.length === 0) {
        return null;
    }

    return transitionsForLanes;
}

export function clearTransitionsForLanes(root, lanes) {
    if (!enableTransitionTracing) {
        return;
    }

    while (lanes > 0) {
        const index = laneToIndex(lanes);
        const lane = 1 << index;

        const transitions = root.transitionLanes[index];
        if (transitions !== null) {
            root.transitionLanes[index] = null;
        }

        lanes &= ~lane;
    }
}
