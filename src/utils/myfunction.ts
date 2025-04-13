export const getCurrentTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;

  const hourStr = hours.toString().padStart(2, "0");
  const minuteStr = minutes.toString().padStart(2, "0");

  return `${hourStr}:${minuteStr} ${ampm}`;
};

export const getCurrentDay = () => {
  return new Date().toLocaleString("en-US", { weekday: "long" });
};