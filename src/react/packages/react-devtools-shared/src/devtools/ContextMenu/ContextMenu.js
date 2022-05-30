/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import {useContext, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {RegistryContext} from './Contexts';

import styles from './ContextMenu.css';

function repositionToFit(element, pageX, pageY) {
  const ownerWindow = element.ownerDocument.defaultView;
  if (element !== null) {
    if (pageY + element.offsetHeight >= ownerWindow.innerHeight) {
      if (pageY - element.offsetHeight > 0) {
        element.style.top = `${pageY - element.offsetHeight}px`;
      } else {
        element.style.top = '0px';
      }
    } else {
      element.style.top = `${pageY}px`;
    }

    if (pageX + element.offsetWidth >= ownerWindow.innerWidth) {
      if (pageX - element.offsetWidth > 0) {
        element.style.left = `${pageX - element.offsetWidth}px`;
      } else {
        element.style.left = '0px';
      }
    } else {
      element.style.left = `${pageX}px`;
    }
  }
}

const HIDDEN_STATE = {
  data: null,
  isVisible: false,
  pageX: 0,
  pageY: 0,
};

export default function ContextMenu({children, id}) {
  const {hideMenu, registerMenu} = useContext(RegistryContext);

  const [state, setState] = useState(HIDDEN_STATE);

  const bodyAccessorRef = useRef(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const element = bodyAccessorRef.current;
    if (element !== null) {
      const ownerDocument = element.ownerDocument;
      containerRef.current = ownerDocument.querySelector(
        '[data-react-devtools-portal-root]',
      );

      if (containerRef.current == null) {
        console.warn(
          'DevTools tooltip root node not found; context menus will be disabled.',
        );
      }
    }
  }, []);

  useEffect(() => {
    const showMenuFn = ({data, pageX, pageY}) => {
      setState({data, isVisible: true, pageX, pageY});
    };
    const hideMenuFn = () => setState(HIDDEN_STATE);
    return registerMenu(id, showMenuFn, hideMenuFn);
  }, [id]);

  useLayoutEffect(() => {
    if (!state.isVisible) {
      return;
    }

    const menu = menuRef.current;
    const container = containerRef.current;
    if (container !== null) {
      const hideUnlessContains = (event) => {
        if (!menu.contains(event.target)) {
          hideMenu();
        }
      };

      const ownerDocument = container.ownerDocument;
      ownerDocument.addEventListener('mousedown', hideUnlessContains);
      ownerDocument.addEventListener('touchstart', hideUnlessContains);
      ownerDocument.addEventListener('keydown', hideUnlessContains);

      const ownerWindow = ownerDocument.defaultView;
      ownerWindow.addEventListener('resize', hideMenu);

      repositionToFit(menu, state.pageX, state.pageY);

      return () => {
        ownerDocument.removeEventListener('mousedown', hideUnlessContains);
        ownerDocument.removeEventListener('touchstart', hideUnlessContains);
        ownerDocument.removeEventListener('keydown', hideUnlessContains);

        ownerWindow.removeEventListener('resize', hideMenu);
      };
    }
  }, [state]);

  if (!state.isVisible) {
    return <div ref={bodyAccessorRef} />;
  } else {
    const container = containerRef.current;
    if (container !== null) {
      return createPortal(
        <div ref={menuRef} className={styles.ContextMenu}>
          {children(state.data)}
        </div>,
        container,
      );
    } else {
      return null;
    }
  }
}
