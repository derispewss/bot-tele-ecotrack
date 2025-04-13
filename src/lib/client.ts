import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
dotenv.config();

export const clientBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });

export const sendMessages = (
  chatId: string | number,
  text: string,
  parse_mode?: "Markdown" | "HTML",
  extraOptions?: TelegramBot.SendMessageOptions
) => {
  return clientBot.sendMessage(chatId, text, {
    parse_mode,
    ...extraOptions,
  });
};
