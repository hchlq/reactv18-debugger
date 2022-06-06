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
// 获取 lane 对应的名字，优先从高优先级，找到后立即返回
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

// 新的 transition 车道，默认是 TransitionLane1
let nextTransitionLane = TransitionLane1;
// 新的 retry 车道，默认是 RetryLane1
let nextRetryLane = RetryLane1;

/**
 * 获取最高的优先级，lanes 最右边车道为 1 的对应的 lane
 */
function getHighestPriorityLanes(lanes) {
  // getHighestPriorityLane(lanes) === lanes & -lanes;
  switch (getHighestPriorityLane(lanes)) {
    case SyncLane:
      return SyncLane;
    case InputContinuousHydrationLane:
      return InputContinuousHydrationLane;
    case InputContinuousLane:
      return InputContinuousLane;
    case DefaultHydrationLane:
      return DefaultHydrationLane;
    case DefaultLane:
      return DefaultLane;
    case TransitionHydrationLane:
      return TransitionHydrationLane;
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
    case SelectiveHydrationLane:
      return SelectiveHydrationLane;
    case IdleHydrationLane:
      return IdleHydrationLane;
    case IdleLane:
      return IdleLane;
    case OffscreenLane:
      return OffscreenLane;
    default:
      if (__DEV__) {
        console.error(
          'Should have found matching lanes. This is a bug in React.',
        );
      }
      // This shouldn't be reachable, but as a fallback, return the entire bitmask.
      return lanes;
  }
}

/**
 * 获取本次更新的 lane
 */
export function getNextLanes(root, wipLanes) {
  // Early bailout if there's no pending work left.
  const pendingLanes = root.pendingLanes;

  if (pendingLanes === NoLanes) {
    // 本次没有更新的任务
    return NoLanes;
  }

  let nextLanes = NoLanes;

  const suspendedLanes = root.suspendedLanes;
  const pingedLanes = root.pingedLanes;

  // Do not work on any idle work until all the non-idle work has finished,
  // even if the work is suspended.
  // 优先处理不是空闲的任务，知道非空闲的任务处理完成了，才会处理空闲的任务
  const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
  // console.log('nonIdlePendingLanes: ', nonIdlePendingLanes)
  if (nonIdlePendingLanes !== NoLanes) {
    // 排除掉 suspense
    const nonIdleUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
    if (nonIdleUnblockedLanes !== NoLanes) {
      nextLanes = getHighestPriorityLanes(nonIdleUnblockedLanes);
    } else {
      // 只处理 pingedLanes
      const nonIdlePingedLanes = nonIdlePendingLanes & pingedLanes;
      if (nonIdlePingedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
      }
    }
  } else {
    // The only remaining work is Idle.
    const unblockedLanes = pendingLanes & ~suspendedLanes;
    if (unblockedLanes !== NoLanes) {
      nextLanes = getHighestPriorityLanes(unblockedLanes);
    } else {
      // 只处理 pingedLanes
      if (pingedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(pingedLanes);
      }
    }
  }

  if (nextLanes === NoLanes) {
    // This should only be reachable if we're suspended
    // TODO: Consider warning in this path if a fallback timer is not scheduled.
    return NoLanes;
  }

  // If we're already in the middle of a render, switching lanes will interrupt
  // it and we'll lose our progress. We should only do this if the new lanes are
  // higher priority.
  // 当前正在渲染中，切换车道会中断渲染，并且会丢失当前正在构建的 fiber 树，只有在 nextLane 优先级高于 wipLanes 时才会切换车道
  if (
    wipLanes !== NoLanes &&
    wipLanes !== nextLanes &&
    // If we already suspended with a delay, then interrupting is fine. Don't
    // bother waiting until the root is complete.
    (wipLanes & suspendedLanes) === NoLanes
  ) {
    const nextLane = getHighestPriorityLane(nextLanes);
    const wipLane = getHighestPriorityLane(wipLanes);
    if (
      // Tests whether the next lane is equal or lower priority than the wip
      // one. This works because the bits decrease in priority as you go left.
      nextLane >= wipLane ||
      // Default priority updates should not interrupt transition updates. The
      // only difference between default updates and transition updates is that
      // default updates do not support refresh transitions.
      (nextLane === DefaultLane && (wipLane & TransitionLanes) !== NoLanes)
    ) {
      // Keep working on the existing in-progress tree. Do not interrupt.
      // 满足以下两个情况之一，不会切换 lane，lane 继续使用 wipLanes

      // 1. nextLane 优先级小于 wipLane
      // 2. nextLane 为 DefaultLane，并且 wipLane 为 TransitionLanes
      return wipLanes;
    }
  }

  if (
    // allowConcurrentByDefault: false
    allowConcurrentByDefault &&
    (root.current.mode & ConcurrentUpdatesByDefaultMode) !== NoMode
  ) {
    // Concurrent 是默认模式
    // Do nothing, use the lanes as they were assigned.
  } else if ((nextLanes & InputContinuousLane) !== NoLanes) {
    // When updates are sync by default, we entangle continuous priority updates
    // and default updates, so they render in the same batch. The only reason
    // they use separate lanes is because continuous updates should interrupt
    // transitions, but default updates should not.

    // nextLanes 包含 InputContinuousLane，说明更新默认是同步的，InputContinuousLane 在事件中会用到，比如 drag 事件
    // nextLane 合并 pendingLanes 中只包含 DefaultLane 的车道
    nextLanes |= pendingLanes & DefaultLane;
  }

  // 检查纠缠的车道，将这些纠缠的车道加入到 nextLanes 中
  // Check for entangled lanes and add them to the batch.
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

    // 选择 nextLanes 中包含 entangledLanes 的车道
    let lanes = nextLanes & entangledLanes;
    while (lanes > 0) {
      // 从 lanes 中获取一个一个的车道
      const index = pickArbitraryLaneIndex(lanes);

      // 更新车道
      const lane = 1 << index;

      // entanglements[index] 存储了跟这个 lane 纠缠的车道
      nextLanes |= entanglements[index];

      // 去掉本次合并的 lane
      lanes &= ~lane;
    }
  }

  return nextLanes;
}

