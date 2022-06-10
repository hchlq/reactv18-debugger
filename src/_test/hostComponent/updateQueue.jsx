import * as React from "react";
const { useState } = React;

export default function App() {
  const [className, setClassName] = useState("foo");
  return (
    <h1
      className={className}
      onClick={() => setClassName(Math.random().toString())}
    >
      { className }
    </h1>
  );
}
