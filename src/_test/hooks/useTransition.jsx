import * as React from 'react'

const App = () => {
    const [count, setCount] = React.useState(0)
    const [isPending, startTransition] = React.useTransition()
    console.log('render...')

    if (isPending) {
        return <h1>pending...</h1>
    }

    const handleClick = () => {
        // debugger
        startTransition(() => {
            setCount(count + 1)
        })
    }

    return <h1 onClick={handleClick}>{ count }</h1>
}



export default App