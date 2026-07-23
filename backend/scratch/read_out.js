import fs from "fs";

function readOutFile() {
  try {
    const data = fs.readFileSync("c:\\Users\\HP\\Desktop\\Anita-megamart\\backend\\out.txt", "utf16le");
    const lines = data.split("\n");
    console.log("Total lines in out.txt:", lines.length);
    
    // Print lines containing MongoDB or connected
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes("mongo") || line.toLowerCase().includes("connect")) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
      }
    });
  } catch (error) {
    console.error("Error reading file:", error.message);
  }
}

readOutFile();
