import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface TelemetryConsentAttributes {
  userId: string;
  analyticsEnabled: boolean;
  personalizationEnabled: boolean;
  policyVersion: string;
  consentedAt?: Date;
  updatedAt?: Date;
}

type TelemetryConsentCreationAttributes = Optional<TelemetryConsentAttributes,
  'analyticsEnabled' | 'personalizationEnabled' | 'policyVersion' | 'consentedAt' | 'updatedAt'>;

export class TelemetryConsent extends Model<TelemetryConsentAttributes, TelemetryConsentCreationAttributes>
  implements TelemetryConsentAttributes {
  public userId!: string;
  public analyticsEnabled!: boolean;
  public personalizationEnabled!: boolean;
  public policyVersion!: string;
  public consentedAt?: Date;
  public readonly updatedAt!: Date;
}

TelemetryConsent.init({
  userId: { type: DataTypes.UUID, primaryKey: true },
  analyticsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  personalizationEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  policyVersion: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '1.0' },
  consentedAt: { type: DataTypes.DATE, allowNull: true },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'user_telemetry_consents',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updatedAt',
  underscored: true,
});
