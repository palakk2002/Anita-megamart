import { MongoClient, ObjectId } from 'mongodb';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const mongoUri = "mongodb+srv://anitamegamart_db_user:TUQArgxIYKPXb7na@cluster0.pllyl8j.mongodb.net/quickcom?retryWrites=true&w=majority&appName=Cluster0";

async function main() {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db("quickcom");
    
    const headerId = "6a71af27415ced00e0975f4e";
    const totalCount = await db.collection("products").countDocuments({ headerId: new ObjectId(headerId) });
    console.log(`Total products under headerId ${headerId} (Cold Drinks & Juices):`, totalCount);

    // Let's also check active + approved
    const activeApprovedCount = await db.collection("products").countDocuments({
      headerId: new ObjectId(headerId),
      status: "active",
      approvalStatus: "approved"
    });
    console.log(`Active & Approved products under headerId ${headerId}:`, activeApprovedCount);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

main();
