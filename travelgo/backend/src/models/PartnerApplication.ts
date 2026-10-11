import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { BusinessType, BUSINESS_TYPES } from './Business.js';

export const PARTNER_APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_MORE_INFO', 'SUSPENDED'] as const;
export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

interface PartnerApplicationAttributes {
  id: string;
  userId: string;
  representativeName: string;
  businessName: string;
  businessType: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  imageUrls: string[];
  verificationDetails: Record<string, unknown>;
  status: PartnerApplicationStatus;
  decisionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type PartnerApplicationCreationAttributes = Optional<
  PartnerApplicationAttributes,
  'id' | 'latitude' | 'longitude' | 'imageUrls' | 'verificationDetails' | 'status' | 'decisionReason' | 'reviewedBy' | 'reviewedAt'
>;

export class PartnerApplication extends Model<PartnerApplicationAttributes, PartnerApplicationCreationAttributes> implements PartnerApplicationAttributes {
  public id!: string;
  public userId!: string;
  public representativeName!: string;
  public businessName!: string;
  public businessType!: BusinessType;
  public email!: string;
  public phone!: string;
  public address!: string;
  public city!: string;
  public latitude?: number;
  public longitude?: number;
  public imageUrls!: string[];
  public verificationDetails!: Record<string, unknown>;
  public status!: PartnerApplicationStatus;
  public decisionReason?: string;
  public reviewedBy?: string;
  public reviewedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PartnerApplication.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    representativeName: { type: DataTypes.STRING(120), allowNull: false },
    businessName: { type: DataTypes.STRING(255), allowNull: false },
    businessType: { type: DataTypes.ENUM(...BUSINESS_TYPES), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    city: { type: DataTypes.STRING(120), allowNull: false },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    imageUrls: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    verificationDetails: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.ENUM(...PARTNER_APPLICATION_STATUSES), defaultValue: 'PENDING' },
    decisionReason: { type: DataTypes.TEXT, allowNull: true },
    reviewedBy: { type: DataTypes.UUID, allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'partner_applications', timestamps: true, underscored: true }
);
