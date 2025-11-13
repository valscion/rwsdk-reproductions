# Streamed page with a server action

```
npm install
npm run dev
```

## Successful steps:

1. Navigate to http://localhost:5173/
2. Click the button
3. See the button name is logged to server console
4. The button is still visible on the page. All good.

## Failure reproduction:

1. Navigate to http://localhost:5173/stream
2. Click the button
3. See the button name is logged to server console
4. The page turned white as the entire app crashed. There's an error in browser logs:

```
Uncaught error:  Error: Connection closed.
    close react-server-dom-webpack-client.browser.development.js:4579
    progress react-server-dom-webpack-client.browser.development.js:4743
    promise callback*progress react-server-dom-webpack-client.browser.development.js:4745
    promise callback*startReadingFromStream react-server-dom-webpack-client.browser.development.js:4752
    createFromFetch react-server-dom-webpack-client.browser.development.js:5002
    promise callback*node_modules/react-server-dom-webpack/cjs/react-server-dom-webpack-client.browser.development.js/exports.createFromFetch react-server-dom-webpack-client.browser.development.js:4984
    fetchCallServer client.js:44
    callServer client.js:92
    action react-server-dom-webpack-client.browser.development.js:802
    serverAction rwsdk_worker.js:140
    React 16
    initClient client.js:123
    <anonymous> client.tsx:3
 

Component stack:
Content@http://localhost:5173/node_modules/.vite/deps/chunk-GQZH24O2.js?v=55322f16:265:63 <anonymous code>:1:147461
```
