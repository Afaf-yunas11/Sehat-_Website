export default function validateRequestBody(requestBody, attributes)
 {
  for (let field in requestBody)   //loop through 
    
    {
    if (!attributes.includes(`${field}`)) {   /*does attribute has values  in request body*/
      return false;   
    }
  }
  return true;
}

//here export default a type of export where we can export only one function from file
//Basic Purpose
// - is to check  Are all the fields in requestBody allowed 
// - extra login validation