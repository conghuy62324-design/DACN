import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface ReviewAttributes {
  id: string;
  targetType: 'place' | 'hotel' | 'restaurant' | 'tour';
  targetId: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  ratingService?: number;
  ratingPrice?: number;
  ratingLocation?: number;
  ratingExperience?: number;
  comment: string;
  images?: string[];
  bookingId?: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  verifiedAt?: Date;
  moderationStatus: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  source: 'LEGACY' | 'CUSTOMER_SUBMISSION';
  environment: 'production' | 'development' | 'test';
  criteriaProvided: { service: boolean; price: boolean; location: boolean; experience: boolean };
  aiUsageAllowed: boolean;
  consentPolicyVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewCreationAttributes extends Optional<ReviewAttributes,
  'id' | 'ratingService' | 'ratingPrice' | 'ratingLocation' | 'ratingExperience' | 'images' | 'userAvatar' |
  'bookingId' | 'verificationStatus' | 'verifiedAt' | 'moderationStatus' | 'moderationReason' | 'moderatedBy' |
  'moderatedAt' | 'source' | 'environment' | 'criteriaProvided' | 'aiUsageAllowed' | 'consentPolicyVersion'> {}

export class Review extends Model<ReviewAttributes, ReviewCreationAttributes> implements ReviewAttributes {
  public id!: string;
  public targetType!: 'place' | 'hotel' | 'restaurant' | 'tour';
  public targetId!: string;
  public userId?: string;
  public userName!: string;
  public userAvatar?: string;
  public rating!: number;
  public ratingService?: number;
  public ratingPrice?: number;
  public ratingLocation?: number;
  public ratingExperience?: number;
  public comment!: string;
  public images?: string[];
  public bookingId?: string;
  public verificationStatus!: 'VERIFIED' | 'UNVERIFIED';
  public verifiedAt?: Date;
  public moderationStatus!: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
  public moderationReason?: string;
  public moderatedBy?: string;
  public moderatedAt?: Date;
  public source!: 'LEGACY' | 'CUSTOMER_SUBMISSION';
  public environment!: 'production' | 'development' | 'test';
  public criteriaProvided!: { service: boolean; price: boolean; location: boolean; experience: boolean };
  public aiUsageAllowed!: boolean;
  public consentPolicyVersion?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Review.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    targetType: {
      type: DataTypes.ENUM('place', 'hotel', 'restaurant', 'tour'),
      allowNull: false,
    },
    targetId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    userAvatar: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
    },
    ratingService: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
    },
    ratingPrice: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
    },
    ratingLocation: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
    },
    ratingExperience: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    images: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    bookingId: { type: DataTypes.UUID, allowNull: true },
    verificationStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'UNVERIFIED' },
    verifiedAt: { type: DataTypes.DATE, allowNull: true },
    moderationStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'PUBLISHED' },
    moderationReason: { type: DataTypes.TEXT, allowNull: true },
    moderatedBy: { type: DataTypes.UUID, allowNull: true },
    moderatedAt: { type: DataTypes.DATE, allowNull: true },
    source: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'LEGACY' },
    environment: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'development' },
    criteriaProvided: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { service: false, price: false, location: false, experience: false },
    },
    aiUsageAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    consentPolicyVersion: { type: DataTypes.STRING(20), allowNull: true },
  },
  {
    sequelize,
    tableName: 'reviews',
    timestamps: true,
    updatedAt: 'updatedAt',
    underscored: true,
  }
);
