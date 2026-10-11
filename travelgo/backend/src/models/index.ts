import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { Place } from './Place.js';
import { Ticket } from './Ticket.js';
import { Booking } from './Booking.js';
import { BlogPost } from './BlogPost.js';
import { Review } from './Review.js';
import { UserRole } from './UserRole.js';
import { Business } from './Business.js';
import { BusinessMember } from './BusinessMember.js';
import { PartnerApplication } from './PartnerApplication.js';
import { AuditLog } from './AuditLog.js';
import { Tour } from './Tour.js';
import { TripSession } from './TripSession.js';
import { BookingStatusHistory } from './BookingStatusHistory.js';
import { UserEvent } from './UserEvent.js';
import { RecommendationImpression } from './RecommendationImpression.js';
import { AiModelRegistry } from './AiModelRegistry.js';

// Associations
User.hasMany(Booking, { foreignKey: 'userId', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Business.hasMany(Booking, { foreignKey: 'businessId', as: 'bookings' });
Booking.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
Booking.hasMany(BookingStatusHistory, { foreignKey: 'bookingId', as: 'statusHistory' });
BookingStatusHistory.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });
User.hasMany(TripSession, { foreignKey: 'userId', as: 'tripSessions' });
TripSession.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(BlogPost, { foreignKey: 'authorId', as: 'blogPosts' });
BlogPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Place.hasMany(BlogPost, { foreignKey: 'placeId', as: 'relatedBlogs' });
BlogPost.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });
Business.hasMany(Place, { foreignKey: 'businessId', as: 'places' });
Place.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
Business.hasMany(Tour, { foreignKey: 'businessId', as: 'tours' });
Tour.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
Tour.belongsToMany(Place, { through: 'tour_places', foreignKey: 'tourId', otherKey: 'placeId', as: 'places', timestamps: false });
Place.belongsToMany(Tour, { through: 'tour_places', foreignKey: 'placeId', otherKey: 'tourId', as: 'tours', timestamps: false });
Business.hasMany(Ticket, { foreignKey: 'businessId', as: 'tickets' });
Ticket.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
Place.hasMany(Ticket, { foreignKey: 'placeId', as: 'tickets' });
Ticket.belongsTo(Place, { foreignKey: 'placeId', as: 'place' });
Tour.hasMany(Ticket, { foreignKey: 'tourId', as: 'tickets' });
Ticket.belongsTo(Tour, { foreignKey: 'tourId', as: 'tour' });
Business.hasMany(BlogPost, { foreignKey: 'businessId', as: 'blogPosts' });
BlogPost.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(UserEvent, { foreignKey: 'userId', as: 'intelligenceEvents' });
UserEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RecommendationImpression, { foreignKey: 'userId', as: 'recommendationImpressions' });
RecommendationImpression.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(PartnerApplication, { foreignKey: 'userId', as: 'partnerApplications' });
PartnerApplication.belongsTo(User, { foreignKey: 'userId', as: 'applicant' });

User.belongsToMany(Business, { through: BusinessMember, foreignKey: 'userId', otherKey: 'businessId', as: 'businesses' });
Business.belongsToMany(User, { through: BusinessMember, foreignKey: 'businessId', otherKey: 'userId', as: 'members' });
Business.hasMany(BusinessMember, { foreignKey: 'businessId', as: 'memberships' });
BusinessMember.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
BusinessMember.belongsTo(User, { foreignKey: 'userId', as: 'member' });

export {
  sequelize,
  User,
  Place,
  Ticket,
  Booking,
  BlogPost,
  Review,
  UserRole,
  Business,
  BusinessMember,
  PartnerApplication,
  AuditLog,
  Tour,
  TripSession,
  BookingStatusHistory,
  UserEvent,
  RecommendationImpression,
  AiModelRegistry,
};
