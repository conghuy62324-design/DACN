import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface AuditLogAttributes {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  createdAt?: Date;
}

type AuditLogCreationAttributes = Optional<AuditLogAttributes, 'id' | 'actorUserId' | 'previousData' | 'newData' | 'reason' | 'ipAddress'>;

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public actorUserId?: string;
  public action!: string;
  public entityType!: string;
  public entityId!: string;
  public previousData?: Record<string, unknown>;
  public newData?: Record<string, unknown>;
  public reason?: string;
  public ipAddress?: string;
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actorUserId: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entityType: { type: DataTypes.STRING(100), allowNull: false },
    entityId: { type: DataTypes.STRING(100), allowNull: false },
    previousData: { type: DataTypes.JSONB, allowNull: true },
    newData: { type: DataTypes.JSONB, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true },
  },
  { sequelize, tableName: 'audit_logs', timestamps: true, updatedAt: false, underscored: true }
);