/**
 * 获取 lanes 最近的时间
 */
export function getMostRecentEventTime(root, lanes) {
  const eventTimes = root.eventTimes;

  let mostRecentEventTime = NoTimestamp;

  while (lanes > 0) {
    // 依次取出一个个 lane
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    const eventTime = eventTimes[index];
    if (eventTime > mostRecentEventTime) {
      // 这个 lane 对应的时间大于 mostRecentEventTime
      // 说明还有更近的时间，更新 mostRecentEventTime
      mostRecentEventTime = eventTime;
    }

    // 去掉这个 lane
    lanes &= ~lane;
  }

  return mostRecentEventTime;
}

/**
 * 计算 lane 过期的时间
 */
function computeExpirationTime(lane, currentTime) {
  switch (lane) {
    case SyncLane:
    case InputContinuousHydrationLane:
    case InputContinuousLane:
      // 用户的交互优先级相对过期较快一点

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
      //  DefaultLane 和 Transition 的优先级过期相对较慢一点
      return currentTime + 5000;

    // NoTimestamp 说明是不会过期，优先级较低
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

      // RetryLane 没有过期时间
      return NoTimestamp;
    case SelectiveHydrationLane:
    case IdleHydrationLane:
    case IdleLane:
    case OffscreenLane:
      // Anything idle priority or lower should never expire.
      // IdleLane 和 OffscreenLane 没有过期时间
      return NoTimestamp;
    default:
      return NoTimestamp;
  }
}

/**
 * 标记饥饿的任务为过期
 *
 * 当一个低优先级更新任务被多次跳过后，就将其标记为饥饿的优先级
 * 被标记为过期的更新任务优先级也会相应的被提高，同步的更新
 */
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
  let lanes = pendingLanes;
  while (lanes > 0) {
    // 取出一个个的 pendingLanes 中的更新的任务
    // index 就是左边车道为 1 的 lane 距离右边的距离，即索引
    const index = pickArbitraryLaneIndex(lanes);

    // 对应的车道
    const lane = 1 << index;

    // 取出这个车道对应的过期时间
    const expirationTime = expirationTimes[index];

    if (expirationTime === NoTimestamp) {
      // Found a pending lane with no expiration time. If it's not suspended, or
      // if it's pinged, assume it's CPU-bound. Compute a new expiration time
      // using the current time.
      if (
        (lane & suspendedLanes) === NoLanes ||
        (lane & pingedLanes) !== NoLanes
      ) {
        // 满足以下条件之一即可
        // 1. 没有 suspenseLanes
        // 2. 有 pingedLanes

        // Assumes timestamps are monotonically increasing.
        // 计算一个过期时间
        expirationTimes[index] = computeExpirationTime(lane, currentTime);
      }
    } else if (expirationTime <= currentTime) {
      // This lane expired
      // 过期时间小于 currentTime，那么标记为过期
      root.expiredLanes |= lane;
    }

    // 去掉本次的 lane
    lanes &= ~lane;
  }
}

