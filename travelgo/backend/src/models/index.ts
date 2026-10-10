import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { Place } from './Place.js';
import { Ticket } from './Ticket.js';
import { Booking } from './Booking.js';
import { BlogPost } from './BlogPost.js';
import { Review } from './Review.js';

// Associations
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(BlogPost, { foreignKey: 'authorId', as: 'blogPosts' });
BlogPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Place.hasMany(BlogPost, { foreignKey: 'placeId', as: 'relatedBlogs' });
BlogPost.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  User,
  Place,
  Ticket,
  Booking,
  BlogPost,
  Review,
};
