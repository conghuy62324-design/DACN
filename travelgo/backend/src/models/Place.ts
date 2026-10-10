import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface PlaceAttributes {
  id: string;
  name: string;
  slug: string;
  category: 'tour' | 'attraction' | 'hotel' | 'restaurant';
  summary: string;
  description: string;
  city: string;
  province: string;
  address: string;
  latitude: number;
  longitude: number;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  bayesianRating: number;
  duration?: string;
  heroImage: string;
  galleryImages: string[];
  highlights: string[];
  amenities: string[];
  itinerary?: { day: number; title: string; desc: string; image?: string }[];
  isFeatured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlaceCreationAttributes extends Optional<PlaceAttributes, 'id' | 'rating' | 'reviewCount' | 'bayesianRating' | 'isFeatured'> {}

export class Place extends Model<PlaceAttributes, PlaceCreationAttributes> implements PlaceAttributes {
  public id!: string;
  public name!: string;
  public slug!: string;
  public category!: 'tour' | 'attraction' | 'hotel' | 'restaurant';
  public summary!: string;
  public description!: string;
  public city!: string;
  public province!: string;
  public address!: string;
  public latitude!: number;
  public longitude!: number;
  public priceFrom!: number;
  public rating!: number;
  public reviewCount!: number;
  public bayesianRating!: number;
  public duration?: string;
  public heroImage!: string;
  public galleryImages!: string[];
  public highlights!: string[];
  public amenities!: string[];
  public itinerary?: { day: number; title: string; desc: string; image?: string }[];
  public isFeatured!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Place.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.ENUM('tour', 'attraction', 'hotel', 'restaurant'),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    priceFrom: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 5.0,
    },
    reviewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    bayesianRating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 5.0,
    },
    duration: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    heroImage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    galleryImages: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    highlights: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    amenities: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    itinerary: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'places',
    timestamps: true,
    underscored: true,
  }
);