// This returns the highest priority pending lanes regardless of whether they
// are suspended.
// 获取 pendingLanes 中优先级最最高的车道
export function getHighestPriorityPendingLanes(root) {
  return getHighestPriorityLanes(root.pendingLanes);
}

/**
 * 在错误中，获取车道去同步的重试更新
 */
export function getLanesToRetrySynchronouslyOnError(root) {
  // pendingLanes 中去掉 OffscreenLane
  const everythingButOffscreen = root.pendingLanes & ~OffscreenLane;

  // 除了 OffscreenLane 之外，还有其他的任务
  if (everythingButOffscreen !== NoLanes) {
    return everythingButOffscreen;
  }

  // pendingLanes 中只包含 OffscreenLane 了
  if (everythingButOffscreen & OffscreenLane) {
    return OffscreenLane;
  }

  // pendingLanes 中没有任务
  return NoLanes;
}

/**
 * 判断 lanes 中是否包含 SyncLane
 */
export function includesSyncLane(lanes) {
  return (lanes & SyncLane) !== NoLanes;
}

/**
 * 判断 lanes 中是否包含 NonIdleLanes
 */
export function includesNonIdleWork(lanes) {
  return (lanes & NonIdleLanes) !== NoLanes;
}

/**
 * 判断 lanes 中是否包含 RetryLanes
 */
export function includesOnlyRetries(lanes) {
  return (lanes & RetryLanes) === lanes;
}

/**
 * 判断 lanes 是否是不紧急的更新
 */
export function includesOnlyNonUrgentLanes(lanes) {
  const UrgentLanes = SyncLane | InputContinuousLane | DefaultLane;
  return (lanes & UrgentLanes) === NoLanes;
}

/**
 * 判断 lanes 中是否只包含 TransitionLanes
 */
export function includesOnlyTransitions(lanes) {
  return (lanes & TransitionLanes) === lanes;
}

/**
 * 判断 lanes 中是否包含 BlockingLane
 *
 * BlockingLane 包含 InputContinuousLane 和 DefaultLane
 */
export function includesBlockingLane(root, lanes) {
  // debugger
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

/**
 * 判断 lanes 中是否包含过期的 lanes
 */
export function includesExpiredLane(root, lanes) {
  // This is a separate check from includesBlockingLane because a lane can
  // expire after a render has already started.
  return (lanes & root.expiredLanes) !== NoLanes;
}

/**
 * 判断 lane 是否包含 TransitionLanes
 */
export function isTransitionLane(lane) {
  return (lane & TransitionLanes) !== NoLanes;
}

/**
 * 确定下一个 TransitionLane
 */
export function claimNextTransitionLane() {
  // Cycle through the lanes, assigning each new transition to the next lane.
  // In most cases, this means every transition gets its own lane, until we
  // run out of lanes and cycle back to the beginning.
  const lane = nextTransitionLane;

  // nextTransitionLane 左移一位
  nextTransitionLane <<= 1;
  if ((nextTransitionLane & TransitionLanes) === NoLanes) {
    // 左移一位之后，TransitionLanes 没有了对应的车道，重新回到 TransitionLane1
    // e.g. nextTransitionLane === 0b0000000010000000000000000000000
    //         TransitionLanes === 0b0000000001111111111111111000000
    nextTransitionLane = TransitionLane1;
  }

  return lane;
}

/**
 * 确定下一个 RetryLane
 *
 * 这里和 claimNextTransitionLane 一样
 */
export function claimNextRetryLane() {
  const lane = nextRetryLane;
  // 左一一位
  nextRetryLane <<= 1;

  if ((nextRetryLane & RetryLanes) === NoLanes) {
    // 左移一位之后，RetryLanes 没有了对应的车道，重新回到 RetryLane1
    // e.g. nextRetryLane === 0b0001000000000000000000000000000
    //         RetryLanes === 0b0000111110000000000000000000000
    nextRetryLane = RetryLane1;
  }

  return lane;
}

/**
 * 获取最右边车道为 1 的，即优先级最高的车道
 */
export function getHighestPriorityLane(lanes) {
  return lanes & -lanes;
}

/**
 * 获取最右边车道为 1 的，即优先级最高的车道
 */
export function pickArbitraryLane(lanes) {
  // This wrapper function gets inlined. Only exists so to communicate that it
  // doesn't matter which bit is selected; you can pick any bit without
  // affecting the algorithms where its used. Here I'm using
  // getHighestPriorityLane because it requires the fewest operations.
  return getHighestPriorityLane(lanes);
}

/**
 * 获取最左边车道为 1 的，即优先级最低的车道距离右边的索引
 *
 * e.g. lanes = 00000000 00000000 00000010 00000000
 * clz32(lanes) = 22，即 pickArbitraryLaneIndex 返回9
 */
function pickArbitraryLaneIndex(lanes) {
  // clz32: 将 lanes 转为 32 位无符号二进制后左边 0 的个数
  return 31 - clz32(lanes);
}

/**
 * 获取最左边优先级最低的为 1 的车道距离最右边的索引
 */
function laneToIndex(lane) {
  return pickArbitraryLaneIndex(lane);
}

/**
 * 判断 a 和 b 是否包含有一样的车道
 */
export function includesSomeLane(a, b) {
  return (a & b) !== NoLanes;
}

/**
 * 判断 set 是否包含 subset
 */
export function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;
}

