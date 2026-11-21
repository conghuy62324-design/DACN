import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/account/AuthLayout';
import { AccountField, PasswordField } from '../components/account/AccountField';
import { EMAIL_PATTERN, friendlyError, serverFieldErrors } from '../components/account/accountErrors';

type LoginField = 'email' | 'password';

// Cùng quy tắc với validateLogin phía máy chủ.
function validate(email: string, password: string): Partial<Record<LoginField, string>> {
  const errors: Partial<Record<LoginField, string>> = {};
  if (!email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Email chưa đúng định dạng, ví dụ: ten@example.com.';
  if (!password) errors.password = 'Vui lòng nhập mật khẩu.';
  else if (password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  return errors;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const focusFirst = (errors: Partial<Record<LoginField, string>>) => {
    if (errors.email) emailRef.current?.focus();
    else if (errors.password) passwordRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const errors = validate(email, password);
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) {
      focusFirst(errors);
      return;
    }
    setSubmitting(true);
    try {
      const signedInUser = await login(email, password);
      const fallback = signedInUser.roles.includes('SUPER_ADMIN')
        ? '/admin'
        : signedInUser.roles.includes('PARTNER')
          ? '/partner'
          : '/';
      const requestedDestination = (location.state as { from?: string } | null)?.from;
      const destination = requestedDestination?.startsWith('/') && !requestedDestination.startsWith('//') && !requestedDestination.includes('\\')
        ? requestedDestination
        : fallback;
      navigate(destination, { replace: true });
    } catch (requestError: any) {
      const { fields, rest } = serverFieldErrors<LoginField>(requestError, { email: /^Email/i, password: /^Mật khẩu/i });
      setFieldErrors(fields);
      if (Object.keys(fields).length) {
        setError(rest.join(' '));
        focusFirst(fields);
      } else {
        setError(friendlyError(requestError, 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearFieldError = (field: LoginField) => {
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <AuthLayout
      title="Đăng nhập"
      lead="Quản lý đơn đặt chỗ, chuyến đi đã lưu và danh sách yêu thích của bạn."
      photoId="hoi-an"
      photoTitle="Hành trình của bạn, ở cùng một nơi"
      photoText="Xem lại đơn đặt phòng, mở tiếp lịch trình và các địa điểm bạn đã lưu."
      footer={
        <>
          Chưa có tài khoản?
          <Link to="/register">Đăng ký thành viên mới</Link>
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
          id="login-email"
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
          inputRef={emailRef}
        />
        <PasswordField
          id="login-password"
          name="password"
          label="Mật khẩu"
          icon={Lock}
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearFieldError('password');
          }}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          readOnly={submitting}
          error={fieldErrors.password}
          inputRef={passwordRef}
        />
        <button type="submit" disabled={submitting} className="hg-acc-btn hg-acc-btn--cta hg-acc-btn--lg hg-acc-btn--block">
          {submitting && <Loader2 size={18} className="hg-acc-spin" aria-hidden="true" />}
          <span>{submitting ? 'Đang đăng nhập…' : 'Đăng nhập ngay'}</span>
        </button>
      </form>
    </AuthLayout>
  );
};
