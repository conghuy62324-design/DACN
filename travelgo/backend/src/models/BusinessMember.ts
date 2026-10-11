import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface BusinessMemberAttributes {
  id: string;
  businessId: string;
  userId: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

type BusinessMemberCreationAttributes = Optional<BusinessMemberAttributes, 'id' | 'permissions'>;

export class BusinessMember extends Model<BusinessMemberAttributes, BusinessMemberCreationAttributes> implements BusinessMemberAttributes {
  public id!: string;
  public businessId!: string;
  public userId!: string;
  public permissions!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BusinessMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: ['MANAGE_BUSINESS', 'MANAGE_BOOKINGS'] },
  },
  { sequelize, tableName: 'business_members', timestamps: true, underscored: true }
);
