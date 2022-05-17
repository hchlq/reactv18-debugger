/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

import {
  ID_ATTRIBUTE_NAME,
  ROOT_ATTRIBUTE_NAME,
  BOOLEAN,
  OVERLOADED_BOOLEAN,
  getPropertyInfo,
  isAttributeNameSafe,
  shouldIgnoreAttribute,
  shouldRemoveAttribute,
} from '../shared/DOMProperty';
import sanitizeURL from '../shared/sanitizeURL';
import quoteAttributeValueForBrowser from './quoteAttributeValueForBrowser';

/**
 * Operations for dealing with DOM properties.
 */

/**
 * Creates markup for the ID property.
 *
 * @param {string} id Unescaped ID.
 * @return {string} Markup string.
 */
export function createMarkupForID(id        )         {
  return ID_ATTRIBUTE_NAME + '=' + quoteAttributeValueForBrowser(id);
}

export function createMarkupForRoot()         {
  return ROOT_ATTRIBUTE_NAME + '=""';
}

/**
 * Creates markup for a property.
 *
 * @param {string} name
 * @param {*} value
 * @return {?string} Markup string, or null if the property was invalid.
 */
export function createMarkupForProperty(name        , value       )         {
  const propertyInfo = getPropertyInfo(name);
  if (name !== 'style' && shouldIgnoreAttribute(name, propertyInfo, false)) {
    return '';
  }
  if (shouldRemoveAttribute(name, value, propertyInfo, false)) {
    return '';
  }
  if (propertyInfo !== null) {
    const attributeName = propertyInfo.attributeName;
    const {type} = propertyInfo;
    if (type === BOOLEAN || (type === OVERLOADED_BOOLEAN && value === true)) {
      return attributeName + '=""';
    } else {
      if (propertyInfo.sanitizeURL) {
        value = '' + (value     );
        sanitizeURL(value);
      }
      return attributeName + '=' + quoteAttributeValueForBrowser(value);
    }
  } else if (isAttributeNameSafe(name)) {
    return name + '=' + quoteAttributeValueForBrowser(value);
  }
  return '';
}

/**
 * Creates markup for a custom property.
 *
 * @param {string} name
 * @param {*} value
 * @return {string} Markup string, or empty string if the property was invalid.
 */
export function createMarkupForCustomAttribute(
  name        ,
  value       ,
)         {
  if (!isAttributeNameSafe(name) || value == null) {
    return '';
  }
  return name + '=' + quoteAttributeValueForBrowser(value);
}
