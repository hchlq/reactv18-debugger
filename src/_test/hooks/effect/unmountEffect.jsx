import * as React from "react";
const { useState, useEffect, useLayoutEffect, useInsertionEffect } = React;
export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      {count === 0 && <UnmountChild />}
      <button
        onClick={() => {
          setCount(count + 1);
        }}
      >
        add
      </button>
    </div>
  );
}

function UnmountChild() {
    useEffect(() => {
        return () => {
            debugger
            console.log('useEffect 卸载了')
        }
    }, [])

    useLayoutEffect(() => {
        return () => {
            debugger
            console.log('useLayoutEffect 卸载了')
        }
    })

    useInsertionEffect(() => {
        return () => {
            debugger
            console.log('useInsertionEffect 卸载了')
        }
    })

    return <h1>UnmountChild</h1>
}