
import { connectToDatabase } from '@/database/mongoose';
import Watchlist from '@/database/models/watchlist.model';

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection failed');
    }

    // Better Auth stores users in 'user' collection
    const user = await db.collection('user').findOne({ email });

    if (!user) {
      return [];
    }

    // userId in watchlist corresponds to the 'id' field in Better Auth user (or _id if id is missing)
    const userId = user.id || user._id.toString();

    const watchlistItems = await Watchlist.find({ userId });
    return watchlistItems.map((item) => item.symbol);
  } catch (error) {
    console.error(`Error fetching watchlist for ${email}:`, error);
    return [];
  }
}
