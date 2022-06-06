/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {getChildHostContext, getRootHostContext} from './ReactFiberHostConfig';
import {createCursor, push, pop} from './ReactFiberStack.old';

const NO_CONTEXT = {};

// 存放 context 的，即元素的命名空间
const contextStackCursor = createCursor(NO_CONTEXT);

// 存放 fiber
const contextFiberStackCursor = createCursor(NO_CONTEXT);

// 存放 根实例
const rootInstanceStackCursor = createCursor(NO_CONTEXT);

/**
 * 获取 context
 */
function requiredContext(c) {
  return c;
}

/**
 * 获取根容器实例
 */
function getRootHostContainer() {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  return rootInstance;
}

/**
 * 
 * @param {*} fiber 当前工作的的 fiber 
 * @param {*} nextRootInstance 根容器元素实例.  e.g. <div id="#root"></div>
 */
function pushHostContainer(fiber, nextRootInstance) {
  // Push current root instance onto the stack;
  // This allows us to reset root when portals are popped.
  push(rootInstanceStackCursor, nextRootInstance, fiber);

  // Track the context and the Fiber that provided it.
  // This enables us to pop only Fibers that provide unique contexts.
  push(contextFiberStackCursor, fiber, fiber);

  // Finally, we need to push the host context to the stack.
  // However, we can't just call getRootHostContext() and push it because
  // we'd have a different number of entries on the stack depending on
  // whether getRootHostContext() throws somewhere in renderer code or not.
  // So we push an empty value first. This lets us safely unwind on errors.
  push(contextStackCursor, NO_CONTEXT, fiber);

  // 获取 root 的 namespace，一般是 HTML_NAMESPACE
  const nextRootContext = getRootHostContext(nextRootInstance);

  // Now that we know this function doesn't throw, replace it.
  pop(contextStackCursor, fiber);
  push(contextStackCursor, nextRootContext, fiber);
}

/**
 * 恢复 contextStackCursor, contextFiberStackCursor, rootInstanceStackCursor 为栈中上一个的值
 */
function popHostContainer(fiber) {
  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
  pop(rootInstanceStackCursor, fiber);
}

/**
 * 获取 contextStackCursor 当前指针的值
 */
function getHostContext() {
  const context = requiredContext(contextStackCursor.current);
  return context;
}

/**
 * 存放元素标签的上下文
 */
function pushHostContext(fiber) {
  // 根实例
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  const context = requiredContext(contextStackCursor.current);
  
  const nextContext = getChildHostContext(context, fiber.type, rootInstance);
  // 一般来说：
  // rootInstance: <div id='root'></div>
  // context: http://www.w3.org/1999/xhtml
  // nextContext: http://www.w3.org/1999/xhtml

  // Don't push this Fiber's context unless it's unique.
  // console.log("nextContext: ", rootInstance, context)
  // 一般来说，context 会一样，不会走到下面
  if (context === nextContext) {
    return;
  }

  // Track the context and the Fiber that provided it.
  // This enables us to pop only Fibers that provide unique contexts.
  push(contextFiberStackCursor, fiber, fiber);
  push(contextStackCursor, nextContext, fiber);
}

/**
 * 恢复 contextStackCursor, contextFiberStackCursor 为栈中的上一个值
 */
function popHostContext(fiber) {
  // Do not pop unless this Fiber provided the current context.
  // pushHostContext() only pushes Fibers that provide unique contexts.
  if (contextFiberStackCursor.current !== fiber) {
    return;
  }

  pop(contextStackCursor, fiber);
  pop(contextFiberStackCursor, fiber);
}

export {
  getHostContext,
  getRootHostContainer,
  popHostContainer,
  popHostContext,
  pushHostContainer,
  pushHostContext,
};
