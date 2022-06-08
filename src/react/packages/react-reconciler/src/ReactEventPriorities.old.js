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
// 默认是 InputContinuousLane
export const ContinuousEventPriority = InputContinuousLane;
export const DefaultEventPriority = DefaultLane;
export const IdleEventPriority = IdleLane;

// 默认是 NoLane
let currentUpdatePriority = NoLane;

/**
 * 获取当前事件的优先级
 */
export function getCurrentUpdatePriority() {
  return currentUpdatePriority;
}

/**
 * 设置事件的优先级
 */
export function setCurrentUpdatePriority(newPriority) {
  currentUpdatePriority = newPriority;
}

/**
 * 以优先级 priority 执行 fn
 */
export function runWithPriority(priority, fn) {
  const previousPriority = currentUpdatePriority;
  try {
    currentUpdatePriority = priority;
    return fn();
  } finally {
    currentUpdatePriority = previousPriority;
  }
}

/**
 * 获取 a 和 b 中优先级较高的
 */
export function higherEventPriority(a, b) {
  return a !== 0 && a < b ? a : b;
}

/**
 * 获取 a 和 b 中优先级比较低的
 */
export function lowerEventPriority(a, b) {
  return a === 0 || a > b ? a : b;
}

/**
 * 判断是不是 a 的优先级比 b 的优先级高
 */
export function isHigherEventPriority(a, b) {
  return a !== 0 && a < b;
}

/**
 * 车道 lane 转为事件优先级
 */
export function lanesToEventPriority(lanes) {
  // 选取 lanes 中优先级最高的车道
  const lane = getHighestPriorityLane(lanes);

  // 选择下一个比 lane 低的优先级

  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    // lane 优先级大于 DiscreteEventPriority
    // e.g. lane === 1
    //  DiscreteEventPriority > lane
    return DiscreteEventPriority;
  }

  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    // lane 的优先级大于 ContinuousEventPriority
    // e.g. lane === 2
    // ContinuousEventPriority > lane > DiscreteEventPriority
    return ContinuousEventPriority;
  }

  if (includesNonIdleWork(lane)) {
    // lane 中包含了非 Idle 的任务
    return DefaultEventPriority;
  }
  return IdleEventPriority;
}
