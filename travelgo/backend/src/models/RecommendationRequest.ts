import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export interface RecommendationRequestAttributes {
  requestId: string;
  userId: string;
  sessionId: string;
  uiSurface: string;
  filters: Record<string, unknown>;
  explicitPreferences: string[];
  algorithmVersion: string;
  policyVersion: string;
  modelVersion: string;
  configVersion: string;
  environment: 'production' | 'development' | 'test';
  analyticsConsent: boolean;
  personalizationConsent: boolean;
  experimentKey?: string;
  experimentVariant: string;
  assignmentProbability?: number;
  createdAt?: Date;
  expiresAt: Date;
}

type RecommendationRequestCreationAttributes = Optional<RecommendationRequestAttributes,
  'filters' | 'explicitPreferences' | 'experimentKey' | 'experimentVariant' | 'assignmentProbability' | 'createdAt'>;

export class RecommendationRequest extends Model<RecommendationRequestAttributes, RecommendationRequestCreationAttributes>
  implements RecommendationRequestAttributes {
  public requestId!: string;
  public userId!: string;
  public sessionId!: string;
  public uiSurface!: string;
  public filters!: Record<string, unknown>;
  public explicitPreferences!: string[];
  public algorithmVersion!: string;
  public policyVersion!: string;
  public modelVersion!: string;
  public configVersion!: string;
  public environment!: 'production' | 'development' | 'test';
  public analyticsConsent!: boolean;
  public personalizationConsent!: boolean;
  public experimentKey?: string;
  public experimentVariant!: string;
  public assignmentProbability?: number;
  public readonly createdAt!: Date;
  public expiresAt!: Date;
}

RecommendationRequest.init({
  requestId: { type: DataTypes.UUID, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  sessionId: { type: DataTypes.STRING(120), allowNull: false },
  uiSurface: { type: DataTypes.STRING(60), allowNull: false },
  filters: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  explicitPreferences: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  algorithmVersion: { type: DataTypes.STRING(100), allowNull: false },
  policyVersion: { type: DataTypes.STRING(100), allowNull: false },
  modelVersion: { type: DataTypes.STRING(100), allowNull: false },
  configVersion: { type: DataTypes.STRING(100), allowNull: false },
  environment: { type: DataTypes.STRING(20), allowNull: false },
  analyticsConsent: { type: DataTypes.BOOLEAN, allowNull: false },
  personalizationConsent: { type: DataTypes.BOOLEAN, allowNull: false },
  experimentKey: { type: DataTypes.STRING(100), allowNull: true },
  experimentVariant: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'CONTROL' },
  assignmentProbability: { type: DataTypes.DECIMAL(6, 5), allowNull: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'recommendation_requests', timestamps: true, updatedAt: false, underscored: true });

