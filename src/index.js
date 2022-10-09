<<<<<<< HEAD
import * as  React  from "react";
import * as ReactDOM from 'react-dom/client'
const { Component, useEffect } = React


const Func = () => {
  useEffect(() => {
    // debugger
    console.log("func 挂载啦");
  }, []);
  return <div>func</div>;
};

class Cls extends Component {
  componentDidMount() {
    console.log("class 挂载啦");
  }

  render() {
    return <div>class</div>
  }
}

function App() {
  return (
    <>
      <Func />
      <Cls />
    </>
  );
}

export default App;


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
=======
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
>>>>>>> 087a2d5336e43a2642521ab971c099ff18029ae2
