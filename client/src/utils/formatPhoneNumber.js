export default function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Match 3 digits, then 4 digits, then 3 digits
  const match = phone.match(/^(\d{3})(\d{4})(\d{3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
}