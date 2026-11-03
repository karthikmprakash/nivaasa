export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "•••••";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)}••• ••${digits.slice(-3)}`;
}
