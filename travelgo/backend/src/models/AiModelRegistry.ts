import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class AiModelRegistry extends Model {
  public modelVersion!: string;
  public modelType!: 'REVIEW_INTELLIGENCE' | 'QUALITY_SCORER' | 'RECOMMENDER' | 'ITINERARY';
  public status!: 'DRAFT' | 'SHADOW' | 'ACTIVE' | 'RETIRED';
  public artifactChecksum!: string;
  public datasetVersion!: string;
  public metrics!: Record<string, number>;
  public featureConfig!: Record<string, unknown>;
  public activatedAt?: Date;
  public readonly createdAt!: Date;
}

AiModelRegistry.init({
  modelVersion: { type: DataTypes.STRING(100), primaryKey: true },
  modelType: { type: DataTypes.STRING(40), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
  artifactChecksum: { type: DataTypes.CHAR(64), allowNull: false },
  datasetVersion: { type: DataTypes.STRING(100), allowNull: false },
  metrics: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  featureConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  activatedAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'ai_model_registry', timestamps: true, updatedAt: false, underscored: true });
