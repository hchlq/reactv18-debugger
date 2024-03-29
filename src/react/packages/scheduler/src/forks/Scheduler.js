/* eslint-disable */

import {
    enableProfiling,
    enableIsInputPending,
    frameYieldMs, continuousYieldMs,
    maxYieldMs
} from '../SchedulerFeatureFlags';

import {push, pop, peek} from '../SchedulerMinHeap';

// TODO: Use symbols?
import {
    ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority, IdlePriority,
} from '../SchedulerPriorities';
import {
    markTaskStart,
    stopLoggingProfilingEvents,
    startLoggingProfilingEvents,
} from '../SchedulerProfiling';

let getCurrentTime;
const hasPerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';

if (hasPerformanceNow) {
    const localPerformance = performance;
    getCurrentTime = () => localPerformance.now();
} else {
    const localDate = Date;
    const initialTime = localDate.now();
    getCurrentTime = () => localDate.now() - initialTime;
}

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

// Tasks are stored on a min heap
var taskQueue = [];
var timerQueue = [];

// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;

// Pausing the scheduler is useful for debugging.
var isSchedulerPaused = false;

var currentTask = null;
var currentPriorityLevel = NormalPriority;

// This is set while performing work, to prevent re-entrance.
var isPerformingWork = false;

var isHostCallbackScheduled = false;
var isHostTimeoutScheduled = false;

// Capture local references to native APIs, in case a polyfill overrides them.
const localSetTimeout = typeof setTimeout === 'function' ? setTimeout : null;
const localClearTimeout = typeof clearTimeout === 'function' ? clearTimeout : null;
const localSetImmediate = typeof setImmediate !== 'undefined' ? setImmediate : null; // IE and Node.js + jsdom

const isInputPending = typeof navigator !== 'undefined' && navigator.scheduling !== undefined && navigator.scheduling.isInputPending !== undefined ? navigator.scheduling.isInputPending.bind(navigator.scheduling) : null;

const continuousOptions = {includeContinuous: false};

function advanceTimers(currentTime) {
    // Check for tasks that are no longer delayed and add them to the queue.
    let timer = peek(timerQueue);
    while (timer !== null) {
        if (timer.callback === null) {
            // Timer was cancelled.
            pop(timerQueue);
        } else if (timer.startTime <= currentTime) {
            // Timer fired. Transfer to the task queue.
            pop(timerQueue);
            timer.sortIndex = timer.expirationTime;
            push(taskQueue, timer);
            if (enableProfiling) {
                markTaskStart(timer, currentTime);
                timer.isQueued = true;
            }
        } else {
            // Remaining timers are pending.
            return;
        }
        timer = peek(timerQueue);
    }
}

function handleTimeout(currentTime) {
    isHostTimeoutScheduled = false;
    advanceTimers(currentTime);

    if (!isHostCallbackScheduled) {
        if (peek(taskQueue) !== null) {
            isHostCallbackScheduled = true;
            requestHostCallback(flushWork);
        } else {
            const firstTimer = peek(timerQueue);
            if (firstTimer !== null) {
                requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
            }
        }
    }
}

/**
 * 执行注册的回调函数
 */
function flushWork(hasTimeRemaining, initialTime) {
    // We'll need a host callback the next time work is scheduled.
    // 解锁，可以调度宏任务了
    isHostCallbackScheduled = false;

    // timeout，清空操作
    if (isHostTimeoutScheduled) {
        // We scheduled a timeout but it's no longer needed. Cancel it.
        isHostTimeoutScheduled = false;
        cancelHostTimeout();
    }

    // 标记为正在执行回调任务
    isPerformingWork = true;
    const previousPriorityLevel = currentPriorityLevel;
    try {
        // No catch in prod code path.
        return workLoop(hasTimeRemaining, initialTime);
    } finally {
        // 清空操作
        currentTask = null;
        currentPriorityLevel = previousPriorityLevel;
        isPerformingWork = false;
    }
}

/**
 * 循环的工作
 */
