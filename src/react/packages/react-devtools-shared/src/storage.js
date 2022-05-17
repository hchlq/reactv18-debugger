/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export function localStorageGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

export function localStorageRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {}
}

export function localStorageSetItem(key, value) {
  try {
    return localStorage.setItem(key, value);
  } catch (error) {}
}

export function sessionStorageGetItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

export function sessionStorageRemoveItem(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {}
}

export function sessionStorageSetItem(key, value) {
  try {
    return sessionStorage.setItem(key, value);
  } catch (error) {}
}
