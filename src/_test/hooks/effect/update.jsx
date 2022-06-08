import * as React from "react";

export default function App() {
  const [count, setCount] = React.useState(0);
  React.useLayoutEffect(() => {
    // debugger
    setCount(1);
  }, []);
  return <h1>{count}</h1>;
}