function workLoop(hasTimeRemaining, initialTime) {
    let currentTime = initialTime;

    //! 1. 把 timerQueue 中到时间的回调任务放到 taskQueue 中
    advanceTimers(currentTime);

    //! 2. 开始处理任务
    currentTask = peek(taskQueue);
    while (currentTask !== null) {
        // console.log('currentTask: ', currentTask)

        // 同时满足以下条件时不执行回调
        // 1. 该任务没有到过期时间
        // 2. 没有剩余时间了 或者有剩余时间，但是应该让出执行权给浏览器了
        // 过期了的任务一定会执行
        if (currentTask.expirationTime > currentTime
            // 调度传入的 hasTimeRemaining 为 true
            && (!hasTimeRemaining || shouldYieldToHost())
            // && shouldYieldToHost()
        ) {
            // This currentTask hasn't expired, and we've reached the deadline.
            break;
        }
        // console.log('开始调度~~~')

        const callback = currentTask.callback;


        if (typeof callback === 'function') {
            currentTask.callback = null;
            currentPriorityLevel = currentTask.priorityLevel;

            // 该任务到过期时间了
            // e.g. expirationTime: 18, currentTime: 20, 结果为 true, 说明已经过期了
            const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

            const continuationCallback = callback(didUserCallbackTimeout);
            currentTime = getCurrentTime();
            if (typeof continuationCallback === 'function') {
                // 返回的是一个 yield 任务，继续调度
                currentTask.callback = continuationCallback;
            } else {
                if (currentTask === peek(taskQueue)) {
                    pop(taskQueue);
                }
            }
            advanceTimers(currentTime);
        } else {
            // callback 不是函数，说明被取消了
            pop(taskQueue);
        }

        // 处理下一个任务
        currentTask = peek(taskQueue);
    }
    // Return whether there's additional work
    if (currentTask !== null) {
        // 表示还有任务没执行完成
        return true;
    } else {
        const firstTimer = peek(timerQueue);
        if (firstTimer !== null) {
            requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
        return false;
    }
}

function unstable_runWithPriority(priorityLevel, eventHandler) {
    switch (priorityLevel) {
        case ImmediatePriority:
        case UserBlockingPriority:
        case NormalPriority:
        case LowPriority:
        case IdlePriority:
            break;
        default:
            priorityLevel = NormalPriority;
    }

    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = priorityLevel;

    try {
        return eventHandler();
    } finally {
        currentPriorityLevel = previousPriorityLevel;
    }
}

function unstable_next(eventHandler) {
    var priorityLevel;
    switch (currentPriorityLevel) {
        case ImmediatePriority:
        case UserBlockingPriority:
        case NormalPriority:
            // Shift down to normal priority
            priorityLevel = NormalPriority;
            break;
        default:
            // Anything lower than normal priority should remain at the current level.
            priorityLevel = currentPriorityLevel;
            break;
    }

    var previousPriorityLevel = currentPriorityLevel;
    currentPriorityLevel = priorityLevel;

    try {
        return eventHandler();
    } finally {
        currentPriorityLevel = previousPriorityLevel;
    }
}

function unstable_wrapCallback(callback) {
    const parentPriorityLevel = currentPriorityLevel;
    return function () {
        // This is a fork of runWithPriority, inlined for performance.
        const previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;

        try {
            return callback.apply(this, arguments);
        } finally {
            currentPriorityLevel = previousPriorityLevel;
        }
    };
}

/**
 *  注册回调函数
 *  回调函数执行链路：
 *  scheduleCallback -> requestHostCallback -> schedulePerformWorkUntilDeadline -> 宏任务
 *  -> performWorkUntilDeadline -> scheduledHostCallback（即 flushWork）
 *  flushWork -> workLoop -> callback（执行 callback）
 */
function unstable_scheduleCallback(priorityLevel, callback, options) {
    // console.log('===========')
    const currentTime = getCurrentTime();

    //! 1. 确定开始时间、超时时间、过期时间
    let startTime;
    if (typeof options === 'object' && options !== null) {
        const delay = options.delay;
        if (typeof delay === 'number' && delay > 0) {
            // 延迟开始
            startTime = currentTime + delay;
        } else {
            startTime = currentTime;
        }
    } else {
        // 正常情况下会走到这个逻辑
        startTime = currentTime;
    }

    // 根据优先级确定超时时间，优先级越高，超时时间越短
    let timeout;
    switch (priorityLevel) {
        case ImmediatePriority:
            // -1
            timeout = IMMEDIATE_PRIORITY_TIMEOUT;
            break;
        case UserBlockingPriority:
            // 250
            timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
            break;
        case LowPriority:
            // 10000
            timeout = LOW_PRIORITY_TIMEOUT;
            break;
        case IdlePriority:
            // 1073741823 -> Math.pow(2, 30) - 1
            timeout = IDLE_PRIORITY_TIMEOUT;
            break;
        case NormalPriority:
        default:
            // 5000
            timeout = NORMAL_PRIORITY_TIMEOUT;
            break;
    }

    const expirationTime = startTime + timeout;

    //! 2. 创建任务
    const newTask = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime,
        expirationTime,
        sortIndex: -1,
    };

    //! 3. 开始调度任务
    if (startTime > currentTime) {
        // 延迟启动任务，放入 timerQueue 中
        // This is a delayed task.
        newTask.sortIndex = startTime;
        //
        push(timerQueue, newTask);
        if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
            // All tasks are delayed, and this is the task with the earliest delay.
            if (isHostTimeoutScheduled) {
                // Cancel an existing timeout.
                cancelHostTimeout();
            } else {
                isHostTimeoutScheduled = true;
            }
            // Schedule a timeout.
            requestHostTimeout(handleTimeout, startTime - currentTime);
        }
    } else {
        // 可以启动的任务，放入 taskQueue 中
        // 小顶堆以过期时间当做排序规则
        newTask.sortIndex = expirationTime;
        push(taskQueue, newTask);
        // Schedule a host callback, if needed. If we're already performing work,
        // wait until the next time we yield.
        if (!isHostCallbackScheduled && !isPerformingWork) {
            isHostCallbackScheduled = true;
            // 调用链路：
            requestHostCallback(flushWork);
        }
    }

    return newTask;
}

