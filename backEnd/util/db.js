import { MongoClient } from 'mongodb'

const MONGO_URL = process.env.MONGO_URL
const DB = process.env.MONGO_DB

const client = new MongoClient(MONGO_URL)

let db

export const getDb = async () => {
    if (db) {
        return db
    }
    await client.connect()
    db = client.db(DB)
    return db
}