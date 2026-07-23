import http from "http";

function pingServer() {
  http.get("http://localhost:7000/", (res) => {
    console.log("Server responded with status code:", res.statusCode);
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
      console.log("Server response body:", data);
    });
  }).on("error", (err) => {
    console.error("Could not reach localhost:7000:", err.message);
  });
}

pingServer();
