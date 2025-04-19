export async function sendGetRequest(url, setState) {
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    setState(data);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}