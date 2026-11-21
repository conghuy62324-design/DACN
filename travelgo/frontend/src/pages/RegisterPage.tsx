import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/account/AuthLayout';
import { AccountField, PasswordField } from '../components/account/AccountField';
import { EMAIL_PATTERN, friendlyError, serverFieldErrors } from '../components/account/accountErrors';

type RegisterField = 'fullName' | 'email' | 'phone' | 'password';
type RegisterErrors = Partial<Record<RegisterField, string>>;

const ORDER: RegisterField[] = ['fullName', 'email', 'phone', 'password'];

// Cùng quy tắc với validateRegistration phía máy chủ.
function validate(values: Record<RegisterField, string>): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!values.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
  else if (values.fullName.trim().length < 2) errors.fullName = 'Họ tên phải có ít nhất 2 ký tự.';
  if (!values.email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_PATTERN.test(values.email)) errors.email = 'Email chưa đúng định dạng, ví dụ: ten@example.com.';
  if (!values.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
  else if (!/^[0-9+ ()-]{9,20}$/.test(values.phone)) errors.phone = 'Số điện thoại chỉ gồm chữ số (có thể có +, khoảng trắng), từ 9 ký tự.';
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.';
  else if (values.password.length < 8 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số.';
  }
  return errors;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const refs = {
    fullName: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  const focusFirst = (errors: RegisterErrors) => {
    const first = ORDER.find((field) => errors[field]);
    if (first) refs[first].current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const errors = validate({ fullName, email, phone, password });
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      focusFirst(errors);
      return;
    }
    setSubmitting(true);
    try {
      await register({ fullName, email, phone, password });
      navigate('/', { replace: true });
    } catch (requestError: any) {
      const { fields, rest } = serverFieldErrors<RegisterField>(requestError, {
        fullName: /^Họ tên/i,
        email: /^Email/i,
        phone: /^Số điện thoại/i,
        password: /^Mật khẩu/i,
      });
      if (requestError?.code === 'EMAIL_EXISTS') {
        fields.email = 'Email này đã được dùng cho một tài khoản khác. Hãy đăng nhập hoặc dùng email khác.';
      }
      setFieldErrors(fields);
      if (Object.keys(fields).length) {
        setError(rest.join(' '));
        focusFirst(fields);
      } else {
        setError(friendlyError(requestError, 'Không thể đăng ký tài khoản. Vui lòng thử lại.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearFieldError = (field: RegisterField) => {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <AuthLayout
      title="Đăng ký thành viên"
      lead="Tạo tài khoản để đặt chỗ, lưu chuyến đi và địa điểm yêu thích."
      photoId="da-nang"
      photoTitle="Lên kế hoạch cho chuyến đi tiếp theo"
      photoText="Một tài khoản cho đơn đặt phòng, lịch trình và danh sách yêu thích."
      footer={
        <>
          Đã có tài khoản?
          <Link to="/login">Đăng nhập ngay</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="hg-auth__form" noValidate aria-busy={submitting}>
        {error && (
          <div role="alert" className="hg-acc-notice hg-acc-notice--error">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <AccountField
          id="register-name"
          name="fullName"
          label="Họ và tên"
          icon={User}
          value={fullName}
          onChange={(value) => {
            setFullName(value);
            clearFieldError('fullName');
          }}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          readOnly={submitting}
          error={fieldErrors.fullName}
          inputRef={refs.fullName}
        />
        <AccountField
          id="register-email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          value={email}
          onChange={(value) => {
            setEmail(value);
            clearFieldError('email');
          }}
          placeholder="ten@example.com"
          autoComplete="email"
          inputMode="email"
          readOnly={submitting}
          error={fieldErrors.email}
          inputRef={refs.email}
        />
        <AccountField
          id="register-phone"
          name="phone"
          type="tel"
          label="Số điện thoại"
          icon={Phone}
          value={phone}
          onChange={(value) => {
            setPhone(value);
            clearFieldError('phone');
          }}
          placeholder="0901234567"
          autoComplete="tel"
          inputMode="tel"
          readOnly={submitting}
          error={fieldErrors.phone}
          inputRef={refs.phone}
        />
        <PasswordField
          id="register-password"
          name="password"
          label="Mật khẩu"
          icon={Lock}
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearFieldError('password');
          }}
          placeholder="Tạo mật khẩu"
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự, gồm cả chữ và số."
          readOnly={submitting}
          error={fieldErrors.password}
          inputRef={refs.password}
        />
        <button type="submit" disabled={submitting} className="hg-acc-btn hg-acc-btn--cta hg-acc-btn--lg hg-acc-btn--block">
          {submitting && <Loader2 size={18} className="hg-acc-spin" aria-hidden="true" />}
          <span>{submitting ? 'Đang tạo tài khoản…' : 'Đăng ký tài khoản'}</span>
        </button>
      </form>
    </AuthLayout>
  );
};