function unstable_pauseExecution() {
    isSchedulerPaused = true;
}

function unstable_continueExecution() {
    isSchedulerPaused = false;
    if (!isHostCallbackScheduled && !isPerformingWork) {
        isHostCallbackScheduled = true;
        requestHostCallback(flushWork);
    }
}

function unstable_getFirstCallbackNode() {
    return peek(taskQueue);
}

function unstable_cancelCallback(task) {
    // if (enableProfiling) {
    //     if (task.isQueued) {
    //         const currentTime = getCurrentTime();
    //         markTaskCanceled(task, currentTime);
    //         task.isQueued = false;
    //     }
    // }

    // Null out the callback to indicate the task has been canceled. (Can't
    // remove from the queue because you can't remove arbitrary nodes from an
    // array based heap, only the first one.)
    task.callback = null;
}

function unstable_getCurrentPriorityLevel() {
    return currentPriorityLevel;
}

let isMessageLoopRunning = false;
let scheduledHostCallback = null;
let taskTimeoutID = -1;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
// 默认为 5 ms
let frameInterval = frameYieldMs;
let startTime = -1;

let needsPaint = false;

/**
 * 是否让出执行权给宿主
 */
function shouldYieldToHost(extra) {
    // 执行花费的时间
    const timeElapsed = getCurrentTime() - startTime;

    //! 1. 检查一帧的时间（5ms）
    // console.log('在 5ms 内： ', timeElapsed < frameYieldMs)
    if (timeElapsed < frameYieldMs) {
        // The main thread has only been blocked for a really short amount of time;
        // smaller than a single frame. Don't yield yet.
        return false;
    }

    // The main thread has been blocked for a non-negligible amount of time. We
    // may want to yield control of the main thread, so the browser can perform
    // high priority tasks. The main ones are painting and user input. If there's
    // a pending paint or a pending input, then we should yield. But if there's
    // neither, then we can yield less often while remaining responsive. We'll
    // eventually yield regardless, since there could be a pending paint that
    // wasn't accompanied by a call to `requestPaint`, or other main thread tasks
    // like network events.
    if (enableIsInputPending) {
        if (needsPaint) {
            // There's a pending paint (signaled by `requestPaint`). Yield now.
            return true;
        }
        //! 2. 检查持续的事件（ > 5ms ）
        if (timeElapsed < continuousYieldMs) {
            // We haven't blocked the thread for that long. Only yield if there's a
            // pending discrete input (e.g. click). It's OK if there's pending
            // continuous input (e.g. mouseover).
            if (isInputPending !== null) {
                return isInputPending();
            }
        } else if (timeElapsed < maxYieldMs) {
            //! 3. 检查等待的离散和持续的输入  ( > 50ms )
            // 时间 >= 50ms
            // Yield if there's either a pending discrete or continuous input.
            if (isInputPending !== null) {
                return isInputPending(continuousOptions);
            }
        } else {
            // We've blocked the thread for a long time. Even if there's no pending
            // input, there may be some other scheduled work that we don't know about,
            // like a network event. Yield now.
            return true;
        }
    }

    // `isInputPending` isn't available. Yield now.
    // 让执行权给浏览器
    // if (extra) debugger
    return true;
}

function requestPaint() {
    if (enableIsInputPending && navigator !== undefined && navigator.scheduling !== undefined && navigator.scheduling.isInputPending !== undefined) {
        needsPaint = true;
    }

    // Since we yield every frame regardless, `requestPaint` has no effect.
}

/**
 * 强制执行一帧的时间
 * 范围：[5] + [8, 1000)
 */
function forceFrameRate(fps) {
    if (fps < 0 || fps > 125) {
        // Using console['error'] to evade Babel and ESLint
        console['error']('forceFrameRate takes a positive int between 0 and 125, ' + 'forcing frame rates higher than 125 fps is not supported',);
        return;
    }

    // 0 <= fps <= 125

    if (fps > 0) {
        // 0 < fps <= 125
        // 时间范围（ms）：[8, 1000)
        frameInterval = Math.floor(1000 / fps);
    } else {
        // reset the framerate
        // fps === 0
        frameInterval = frameYieldMs;
    }
}

