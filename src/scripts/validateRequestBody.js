export default function validateRequestBody(requestBody, attributes) {
  for (let field in requestBody) {
    if (!attributes.includes(`${field}`)) {
      return false;
    }
  }
  return true;
}
