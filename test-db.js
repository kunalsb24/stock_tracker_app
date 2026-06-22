const mongoose = require('mongoose');

// The URI is automatically loaded from your .env file
const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
    if (!MONGODB_URI) {
        console.error('❌ Error: MONGODB_URI is not defined in your .env file.');
        process.exit(1);
    }

    console.log('⏳ Attempting to connect to MongoDB...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Successfully connected to MongoDB!');
        
        // Retrieve server information to confirm the connection is active
        const admin = mongoose.connection.db.admin();
        const info = await admin.serverStatus();
        console.log(`🚀 Server version: ${info.version}`);
        
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:');
        console.error(error.message);
        process.exit(1);
    }
}

testConnection();
