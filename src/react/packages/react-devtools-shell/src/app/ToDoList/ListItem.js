/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {memo, useCallback} from 'react';
import styles from './ListItem.css';

function ListItem({item, removeItem, toggleItem}) {
  const handleDelete = useCallback(() => {
    removeItem(item);
  }, [item, removeItem]);

  const handleToggle = useCallback(() => {
    toggleItem(item);
  }, [item, toggleItem]);

  return (
    <li className={styles.ListItem}>
      <button className={styles.IconButton} onClick={handleDelete}>
        🗑
      </button>
      <label className={styles.Label}>
        <input
          className={styles.Input}
          checked={item.isComplete}
          onChange={handleToggle}
          type="checkbox"
        />{' '}
        {item.text}
      </label>
    </li>
  );
}

export default memo(ListItem);
