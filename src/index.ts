import express, { Request, Response } from "express";
import { clientBot, sendMessages } from "./lib/client";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { IPendaftar, IUserState } from "./utils/types/general";
import { getCurrentTime, getCurrentDay } from "./utils/myfunction";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as cron from "node-cron";

dotenv.config();

const app = express();
const PORT = 3000;
const users: Record<number, IUserState> = {};
const FILE_PATH = path.resolve(__dirname, "../register_users.json");

const allowedHari = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const allowedJam = [
  "07:00 AM", "07:15 AM", "07:30 AM", "07:45 AM",
  "08:00 AM", "08:15 AM", "08:30 AM", "08:45 AM",
  "09:00 AM", "09:15 AM", "09:30 AM", "09:45 AM",
  "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
  "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
  "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
  "01:00 PM", "01:15 PM", "01:30 PM", "01:45 PM",
  "02:00 PM", "02:15 PM", "02:30 PM", "02:45 PM",
  "03:00 PM", "03:15 PM", "03:30 PM", "03:45 PM",
  "04:00 PM", "04:15 PM", "04:30 PM", "04:45 PM",
  "05:00 PM", "05:15 PM", "05:30 PM", "05:45 PM",
  "06:00 PM"
];

if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, "[]", "utf8");
}

const generateKeyboard = (options: string[]): TelegramBot.SendMessageOptions => {
  return {
    reply_markup: {
      inline_keyboard: options.map((option) => [{ text: option, callback_data: option }]),
    },
  };
};

clientBot.on("message", (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim() || "";
  const lowerText = text.toLowerCase();

  console.log(`[INFO] Received message from ${chatId}: ${text}`);

  if (lowerText === "/start") {
    sendMessages(chatId, "👋 Selamat datang! Ketik `/register` untuk memulai pendaftaran.", "Markdown");
    return;
  }

  if (lowerText === "/register") {
    const existing: IPendaftar[] = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    const isAlreadyRegistered = existing.some((p) => p.telegram_id === chatId);

    if (isAlreadyRegistered) {
      sendMessages(chatId, "✅ Kamu sudah terdaftar sebelumnya.");
      return;
    }

    users[chatId] = { step: "nama" };
    sendMessages(chatId, "📝 Untuk memulai pendaftaran, silakan ketik nama lengkap Anda.", "Markdown");
    return;
  }

  const user = users[chatId];
  
  if (user) {
    switch (user.step) {
      case "nama":
        user.nama = text;
        user.step = "hari";
        sendMessages(chatId, "📅 Sekarang pilih hari jadwal kamu:", "Markdown", generateKeyboard(allowedHari));
        break;

      case "hari":
        sendMessages(chatId, "🕒 Pilih jam jadwal kamu:", "Markdown", generateKeyboard(allowedJam));
        break;

      case "jam":
        const jam = text.toUpperCase();
        if (!allowedJam.includes(jam)) {
          sendMessages(chatId, `❌ Jam tidak valid. Pilih salah satu: ${allowedJam.join(", ")}`, "Markdown");
          return;
        }

        user.jam = jam;
        user.step = "done";

        const data: IPendaftar[] = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
        const newEntry: IPendaftar = {
          telegram_id: chatId,
          nama: user.nama!,
          hari: user.hari!,
          jam: user.jam!,
          tanggal: new Date().toISOString(),
        };

        data.push(newEntry);
        fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");

        const summary = `📥 Pendaftaran Baru:\n👤 Nama: ${newEntry.nama}\n📅 Hari: ${newEntry.hari}\n⏰ Jam: ${newEntry.jam}`;
        sendMessages(chatId, `✅ Pendaftaran berhasil!\n\n${summary}`, "Markdown");
        sendMessages(process.env.TELEGRAM_ADMIN_CHAT_ID!, summary);

        delete users[chatId];
        break;
    }
  }
});

clientBot.on("callback_query", (query) => {
  const chatId = query.message?.chat.id;
  const selectedData = query.data;
  const messageId = query.message?.message_id;

  if (!chatId || !selectedData || !messageId) return;

  const user = users[chatId];
  
  if (user) {
    switch (user.step) {
      case "hari":
        if (allowedHari.includes(selectedData)) {
          user.hari = selectedData;
          user.step = "jam";

          clientBot.deleteMessage(chatId, messageId);
          sendMessages(chatId, "🕒 Pilih jam kunjungan kamu:", "Markdown", generateKeyboard(allowedJam));
        } else {
          sendMessages(chatId, "❌ Hari tidak valid, silakan pilih lagi.", "Markdown");
        }
        break;

      case "jam":
        if (allowedJam.includes(selectedData)) {
          user.jam = selectedData;
          user.step = "done";

          clientBot.deleteMessage(chatId, messageId);

          const data: IPendaftar[] = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
          const newEntry: IPendaftar = {
            telegram_id: chatId,
            nama: user.nama!,
            hari: user.hari!,
            jam: user.jam!,
            tanggal: new Date().toISOString(),
          };

          data.push(newEntry);
          fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");

          const summary = `📥 Pendaftaran Baru:\n👤 Nama: ${newEntry.nama}\n📅 Hari: ${newEntry.hari}\n⏰ Jam: ${newEntry.jam}`;
          sendMessages(chatId, `✅ Pendaftaran berhasil!\n\n${summary}`, "Markdown");
          sendMessages(process.env.TELEGRAM_ADMIN_CHAT_ID!, summary);

          delete users[chatId];
        } else {
          sendMessages(chatId, "❌ Jam tidak valid, silakan pilih lagi.", "Markdown");
        }
        break;
    }
  }

  clientBot.answerCallbackQuery(query.id);
});

app.get("/users", (req: Request, res: Response) => {
  try {
    const data: IPendaftar[] = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    res.status(200).json(data); 
  } catch (error) {
    console.error("Error reading users data:", error);
    res.status(500).json({ error: "Failed to load user data." });
  }
});

cron.schedule("*/1 * * * *", () => {
  const data: IPendaftar[] = JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
  const currentTime = getCurrentTime();
  const currentDay = getCurrentDay();

  console.log(`[CRON] Checking schedule for ${currentDay}, ${currentTime}`);

  data.forEach((user) => {
    if (user.hari === currentDay && user.jam === currentTime) {
      sendMessages(user.telegram_id, "🚮 Hai! Ini pengingat jadwal kamu untuk membuang sampah hari ini yaa 🌱");
    }
  });
});

app.listen(PORT, () => {
  console.log("BOT IS RUNNING...");
  console.log("Listening for incoming messages...");
  console.log(`Server is running at http://localhost:${PORT}`);
});