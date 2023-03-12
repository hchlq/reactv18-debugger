import * as React from "react";

function App() {
    return (
        <div className="App">
            {
                new Array(3000).fill(0).map((_, index) => <div>{index}</div>)
            }
        </div>
    );
}


export default App;

