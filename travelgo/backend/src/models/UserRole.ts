import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Role } from '../types/auth.js';

interface UserRoleAttributes {
  id: string;
  userId: string;
  role: Role;
  grantedBy?: string;
  createdAt?: Date;
}

type UserRoleCreationAttributes = Optional<UserRoleAttributes, 'id' | 'grantedBy'>;

export class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
  public id!: string;
  public userId!: string;
  public role!: Role;
  public grantedBy?: string;
  public readonly createdAt!: Date;
}

UserRole.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), allowNull: false },
    grantedBy: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, tableName: 'user_roles', timestamps: true, updatedAt: false, underscored: true }
);