/**
 * 合并 a 和 b 中的车道
 */
export function mergeLanes(a, b) {
  return a | b;
}

/**
 * set 移除掉 subset 的车道
 */
export function removeLanes(set, subset) {
  return set & ~subset;
}

/**
 * 获取 a 和 b 的交集
 */
export function intersectLanes(a, b) {
  return a & b;
}

// Seems redundant, but it changes the type from a single lane (used for
// updates) to a group of lanes (used for flushing work).
// 单个车道转为多个车道
export function laneToLanes(lane) {
  return lane;
}

/**
 * 获取 a 和 b 中优先级较高的车道
 */
export function higherPriorityLane(a, b) {
  // This works because the bit ranges decrease in priority as you go left.
  return a !== NoLane && a < b ? a : b;
}

/**
 * 创建 TotalLanes 长度的数组，初始化为 initial
 */
export function createLaneMap(initial) {
  // Intentionally pushing one by one.
  // https://v8.dev/blog/elements-kinds#avoid-creating-holes
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}

/**
 * 标记根为有更新任务
 */
export function markRootUpdated(root, updateLane, eventTime) {
  // 1. pendingLanes 合并 updateLane
  root.pendingLanes |= updateLane;

  // If there are any suspended transitions, it's possible this new update
  // could unblock them. Clear the suspended lanes so that we can try rendering
  // them again.
  //
  // TODO: We really only need to unsuspend only lanes that are in the
  // `subtreeLanes` of the updated fiber, or the update lanes of the return
  // path. This would exclude suspended updates in an unrelated sibling tree,
  // since there's no way for this update to unblock it.
  //
  // We don't do this if the incoming update is idle, because we never process
  // idle updates until after all the regular updates have finished; there's no
  // way it could unblock a transition.
  if (updateLane !== IdleLane) {
    // 2. 本次更新任务不是 IdleLane，清空 suspendedLane 和 pingedLanes
    root.suspendedLanes = NoLanes;
    root.pingedLanes = NoLanes;
  }

  // 3. 更新 eventTimes 对应的 updateLane 的索引
  const eventTimes = root.eventTimes;

  // 获取 updateLane 的索引
  const index = laneToIndex(updateLane);

  // We can always overwrite an existing timestamp because we prefer the most
  // recent event, and we assume time is monotonically increasing.
  // 更新该车道的时间戳
  eventTimes[index] = eventTime;
}

/**
 * 标记 root 为 suspended
 */
