// Điểm import duy nhất cho component back-office (Gói E sở hữu; Gói F chỉ import từ đây).
export { BackofficeShell, useBackofficeBreadcrumbs } from './BackofficeShell';
export type { BackofficeShellProps, NavGroup, NavItem, Crumb } from './BackofficeShell';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { BoTabs } from './BoTabs';
export type { BoTabItem, BoTabsProps } from './BoTabs';
export { BoButton, BoLinkButton, boButtonClass } from './BoButton';
export type { BoButtonProps, BoButtonVariant } from './BoButton';
export { BoMenu } from './BoMenu';
export type { BoMenuItem, BoMenuProps } from './BoMenu';
export { KpiTile } from './KpiTile';
export type { KpiTileProps } from './KpiTile';
export { DataTable } from './DataTable';
export type { DataColumn, DataTableProps, RowAction, SortState, Pagination } from './DataTable';
export { FilterBar, FilterSelect } from './FilterBar';
export type { FilterBarProps, FilterSelectProps } from './FilterBar';
export { StatusPill } from './StatusPill';
export type { StatusPillProps } from './StatusPill';
export { DetailDrawer, DrawerSection, DescList } from './DetailDrawer';
export type { DetailDrawerProps, DescItem } from './DetailDrawer';
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps, ConfirmReasonConfig } from './ConfirmDialog';
export { AuditList } from './AuditList';
export type { AuditItem, AuditListProps } from './AuditList';
export { FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';
export {
  TextField,
  NumberField,
  SelectField,
  TextareaField,
  DateField,
  DateTimeField,
  CheckboxGroup,
  TriStateField,
  Switch,
  FieldShell,
  RequiredMark,
} from './fields';
export type { SelectOption, CheckboxOption } from './fields';
export { StickySaveBar } from './StickySaveBar';
export type { StickySaveBarProps } from './StickySaveBar';
export { LoadingState, EmptyState, ErrorState, ApiPendingState, ConflictBanner, Alert, Skeleton, isConflictError } from './States';
export { ToastProvider, useToast } from './Toast';
export type { ToastInput, ToastTone } from './Toast';
export { ImageDropzone } from './ImageDropzone';
export type { ImageDropzoneProps } from './ImageDropzone';
export { statusMeta, statusLabel, paymentLabel, roleLabel, businessTypeLabel, actionLabel, entityLabel } from './statusLabels';
export type { StatusDomain, StatusTone, StatusMeta } from './statusLabels';
export { BO_FEATURES, BO_FEATURE_CONTRACT, isBoFeatureOn } from './features';
export type { BoFeature } from './features';
export { fmtDateTime, fmtDate, fmtTime, fmtShortDateTime, fmtNumber, fmtVnd, fmtPercent, initials, errorMessage, errorCode, errorStatus } from './format';
export { useQueryParams, useDebounced } from './useQueryParams';
export { Portal, useFocusTrap, useScrollLock } from './overlay';
