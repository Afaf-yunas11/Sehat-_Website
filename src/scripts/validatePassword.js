export default function validatePassword(password) {
  const regex = /^(?=.*[A-Z])(?=.*[a-z])[0-9A-Za-z]+$/;
  return regex.test(password);
}