export function markRootSuspended(root, suspendedLanes) {
  // 合并 suspendedLanes
  root.suspendedLanes |= suspendedLanes;

  // root.pingedLanes 去掉 suspendedLanes
  root.pingedLanes &= ~suspendedLanes;

  // The suspended lanes are no longer CPU-bound. Clear their expiration times.
  // 清除 suspendedLanes 的过期时间
  const expirationTimes = root.expirationTimes;
  let lanes = suspendedLanes;

  while (lanes > 0) {
    // 从左边开始，依次取出车道为 1 的 lane
    const index = pickArbitraryLaneIndex(lanes);

    const lane = 1 << index;

    // 将该车道对应的过期时间重置为 NoTimestamp
    expirationTimes[index] = NoTimestamp;

    // 去掉当前的 lane
    lanes &= ~lane;
  }
}

/**
 * 标记 root 为 pinged
 */
export function markRootPinged(root, pingedLanes, eventTime) {
  // 只取出和 suspendedLanes 相交的 pingedLanes 添加到 root.pingedLanes 中国呢
  root.pingedLanes |= root.suspendedLanes & pingedLanes;
}

/**
 * 标记 root 为可读写的
 */
export function markRootMutableRead(root, updateLane) {
  // 只取出和 root.pendingLanes 相交的 updateLane 添加到 root.mutableReadLanes 中
  root.mutableReadLanes |= updateLane & root.pendingLanes;
}

/**
 * 标记 root 已经完成构建了
 * remainingLanes: 剩下的任务
 */
export function markRootFinished(root, remainingLanes) {
  // root.pendingLanes 去掉 remainingLanes
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;

  // 更新 root.pendingLanes
  root.pendingLanes = remainingLanes;

  // Let's try everything again
  // 重置 root 的 suspendedLanes 和 pingedLanes
  root.suspendedLanes = NoLanes;
  root.pingedLanes = NoLanes;

  // root 的 expiredLanes, mutableReadLanes 和 entangledLanes 只保留和 remainingLanes 相交的部分
  root.expiredLanes &= remainingLanes;
  root.mutableReadLanes &= remainingLanes;

  root.entangledLanes &= remainingLanes;

  const entanglements = root.entanglements;
  const eventTimes = root.eventTimes;
  const expirationTimes = root.expirationTimes;

  // Clear the lanes that no longer have pending work
  // 将已完成的更新任务对应的 eventTimes, expirationTimes, entanglements 重置为 NoTimestamp
  let lanes = noLongerPendingLanes;
  while (lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    entanglements[index] = NoLanes;
    eventTimes[index] = NoTimestamp;
    expirationTimes[index] = NoTimestamp;

    lanes &= ~lane;
  }
}

/**
 * 标记 root 纠缠
 */
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

  // root.entangledLanes 合并 entangledLanes
  const rootEntangledLanes = (root.entangledLanes |= entangledLanes);

  const entanglements = root.entanglements;
  let lanes = rootEntangledLanes;

  while (lanes) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;
    if (
      // Is this one of the newly entangled lanes?
      (lane & entangledLanes) |
      // Is this lane transitively entangled with the newly entangled lanes?
      (entanglements[index] & entangledLanes)
    ) {
      // 满足以下条件即可
      // 1. entangledLanes 包含当前的 lane
      // 2. entanglements[index] 包含 entangledLanes

      // entanglements 对应的所以合并当前的  entangledLanes
      entanglements[index] |= entangledLanes;
    }

    lanes &= ~lane;
  }
}

/**
 * 获取 ssr 对应的车道
 */
export function getBumpedLaneForHydration(root, renderLanes) {
  // 获取 renderLanes 最高的优先级
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
    // 判断 lane 已经在 suspendedLanes 中了
    // Give up trying to hydrate and fall back to client render.
    return NoLane;
  }

  return lane;
}

/**
 * 将 fiber 添加到 pendingUpdatersLaneMap 中
 */
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

/**
 * 将 pendingUpdatersLaneMap 移动到 memoizedUpdaters 中
 */
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

/**
 * 将 transition 添加到 transitionLanesMap 中
 */
export function addTransitionToLanesMap(root, transition, lane) {
  if (enableTransitionTracing) {
    // transitionLanesMap
    const transitionLanesMap = root.transitionLanes;

    const index = laneToIndex(lane);
    let transitions = transitionLanesMap[index];

    if (transitions === null) {
      // 为空，默认赋值为空数组
      transitions = [];
    }

    transitions.push(transition);

    transitionLanesMap[index] = transitions;
  }
}

/**
 * 获取 lanes 中所有的 transition
 */
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

/**
 * 清除包含 lanes 的所有 transition
 */
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
