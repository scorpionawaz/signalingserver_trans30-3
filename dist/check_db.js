"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const config_1 = require("./config");
async function findCollection() {
    console.log('Connecting to:', config_1.config.mongodbUrl);
    const client = new mongodb_1.MongoClient(config_1.config.mongodbUrl);
    try {
        await client.connect();
        const db = client.db('talker');
        const collections = await db.listCollections().toArray();
        console.log('Checking collections:', collections.map(c => c.name).join(', '));
        for (const col of collections) {
            const doc = await db.collection(col.name).findOne({
                name: 'Nirmal Server AI'
            });
            if (doc) {
                console.log(`\n!!! FOUND IN COLLECTION: ${col.name} !!!\n`);
                return;
            }
        }
        console.log('\nNot found in any collection\n');
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await client.close();
    }
}
findCollection();
//# sourceMappingURL=check_db.js.map