import * as React from "react";

const { useState, useLayoutEffect } = React;
export default function App() {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    console.log("执行挂载");
    return () => {
      console.log("卸载了～");
    };
  }, [count]);

  return (
    <div>
      <h1 onClick={() => setCount(count + 1)}>{count}</h1>;
      {count === 0 && <h2>111</h2>}
    </div>
  );
}
