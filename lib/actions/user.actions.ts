
import { connectToDatabase } from '@/database/mongoose';

export async function getAllUsersForNewsEmail() {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection failed');
    }

    // Better Auth stores users in 'user' collection
    const users = await db.collection('user').find({}).toArray();

    return users.map((user) => ({
      id: user.id || user._id.toString(),
      email: user.email,
      name: user.name,
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}
