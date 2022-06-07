import * as React from "react";
const App = () => {
  const [count, setCount] = React.useState(0);
  return <h1 ref={{current: null}} onClick={ () => setCount(count + 1) }>{count}</h1>;
};

export default App;
