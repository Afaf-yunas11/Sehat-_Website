import crypto from "crypto";

export default function sha256(input) {

  return crypto.createHash('sha256').update(input).digest('hex');
}

//crypto.createHash('sha256')  create a hash object
//createhash ->update it acc to input then convert it in hex
// SHA-256 = Secure Hash Algorithm 256-bit 

/*What This Code Does:
It takes an input string, hashes it using SHA-256, and returns the hashed value as a hex string.*/

/*sha256("password123");
 Output: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"*/