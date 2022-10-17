import * as React from "react";

function App() {
    const [state, setState] = React.useState(0)

    React.useSyncExternalStore(() => {
    }, React.useCallback(() => 1, []))

    const handleClick = async () => {
        // 以 Transition 的优先级更新
        React.startTransition(() => {
            setState(state + 1)
        })
    }

    return (
        <div className="App">
            <h2>{state}</h2>
            <input type='text' />
            <button onMouseDown={handleClick} >+1</button>
        </div>
    );
}


export default App;

