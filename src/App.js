import * as React from 'react'
function App() {
  const [count, setCount] = React.useState(0)
  return (
    <div className="App">
      <h1 onClick={() => setCount(count + 1)}>{ count }</h1>
      <header>header</header>
      <main>main</main>
      <footer>footer</footer>
    </div>
  );
}

export default App;
