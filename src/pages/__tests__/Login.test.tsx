import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../Login';
import { useStore } from '../../store/useStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: mockLogin,
    logout: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>,
  );
}

/** Get the password input by its explicit `id` to avoid collision with the
 *  toggle button whose aria-label also contains "password". */
function getPasswordInput() {
  return document.getElementById('password') as HTMLInputElement;
}

/** Get the email input by its explicit `id`. */
function getEmailInput() {
  return document.getElementById('email') as HTMLInputElement;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({ currentUserName: '', currentUserRole: 'Admin' });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Login page', () => {
  // ── 1. Renders login form with email and password fields ────────────────

  describe('rendering', () => {
    it('renders the login form heading and subtitle', () => {
      renderLogin();

      expect(
        screen.getByRole('heading', { name: /sign in to blimp/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/enter your credentials to access the platform/i),
      ).toBeInTheDocument();
    });

    it('renders an email input with correct attributes', () => {
      renderLogin();

      const emailInput = getEmailInput();
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'you@company.com');
    });

    it('renders a password input with correct attributes', () => {
      renderLogin();

      const passwordInput = getPasswordInput();
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('renders labels for email and password fields', () => {
      renderLogin();

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      // "password" matches both the label and the toggle button aria-label; use getAllByLabelText
      const passwordElements = screen.getAllByLabelText(/password/i);
      expect(passwordElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the Blimp logo/brand name', () => {
      renderLogin();

      expect(screen.getByText('Blimp')).toBeInTheDocument();
    });
  });

  // ── 2. Sign in button is present and clickable ──────────────────────────

  describe('sign in button', () => {
    it('renders a submit button with "Sign in" text', () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('is disabled when both fields are empty', () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeDisabled();
    });

    it('is enabled when both email and password have values', () => {
      renderLogin();

      fireEvent.change(getEmailInput(), {
        target: { value: 'admin@blimp.io' },
      });
      fireEvent.change(getPasswordInput(), {
        target: { value: 'admin123' },
      });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeEnabled();
    });

    it('calls login when clicked with filled fields', async () => {
      mockLogin.mockResolvedValue({ ok: false, error: 'test error' });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockLogin).toHaveBeenCalledWith('admin@blimp.io', 'admin123');
    });
  });

  // ── 3. Password visibility toggle ──────────────────────────────────────

  describe('password visibility toggle', () => {
    it('starts with password hidden (type="password")', () => {
      renderLogin();

      expect(getPasswordInput()).toHaveAttribute('type', 'password');
    });

    it('shows "Show password" button initially', () => {
      renderLogin();

      expect(
        screen.getByRole('button', { name: /show password/i }),
      ).toBeInTheDocument();
    });

    it('toggles input type to "text" when show password is clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      const toggleButton = screen.getByRole('button', {
        name: /show password/i,
      });
      await user.click(toggleButton);

      expect(getPasswordInput()).toHaveAttribute('type', 'text');
    });

    it('changes button aria-label to "Hide password" after toggling on', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(
        screen.getByRole('button', { name: /show password/i }),
      );

      expect(
        screen.getByRole('button', { name: /hide password/i }),
      ).toBeInTheDocument();
    });

    it('toggles back to type="password" when clicked again', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Toggle on
      await user.click(
        screen.getByRole('button', { name: /show password/i }),
      );
      expect(getPasswordInput()).toHaveAttribute('type', 'text');

      // Toggle off
      await user.click(
        screen.getByRole('button', { name: /hide password/i }),
      );
      expect(getPasswordInput()).toHaveAttribute('type', 'password');
    });

    it('preserves entered password value across toggles', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = getPasswordInput();
      await user.type(passwordInput, 'mysecretpass');

      // Toggle on
      await user.click(
        screen.getByRole('button', { name: /show password/i }),
      );
      expect(passwordInput).toHaveValue('mysecretpass');

      // Toggle off
      await user.click(
        screen.getByRole('button', { name: /hide password/i }),
      );
      expect(passwordInput).toHaveValue('mysecretpass');
    });
  });

  // ── 4. Shows error message on failed login ─────────────────────────────

  describe('error handling', () => {
    it('displays an error alert when login returns ok: false', async () => {
      mockLogin.mockResolvedValue({
        ok: false,
        error: 'Invalid email or password.',
      });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('alert')).toHaveTextContent(
        /invalid email or password/i,
      );
    });

    it('displays the default error message when error field is undefined', async () => {
      mockLogin.mockResolvedValue({ ok: false });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'user@example.com');
      await user.type(getPasswordInput(), 'pass');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByRole('alert')).toHaveTextContent(/login failed/i);
    });

    it('clears previous error when a new submission starts', async () => {
      // First call fails, second succeeds
      mockLogin
        .mockResolvedValueOnce({ ok: false, error: 'Bad credentials' })
        .mockResolvedValueOnce({
          ok: true,
          user: { name: 'Admin', email: 'admin@blimp.io', role: 'Admin' },
        });

      const user = userEvent.setup();
      renderLogin();

      // First submission - causes error
      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Bad credentials');
      });

      // Clear and retype password, submit again
      await user.clear(getPasswordInput());
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Error should be gone after second submission starts
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('does not show an error alert before any submission', () => {
      renderLogin();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ── 5. Shows loading state during submission ───────────────────────────

  describe('loading state', () => {
    it('shows "Signing in..." text while login is in progress', async () => {
      // Never-resolving promise to keep loading state
      mockLogin.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /signing in/i }),
        ).toBeInTheDocument();
      });
    });

    it('disables the submit button while loading', async () => {
      mockLogin.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /signing in/i }),
        ).toBeDisabled();
      });
    });

    it('restores button text to "Sign in" after failed login', async () => {
      mockLogin.mockResolvedValue({
        ok: false,
        error: 'Invalid credentials',
      });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /^sign in$/i }),
        ).toBeInTheDocument();
      });
    });
  });

  // ── 6. Successful login navigates to dashboard ─────────────────────────

  describe('successful login', () => {
    const successResult = {
      ok: true,
      user: { name: 'Admin User', email: 'admin@blimp.io', role: 'Admin' as const },
    };

    it('navigates to "/" after successful login', async () => {
      mockLogin.mockResolvedValue(successResult);
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('sets currentUserName in the store on success', async () => {
      mockLogin.mockResolvedValue(successResult);
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(useStore.getState().currentUserName).toBe('Admin User');
      });
    });

    it('sets currentUserRole in the store on success', async () => {
      mockLogin.mockResolvedValue(successResult);
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(useStore.getState().currentUserRole).toBe('Admin');
      });
    });

    it('sets correct role for Finance user', async () => {
      mockLogin.mockResolvedValue({
        ok: true,
        user: {
          name: 'Finance User',
          email: 'finance@blimp.io',
          role: 'Finance',
        },
      });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'finance@blimp.io');
      await user.type(getPasswordInput(), 'finance123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(useStore.getState().currentUserRole).toBe('Finance');
        expect(useStore.getState().currentUserName).toBe('Finance User');
      });
    });

    it('does not navigate on failed login', async () => {
      mockLogin.mockResolvedValue({ ok: false, error: 'Nope' });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'bad@example.com');
      await user.type(getPasswordInput(), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not update store on failed login', async () => {
      useStore.setState({ currentUserName: '', currentUserRole: 'Admin' });
      mockLogin.mockResolvedValue({ ok: false, error: 'Failed' });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'bad@example.com');
      await user.type(getPasswordInput(), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(useStore.getState().currentUserName).toBe('');
    });
  });

  // ── 7. Demo credential display ─────────────────────────────────────────

  describe('demo credentials', () => {
    it('displays the "Demo credentials" heading', () => {
      renderLogin();

      expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
    });

    it('displays admin demo credentials', () => {
      renderLogin();

      expect(screen.getByText('admin@blimp.io')).toBeInTheDocument();
      expect(screen.getByText('admin123')).toBeInTheDocument();
    });

    it('displays finance demo credentials', () => {
      renderLogin();

      expect(screen.getByText('finance@blimp.io')).toBeInTheDocument();
      expect(screen.getByText('finance123')).toBeInTheDocument();
    });

    it('displays viewer demo credentials', () => {
      renderLogin();

      expect(screen.getByText('viewer@blimp.io')).toBeInTheDocument();
      expect(screen.getByText('viewer123')).toBeInTheDocument();
    });

    it('displays role labels for each credential set', () => {
      renderLogin();

      // Role labels appear alongside credentials; "admin" also appears in the email
      expect(screen.getAllByText(/admin/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/finance/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/read only/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 8. Form validation (empty fields) ──────────────────────────────────

  describe('form validation', () => {
    it('disables submit button when both fields are empty', () => {
      renderLogin();

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeDisabled();
    });

    it('disables submit button when only email is filled', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeDisabled();
    });

    it('disables submit button when only password is filled', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(getPasswordInput(), 'admin123');

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeDisabled();
    });

    it('enables submit button when both fields are filled', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeEnabled();
    });

    it('disables submit button again if email is cleared after being filled', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeEnabled();

      await user.clear(getEmailInput());

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeDisabled();
    });

    it('disables submit button again if password is cleared after being filled', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123');

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeEnabled();

      await user.clear(getPasswordInput());

      expect(
        screen.getByRole('button', { name: /sign in/i }),
      ).toBeDisabled();
    });

    it('does not call login when submit button is disabled', async () => {
      renderLogin();

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Attempt to click disabled button
      fireEvent.click(submitButton);

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('uses noValidate on the form to handle validation in JS', () => {
      renderLogin();

      const form = document.querySelector('form');
      expect(form).toHaveAttribute('novalidate');
    });
  });

  // ── Additional integration-style tests ─────────────────────────────────

  describe('form interaction', () => {
    it('accepts typed input in the email field', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = getEmailInput();
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('accepts typed input in the password field', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = getPasswordInput();
      await user.type(passwordInput, 'supersecret');

      expect(passwordInput).toHaveValue('supersecret');
    });

    it('submits the form with correct email and password values', async () => {
      mockLogin.mockResolvedValue({ ok: false, error: 'test' });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'test@company.com');
      await user.type(getPasswordInput(), 'mypassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('test@company.com', 'mypassword');
    });

    it('can submit the form by pressing Enter in the password field', async () => {
      mockLogin.mockResolvedValue({ ok: false, error: 'test' });
      const user = userEvent.setup();
      renderLogin();

      await user.type(getEmailInput(), 'admin@blimp.io');
      await user.type(getPasswordInput(), 'admin123{Enter}');

      expect(mockLogin).toHaveBeenCalledWith('admin@blimp.io', 'admin123');
    });
  });
});
