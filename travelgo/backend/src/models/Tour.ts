import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export type ResourceStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type TourCategory = 'beach' | 'culture' | 'nature' | 'resort' | 'adventure';

export interface TourAttributes {
  id: string; businessId: string; title: string; slug: string; destinationCity: string; departureCity: string;
  durationDays: number; durationNights: number; category: TourCategory; summary: string; description: string;
  meetingPoint?: string; heroImage: string; galleryImages: string[]; priceVND: number; capacity: number;
  availableCapacity: number; rating: number; reviewCount: number; inclusions: string[]; exclusions: string[];
  highlights: string[]; itineraryDays: Array<{ day: number; title: string; description: string; places: string[]; image?: string }>;
  startDate?: string; endDate?: string; isTemplate: boolean; status: ResourceStatus; createdAt?: Date; updatedAt?: Date;
}

type TourCreationAttributes = Optional<TourAttributes, 'id' | 'meetingPoint' | 'galleryImages' | 'capacity' | 'availableCapacity' | 'rating' | 'reviewCount' | 'inclusions' | 'exclusions' | 'highlights' | 'itineraryDays' | 'startDate' | 'endDate' | 'isTemplate' | 'status'>;

export class Tour extends Model<TourAttributes, TourCreationAttributes> implements TourAttributes {
  public id!: string; public businessId!: string; public title!: string; public slug!: string; public destinationCity!: string;
  public departureCity!: string; public durationDays!: number; public durationNights!: number; public category!: TourCategory;
  public summary!: string; public description!: string; public meetingPoint?: string; public heroImage!: string; public galleryImages!: string[];
  public priceVND!: number; public capacity!: number; public availableCapacity!: number; public rating!: number; public reviewCount!: number;
  public inclusions!: string[]; public exclusions!: string[]; public highlights!: string[]; public itineraryDays!: TourAttributes['itineraryDays'];
  public startDate?: string; public endDate?: string; public isTemplate!: boolean; public status!: ResourceStatus;
  public readonly createdAt!: Date; public readonly updatedAt!: Date;
}

Tour.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false }, title: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), allowNull: false, unique: true }, destinationCity: { type: DataTypes.STRING(120), allowNull: false },
  departureCity: { type: DataTypes.STRING(120), allowNull: false }, durationDays: { type: DataTypes.INTEGER, allowNull: false },
  durationNights: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, category: { type: DataTypes.STRING(30), allowNull: false },
  summary: { type: DataTypes.TEXT, allowNull: false }, description: { type: DataTypes.TEXT, allowNull: false },
  meetingPoint: { type: DataTypes.TEXT, allowNull: true }, heroImage: { type: DataTypes.TEXT, allowNull: false },
  galleryImages: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, priceVND: { type: DataTypes.DECIMAL(15,2), allowNull: false, field: 'price_vnd' },
  capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, availableCapacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  rating: { type: DataTypes.DECIMAL(3,2), allowNull: false, defaultValue: 0 }, reviewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  inclusions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, exclusions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  highlights: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] }, itineraryDays: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  startDate: { type: DataTypes.DATEONLY, allowNull: true }, endDate: { type: DataTypes.DATEONLY, allowNull: true },
  isTemplate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'DRAFT' },
}, { sequelize, tableName: 'tours', timestamps: true, underscored: true });
