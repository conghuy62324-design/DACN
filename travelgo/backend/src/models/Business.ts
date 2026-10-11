import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export const BUSINESS_TYPES = ['HOTEL', 'HOMESTAY', 'RESORT', 'RESTAURANT', 'TOUR_OPERATOR'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

interface BusinessAttributes {
  id: string;
  name: string;
  type: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt?: Date;
  updatedAt?: Date;
}

type BusinessCreationAttributes = Optional<BusinessAttributes, 'id' | 'latitude' | 'longitude' | 'status'>;

export class Business extends Model<BusinessAttributes, BusinessCreationAttributes> implements BusinessAttributes {
  public id!: string;
  public name!: string;
  public type!: BusinessType;
  public email!: string;
  public phone!: string;
  public address!: string;
  public city!: string;
  public latitude?: number;
  public longitude?: number;
  public status!: 'ACTIVE' | 'SUSPENDED';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Business.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM(...BUSINESS_TYPES), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    city: { type: DataTypes.STRING(120), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'SUSPENDED'), defaultValue: 'ACTIVE' },
  },
  { sequelize, tableName: 'businesses', timestamps: true, underscored: true }
);
