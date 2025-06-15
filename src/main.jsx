// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// 关键改变：不再导入任何 CSS 文件，样式将通过 CDN 和 App.jsx 内部管理
// import './tailwind.css'; // 删除或注释此行
// import './App.css'; // 删除或注释此行

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
