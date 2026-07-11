import { FC, StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

const App: FC = () => (
  <div>
    主应用 - 基座 - 用来加载子应用的 [<a href="./">SystemJS</a>] [
    <a href="./custom.html">CustomSystemJS</a>]
  </div>
)

ReactDOM.createRoot(document.getElementById('base')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
