import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface PlaceAttributes {
  id: string;
  businessId?: string;
  name: string;
  slug: string;
  category: 'tour' | 'attraction' | 'hotel' | 'restaurant';
  summary: string;
  description: string;
  city: string;
  province: string;
  address: string;
  district?: string;
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
  openingHours: Record<string, unknown>;
  contactInfo: Record<string, unknown>;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlaceCreationAttributes extends Optional<PlaceAttributes, 'id' | 'businessId' | 'district' | 'rating' | 'reviewCount' | 'bayesianRating' | 'isFeatured' | 'openingHours' | 'contactInfo' | 'status'> {}

export class Place extends Model<PlaceAttributes, PlaceCreationAttributes> implements PlaceAttributes {
  public id!: string;
  public businessId?: string;
  public name!: string;
  public slug!: string;
  public category!: 'tour' | 'attraction' | 'hotel' | 'restaurant';
  public summary!: string;
  public description!: string;
  public city!: string;
  public province!: string;
  public address!: string;
  public district?: string;
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
  public openingHours!: Record<string, unknown>;
  public contactInfo!: Record<string, unknown>;
  public status!: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

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
    businessId: { type: DataTypes.UUID, allowNull: true },
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
    district: { type: DataTypes.STRING(120), allowNull: true },
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
    openingHours: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    contactInfo: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'APPROVED' },
  },
  {
    sequelize,
    tableName: 'places',
    timestamps: true,
    underscored: true,
  }
);