/**
 * MessageChannel 调用的入口
 */
const performWorkUntilDeadline = () => {
    if (scheduledHostCallback !== null) {
        // 获取当前时间
        const currentTime = getCurrentTime();

        // Keep track of the start time so we can measure how long the main thread
        // has been blocked.
        // 保存当前时间当做开始时间
        startTime = currentTime;

        const hasTimeRemaining = true;

        // If a scheduler task throws, exit the current browser task so the
        // error can be observed.
        //
        // Intentionally not using a try-catch, since that makes some debugging
        // techniques harder. Instead, if `scheduledHostCallback` errors, then
        // `hasMoreWork` will remain true, and we'll continue the work loop.
        let hasMoreWork = true;
        try {
            // 执行 flushWork
            hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
        } finally {
            if (hasMoreWork) {
                // If there's more work, schedule the next message event at the end
                // of the preceding one.
                // 重新调度一次
                // console.log('存在工作没执行完成--')
                schedulePerformWorkUntilDeadline();
            } else {
                isMessageLoopRunning = false;
                scheduledHostCallback = null;
            }
        }
    } else {
        isMessageLoopRunning = false;
    }
    // 执行权让给浏览器之后，会有机会去绘制，所以重置这个变量
    // Yielding to the browser will give it a chance to paint, so we can
    // reset this.
    needsPaint = false;
};


//! 使用顺序：setImmediate -> MessageChannel -> setTimeout
let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === 'function') {
    // Node.js and old IE.
    // There's a few reasons for why we prefer setImmediate.
    //
    // Unlike MessageChannel, it doesn't prevent a Node.js process from exiting.
    // (Even though this is a DOM fork of the Scheduler, you could get here
    // with a mix of Node.js 15+, which has a MessageChannel, and jsdom.)
    // https://github.com/facebook/react/issues/20756
    //
    // But also, it runs earlier which is the semantic we want.
    // If other browsers ever implement it, it's better to use it.
    // Although both of these would be inferior to native scheduling.
    schedulePerformWorkUntilDeadline = () => {
        localSetImmediate(performWorkUntilDeadline);
    };
} else if (typeof MessageChannel !== 'undefined') {
    // DOM and Worker environments.
    // We prefer MessageChannel because of the 4ms setTimeout clamping.
    const channel = new MessageChannel();
    const port = channel.port2;

    // 启动调度
    channel.port1.onmessage = performWorkUntilDeadline;

    // 发送消息，启动一个宏任务，放入队列中
    schedulePerformWorkUntilDeadline = () => {
        port.postMessage(null);
    };
} else {
    // We should only fallback here in non-browser environments.
    schedulePerformWorkUntilDeadline = () => {
        localSetTimeout(performWorkUntilDeadline, 0);
    };
}

/**
 * 请求宿主回调
 */
function requestHostCallback(callback) {
    // MessageChannel 回调，即 flushWork
    scheduledHostCallback = callback;

    if (!isMessageLoopRunning) {
        // 加锁
        isMessageLoopRunning = true;

        // 调度工作直到时间结束
        schedulePerformWorkUntilDeadline();
    }
}

function requestHostTimeout(callback, ms) {
    taskTimeoutID = localSetTimeout(() => {
        callback(getCurrentTime());
    }, ms);
}

function cancelHostTimeout() {
    localClearTimeout(taskTimeoutID);
    taskTimeoutID = -1;
}

const unstable_requestPaint = requestPaint;

export {
    ImmediatePriority as unstable_ImmediatePriority,
    UserBlockingPriority as unstable_UserBlockingPriority,
    NormalPriority as unstable_NormalPriority,
    IdlePriority as unstable_IdlePriority,
    LowPriority as unstable_LowPriority,
    unstable_runWithPriority,
    unstable_next,
    unstable_scheduleCallback,
    unstable_cancelCallback,
    unstable_wrapCallback,
    unstable_getCurrentPriorityLevel,
    shouldYieldToHost as unstable_shouldYield,
    unstable_requestPaint,
    unstable_continueExecution,
    unstable_pauseExecution,
    unstable_getFirstCallbackNode,
    getCurrentTime as unstable_now,
    forceFrameRate as unstable_forceFrameRate,
};

export const unstable_Profiling = enableProfiling ? {
    startLoggingProfilingEvents, stopLoggingProfilingEvents,
} : null;

export const unstable_setDisableYieldValue = () => {
}
export const unstable_yieldValue = () => {
}
