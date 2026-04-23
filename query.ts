import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));

if (!config.projectId) {
  console.log("No firebase config");
  process.exit(1);
}

initializeApp({ projectId: config.projectId });
const db = getFirestore(config.firestoreDatabaseId);

async function run() {
    const doc = await db.collection('transactions').doc('kva1HrvPbeCqbmIA45Wc').get();
    console.log("Tx:", doc.data());
}

run().catch(console.error);
