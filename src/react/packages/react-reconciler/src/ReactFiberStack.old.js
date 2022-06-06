/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

const valueStack = [];

let fiberStack;

if (__DEV__) {
  fiberStack = [];
}

let index = -1;

function createCursor(defaultValue) {
  return {
    current: defaultValue,
  };
}

function isEmpty() {
  return index === -1;
}

/**
 * 恢复 cursor 为上一个栈中的值
 * @param {*} cursor 
 * @param {*} fiber 
 * @returns 
 */
function pop(cursor, fiber) {
  if (index < 0) {
    // if (__DEV__) {
    //   console.error('Unexpected pop.');
    // }
    return;
  }

  // if (__DEV__) {
  //   if (fiber !== fiberStack[index]) {
  //     console.error('Unexpected Fiber popped.');
  //   }
  // }

  cursor.current = valueStack[index];

  valueStack[index] = null;

  if (__DEV__) {
    fiberStack[index] = null;
  }

  index--;
}

/**
 * 1. 存储 cursor 之前的值
 * 2. 更新 cursor 的值为 value
 */
function push(cursor, value, fiber) {
  index++;

  valueStack[index] = cursor.current;

  if (__DEV__) {
    fiberStack[index] = fiber;
  }

  cursor.current = value;
}

function checkThatStackIsEmpty() {
  if (__DEV__) {
    if (index !== -1) {
      console.error(
        'Expected an empty stack. Something was not reset properly.',
      );
    }
  }
}

function resetStackAfterFatalErrorInDev() {
  if (__DEV__) {
    index = -1;
    valueStack.length = 0;
    fiberStack.length = 0;
  }
}

export {
  createCursor,
  isEmpty,
  pop,
  push,
  // DEV only:
  checkThatStackIsEmpty,
  resetStackAfterFatalErrorInDev,
};
