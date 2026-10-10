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
  createdAt?: Date;
}

export interface ReviewCreationAttributes extends Optional<ReviewAttributes, 'id' | 'ratingService' | 'ratingPrice' | 'ratingLocation' | 'ratingExperience' | 'images' | 'userAvatar'> {}

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

  public readonly createdAt!: Date;
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
      defaultValue: 5.0,
    },
    ratingPrice: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 5.0,
    },
    ratingLocation: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 5.0,
    },
    ratingExperience: {
      type: DataTypes.DECIMAL(2, 1),
      defaultValue: 5.0,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    images: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'reviews',
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
