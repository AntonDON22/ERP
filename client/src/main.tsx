import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/errorLogger"; // Подключаем глобальный обработчик ошибок

createRoot(document.getElementById("root")!).render(<App />);
