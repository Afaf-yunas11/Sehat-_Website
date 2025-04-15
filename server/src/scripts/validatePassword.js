export default function validatePassword(password)
 {
  const regex = /^(?=.*[A-Z])(?=.*[a-z])[0-9A-Za-z]+$/;
  return regex.test(password);

}


/*regex is a js object .checks pattern here and pass it to test function that either return true or false*/
/*✅ Checks if a password contains at least one uppercase letter, at least one lowercase letter, and only letters and numbers (no special characters like !@#).*/