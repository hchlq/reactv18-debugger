// import * as React from "react";
// import * as ReactDom from "react-dom";

// // import App from "./App";
// // import App from './_test/hooks/useState'
// // import App from './_test/hooks/ref'
// // import App from './_test/hooks/effect/useEffect'
// // import App from './_test/hooks/effect/update'
// // import App from "./_test/hooks/effect/useLayoutEffect";
// // import App from "./_test/hooks/effect/unmountEffect";
// // import App from './_test/hostComponent/updateQueue'
// // import App from './_test/hostComponent/onlyText'
// // import App from './_test/hooks/effect/useLayoutEffect-mul'
// // import App from './_test/firstRender/reconcileChild'
// import App from './_test/reconciler-child/update'


// ReactDom.createRoot(document.getElementById("root")).render(<App />);
// // HostText
// // ReactDom.createRoot(document.getElementById("root")).render('fjkdlsjaflk')
// // ReactDom.render(<App />, document.getElementById("root"));

// // switch (1) {
// //   case 1:
// //     console.log("===11");
// //   case 2:
// //     console.log("===222");
// //   case 3:
// //     console.log("===333");
// //   default:
// //     console.log("====default");
// // }
import * as  React  from "react";
import * as ReactDOM from 'react-dom/client'
const { Component, useEffect } = React


const Func = () => {
  useEffect(() => {
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


console.log(React.StrictMode)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
