import "dotenv/config";
import express from "express";
import cors from "cors";

import { authRouter } from "./routes/auth";
import { avitoAccountsRouter } from "./routes/avitoAccounts";
import { webhooksAvitoRouter } from "./routes/webhooksAvito";
import { chatsRouter } from "./routes/chats";
import { pipelinesRouter } from "./routes/pipelines";
import { dealsRouter } from "./routes/deals";
import { contactsRouter } from "./routes/contacts";
import { productsRouter } from "./routes/products";
import { invoicesRouter } from "./routes/invoices";
import { tasksRouter } from "./routes/tasks";
import { templatesRouter } from "./routes/templates";
import { usersRouter } from "./routes/users";
import { inventoryRouter } from "./routes/inventory";
import { notificationsRouter } from "./routes/notifications";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// Публичный роут - без авторизации, сюда стучится Авито
app.use("/webhooks", webhooksAvitoRouter);

// Все остальные роуты требуют Bearer-токен (см. middleware/auth.ts внутри роутеров)
app.use("/auth", authRouter);
app.use("/avito-accounts", avitoAccountsRouter);
app.use("/chats", chatsRouter);
app.use("/pipelines", pipelinesRouter);
app.use("/deals", dealsRouter);
app.use("/contacts", contactsRouter);
app.use("/products", productsRouter);
app.use("/invoices", invoicesRouter);
app.use("/tasks", tasksRouter);
app.use("/templates", templatesRouter);
app.use("/users", usersRouter);
app.use("/inventory", inventoryRouter);
app.use("/notifications", notificationsRouter);

// Единый обработчик ошибок
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err?.issues) {
    return res.status(400).json({ error: "Ошибка валидации данных", details: err.issues });
  }
  res.status(500).json({ error: err?.message || "Внутренняя ошибка сервера" });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Avito CRM backend запущен на порту ${PORT}`);
});
