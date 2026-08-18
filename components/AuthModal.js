import { signUpEmailPassword, signInEmailPassword, verifyOTP, isSupabaseConfigured, signInWithGoogle, resetPasswordForEmail, updateUserPassword } from '../services/supabaseClient.js';
import { icons } from '../utils/helpers.js';
import gsap from 'gsap';



let _onAuthSuccess = null;
let _onGuestMode = null;
let _isSignUpMode = false;
let _otpType = 'signup';

export function renderAuthModal(container, { onAuthSuccess, onGuestMode, mode = 'default' }) {
  _onAuthSuccess = onAuthSuccess;
  _onGuestMode = onGuestMode;
  _isSignUpMode = false; 

  container.innerHTML = `
    <div class="auth-backdrop" id="auth-backdrop">
      <div class="auth-particles" id="auth-particles"></div>
      <div class="auth-card" id="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">${icons.waveform}</div>
          <h1 class="auth-logo-text">PhantomBeats</h1>
          <p class="auth-logo-tagline">Your music, your way</p>
        </div>

        
        <div class="auth-step" id="auth-step-email">
          <h2 class="auth-step-title" id="auth-main-title">Sign in to continue</h2>
          <p class="auth-step-desc" id="auth-main-desc">Welcome back to PhantomBeats</p>
          
          <div class="auth-input-group hidden" id="auth-name-group">
            <label class="auth-label" for="auth-name">Display Name</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">${icons.userIcon}</span>
              <input type="text" id="auth-name" class="auth-input" placeholder="Your Name" autocomplete="name" />
            </div>
          </div>
          
          <div class="auth-input-group">
            <label class="auth-label" for="auth-email">Email address</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">${icons.music}</span>
              <input type="email" id="auth-email" class="auth-input" placeholder="you@example.com" autocomplete="email" />
            </div>
          </div>

          <div class="auth-input-group">
            <label class="auth-label" for="auth-password">Password</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">${icons.lockIcon}</span>
              <input type="password" id="auth-password" class="auth-input" placeholder="••••••••" autocomplete="current-password" />
            </div>
            <div class="auth-forgot-link-container">
              <button id="auth-forgot-link" class="auth-text-link" style="font-size: 12px; margin-top: 6px;">Forgot Password?</button>
            </div>
          </div>

          <button class="auth-btn auth-btn-primary" id="auth-submit-btn">
            <span class="auth-btn-text" id="auth-submit-text">Sign In</span>
            <span class="auth-btn-loader hidden" id="auth-submit-loader">
              <span class="auth-spinner"></span>
            </span>
          </button>
          
          <button class="auth-btn auth-btn-ghost" id="auth-google-btn" style="margin-top: 8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style="margin-left: 8px;">Continue with Google</span>
          </button>
          
          <div class="auth-toggle-mode">
            <span id="auth-toggle-text">Don't have an account?</span> 
            <button id="auth-toggle-btn" class="auth-text-link">Sign Up</button>
          </div>

          <div class="auth-error hidden" id="auth-main-error"></div>
          
          <div class="auth-divider">
            <span>or</span>
          </div>
          <button class="auth-btn auth-btn-ghost" id="auth-guest-btn">
            Continue as Guest
          </button>
          <p class="auth-guest-note">Guest data is saved locally and won't sync across devices</p>
        </div>

        
        <div class="auth-step hidden" id="auth-step-otp">
          <button class="auth-back-btn" id="auth-back-btn">
            ${icons.chevronLeft} <span>Back</span>
          </button>
          <h2 class="auth-step-title">Check your email</h2>
          <p class="auth-step-desc" id="auth-otp-desc">Enter the 6-digit code sent to your email to verify your account.</p>
          <div class="auth-otp-inputs" id="auth-otp-inputs">
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="0" inputmode="numeric" autocomplete="one-time-code" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="1" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="2" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="3" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="4" inputmode="numeric" />
            <input type="text" class="auth-otp-digit" maxlength="1" data-index="5" inputmode="numeric" />
          </div>
          <button class="auth-btn auth-btn-primary" id="auth-verify-otp">
            <span class="auth-btn-text">Verify Account</span>
            <span class="auth-btn-loader hidden" id="auth-verify-loader">
              <span class="auth-spinner"></span>
            </span>
          </button>
          <div class="auth-error hidden" id="auth-otp-error"></div>
        </div>

        
        <div class="auth-step hidden" id="auth-step-forgot">
          <button class="auth-back-btn" id="auth-forgot-back-btn">
            ${icons.chevronLeft} <span>Back</span>
          </button>
          <h2 class="auth-step-title">Reset Password</h2>
          <p class="auth-step-desc">Enter your email and we'll send you a link to reset your password.</p>
          
          <div class="auth-input-group">
            <label class="auth-label" for="auth-forgot-email">Email address</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">${icons.music}</span>
              <input type="email" id="auth-forgot-email" class="auth-input" placeholder="you@example.com" />
            </div>
          </div>
          <button class="auth-btn auth-btn-primary" id="auth-forgot-submit-btn">
            <span class="auth-btn-text" id="auth-forgot-submit-text">Send Reset Link</span>
            <span class="auth-btn-loader hidden" id="auth-forgot-submit-loader">
              <span class="auth-spinner"></span>
            </span>
          </button>
          <div class="auth-error hidden" id="auth-forgot-error"></div>
          <div class="auth-success hidden" id="auth-forgot-success" style="color: var(--accent-primary); font-size: 13px; margin-top: 12px; text-align: center;"></div>
        </div>

        
        <div class="auth-step hidden" id="auth-step-update-password">
          <h2 class="auth-step-title">Update Password</h2>
          <p class="auth-step-desc">Enter your new password below.</p>
          
          <div class="auth-input-group">
            <label class="auth-label" for="auth-update-password">New Password</label>
            <div class="auth-input-wrapper">
              <span class="auth-input-icon">${icons.lockIcon}</span>
              <input type="password" id="auth-update-password" class="auth-input" placeholder="••••••••" />
            </div>
          </div>
          <button class="auth-btn auth-btn-primary" id="auth-update-submit-btn">
            <span class="auth-btn-text" id="auth-update-submit-text">Update Password</span>
            <span class="auth-btn-loader hidden" id="auth-update-submit-loader">
              <span class="auth-spinner"></span>
            </span>
          </button>
          <div class="auth-error hidden" id="auth-update-error"></div>
        </div>

      </div>
    </div>
  `;

  _initParticles(container.querySelector('#auth-particles'));
  _bindMainStep(container);
  _bindOTPStep(container);
  _bindForgotStep(container);
  _bindUpdatePasswordStep(container);

  if (mode === 'recovery') {
    const stepMain = container.querySelector('#auth-step-email');
    const stepUpdate = container.querySelector('#auth-step-update-password');
    stepMain.classList.add('hidden');
    stepUpdate.classList.remove('hidden');
  }

  _animateIn(container);
}

export function hideAuthModal(container) {
  const backdrop = container.querySelector('#auth-backdrop');
  if (!backdrop) return;
  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: () => {
      container.innerHTML = '';
    },
  });
}

function _animateIn(container) {
  const backdrop = container.querySelector('#auth-backdrop');
  const card = container.querySelector('#auth-card');
  gsap.set(backdrop, { opacity: 0 });
  gsap.set(card, { y: 40, scale: 0.95, opacity: 0 });
  gsap.to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  gsap.to(card, { y: 0, scale: 1, opacity: 1, duration: 0.6, delay: 0.15, ease: 'back.out(1.2)' });
}

function _initParticles(particlesEl) {
  if (!particlesEl) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'auth-particle';
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.width = p.style.height = `${2 + Math.random() * 4}px`;
    p.style.animationDelay = `${Math.random() * 6}s`;
    p.style.animationDuration = `${4 + Math.random() * 6}s`;
    particlesEl.appendChild(p);
  }
}

let _currentEmail = '';

function _bindMainStep(container) {
  const nameGroup = container.querySelector('#auth-name-group');
  const nameInput = container.querySelector('#auth-name');
  const emailInput = container.querySelector('#auth-email');
  const passwordInput = container.querySelector('#auth-password');
  const submitBtn = container.querySelector('#auth-submit-btn');
  const guestBtn = container.querySelector('#auth-guest-btn');
  const toggleBtn = container.querySelector('#auth-toggle-btn');
  const toggleText = container.querySelector('#auth-toggle-text');
  const titleEl = container.querySelector('#auth-main-title');
  const descEl = container.querySelector('#auth-main-desc');
  const errorEl = container.querySelector('#auth-main-error');
  const loader = container.querySelector('#auth-submit-loader');
  const btnText = container.querySelector('#auth-submit-text');
  const googleBtn = container.querySelector('#auth-google-btn');
  const forgotLink = container.querySelector('#auth-forgot-link');
  const forgotContainer = container.querySelector('.auth-forgot-link-container');

  toggleBtn.addEventListener('click', () => {
    _isSignUpMode = !_isSignUpMode;
    if (_isSignUpMode) {
      titleEl.textContent = 'Create an account';
      descEl.textContent = 'Join PhantomBeats to sync your music anywhere';
      btnText.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account?';
      toggleBtn.textContent = 'Sign In';
      nameGroup.classList.remove('hidden');
      if (forgotContainer) forgotContainer.classList.add('hidden');
    } else {
      titleEl.textContent = 'Sign in to continue';
      descEl.textContent = 'Welcome back to PhantomBeats';
      btnText.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleBtn.textContent = 'Sign Up';
      nameGroup.classList.add('hidden');
      if (forgotContainer) forgotContainer.classList.remove('hidden');
    }
    errorEl.classList.add('hidden');
  });

  googleBtn?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
      // Redirect happens automatically
    } catch (err) {
      _showError(errorEl, err.message || 'Google Sign In failed.');
    }
  });

  forgotLink?.addEventListener('click', () => {
    const stepMain = container.querySelector('#auth-step-email');
    const stepForgot = container.querySelector('#auth-step-forgot');
    gsap.to(stepMain, {
      x: -30, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        stepMain.classList.add('hidden');
        stepForgot.classList.remove('hidden');
        gsap.set(stepForgot, { x: 30, opacity: 0 });
        gsap.to(stepForgot, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    });
  });

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !email.includes('@')) {
      _showError(errorEl, 'Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      _showError(errorEl, 'Password must be at least 6 characters');
      return;
    }

    if (!isSupabaseConfigured()) {
      _showError(errorEl, 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      return;
    }

    _currentEmail = email;
    _showLoading(submitBtn, btnText, loader);

    try {
      if (_isSignUpMode) {
        const displayName = nameInput.value.trim();
        const result = await signUpEmailPassword(email, password, displayName);
        _hideLoading(submitBtn, btnText, loader);
        if (result.session) {
          if (_onAuthSuccess) _onAuthSuccess(result);
          hideAuthModal(container);
        } else {
          _otpType = 'signup';
          _switchToOTP(container, email);
        }
      } else {
        const result = await signInEmailPassword(email, password);
        _hideLoading(submitBtn, btnText, loader);
        if (_onAuthSuccess) _onAuthSuccess(result);
        hideAuthModal(container);
      }
    } catch (err) {
      _hideLoading(submitBtn, btnText, loader);
      _showError(errorEl, err.message || 'Authentication failed. Please try again.');
    }
  });

  const enterHandler = (e) => {
    if (e.key === 'Enter') submitBtn.click();
  };
  emailInput.addEventListener('keydown', enterHandler);
  passwordInput.addEventListener('keydown', enterHandler);

  guestBtn.addEventListener('click', () => {
    if (_onGuestMode) _onGuestMode();
    hideAuthModal(container);
  });
}

function _switchToOTP(container, email) {
  const stepMain = container.querySelector('#auth-step-email');
  const stepOTP = container.querySelector('#auth-step-otp');
  const otpDesc = container.querySelector('#auth-otp-desc');

  otpDesc.textContent = `Enter the 6-digit code sent to ${email} to verify your account.`;

  gsap.to(stepMain, {
    x: -30, opacity: 0, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      stepMain.classList.add('hidden');
      stepOTP.classList.remove('hidden');
      gsap.set(stepOTP, { x: 30, opacity: 0 });
      gsap.to(stepOTP, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      const firstDigit = container.querySelector('.auth-otp-digit[data-index="0"]');
      if (firstDigit) firstDigit.focus();
    }
  });
}

function _bindOTPStep(container) {
  const digits = container.querySelectorAll('.auth-otp-digit');
  const verifyBtn = container.querySelector('#auth-verify-otp');
  const backBtn = container.querySelector('#auth-back-btn');
  const errorEl = container.querySelector('#auth-otp-error');
  const loader = container.querySelector('#auth-verify-loader');
  const btnText = verifyBtn.querySelector('.auth-btn-text');
  digits.forEach((input, i) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && i < 5) {
        digits[i + 1].focus();
      }
      if (i === 5 && val) {
        const code = Array.from(digits).map(d => d.value).join('');
        if (code.length === 6) verifyBtn.click();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) {
        digits[i - 1].focus();
      }
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      paste.split('').forEach((ch, j) => {
        if (digits[j]) digits[j].value = ch;
      });
      if (paste.length === 6) {
        digits[5].focus();
        setTimeout(() => verifyBtn.click(), 100);
      } else if (paste.length > 0) {
        digits[Math.min(paste.length, 5)].focus();
      }
    });
  });

  verifyBtn.addEventListener('click', async () => {
    const code = Array.from(digits).map(d => d.value).join('');
    if (code.length !== 6) {
      _showError(errorEl, 'Please enter all 6 digits');
      return;
    }

    _showLoading(verifyBtn, btnText, loader);

    try {
      const result = await verifyOTP(_currentEmail, code, _otpType);
      _hideLoading(verifyBtn, btnText, loader);
      
      if (_otpType === 'recovery') {
        const stepOTP = container.querySelector('#auth-step-otp');
        const stepUpdate = container.querySelector('#auth-step-update-password');
        gsap.to(stepOTP, {
          x: -30, opacity: 0, duration: 0.25, ease: 'power2.in',
          onComplete: () => {
            stepOTP.classList.add('hidden');
            stepUpdate.classList.remove('hidden');
            gsap.set(stepUpdate, { x: 30, opacity: 0 });
            gsap.to(stepUpdate, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
          }
        });
      } else {
        if (_onAuthSuccess) _onAuthSuccess(result);
        hideAuthModal(container);
      }
    } catch (err) {
      _hideLoading(verifyBtn, btnText, loader);
      _showError(errorEl, err.message || 'Invalid code. Try again.');
      digits.forEach(d => { d.value = ''; });
      digits[0].focus();
    }
  });

  backBtn.addEventListener('click', () => {
    const stepOTP = container.querySelector('#auth-step-otp');
    const targetStep = _otpType === 'recovery' ? container.querySelector('#auth-step-forgot') : container.querySelector('#auth-step-email');
    
    gsap.to(stepOTP, {
      x: 30, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        stepOTP.classList.add('hidden');
        digits.forEach(d => { d.value = ''; });
        targetStep.classList.remove('hidden');
        gsap.set(targetStep, { x: -30, opacity: 0 });
        gsap.to(targetStep, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    });
  });
}

function _showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
  gsap.from(el, { y: -10, opacity: 0, duration: 0.25 });
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function _showLoading(btn, textEl, loaderEl) {
  btn.disabled = true;
  textEl.classList.add('hidden');
  loaderEl.classList.remove('hidden');
}

function _hideLoading(btn, textEl, loaderEl) {
  btn.disabled = false;
  textEl.classList.remove('hidden');
  loaderEl.classList.add('hidden');
}

function _bindForgotStep(container) {
  const backBtn = container.querySelector('#auth-forgot-back-btn');
  const submitBtn = container.querySelector('#auth-forgot-submit-btn');
  const emailInput = container.querySelector('#auth-forgot-email');
  const errorEl = container.querySelector('#auth-forgot-error');
  const successEl = container.querySelector('#auth-forgot-success');
  const loader = container.querySelector('#auth-forgot-submit-loader');
  const btnText = container.querySelector('#auth-forgot-submit-text');

  backBtn?.addEventListener('click', () => {
    const stepMain = container.querySelector('#auth-step-email');
    const stepForgot = container.querySelector('#auth-step-forgot');
    gsap.to(stepForgot, {
      x: 30, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => {
        stepForgot.classList.add('hidden');
        emailInput.value = '';
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        stepMain.classList.remove('hidden');
        gsap.set(stepMain, { x: -30, opacity: 0 });
        gsap.to(stepMain, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    });
  });

  submitBtn?.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
      _showError(errorEl, 'Please enter a valid email address');
      return;
    }

    _showLoading(submitBtn, btnText, loader);
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    try {
      await resetPasswordForEmail(email);
      _hideLoading(submitBtn, btnText, loader);
      _currentEmail = email;
      _otpType = 'recovery';
      
      const stepForgot = container.querySelector('#auth-step-forgot');
      const stepOTP = container.querySelector('#auth-step-otp');
      const otpDesc = container.querySelector('#auth-otp-desc');
      otpDesc.textContent = `Enter the 6-digit code sent to ${email} to reset your password.`;

      gsap.to(stepForgot, {
        x: -30, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: () => {
          stepForgot.classList.add('hidden');
          stepOTP.classList.remove('hidden');
          gsap.set(stepOTP, { x: 30, opacity: 0 });
          gsap.to(stepOTP, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
          const firstDigit = container.querySelector('.auth-otp-digit[data-index="0"]');
          if (firstDigit) firstDigit.focus();
        }
      });
      emailInput.value = '';
    } catch (err) {
      _hideLoading(submitBtn, btnText, loader);
      _showError(errorEl, err.message || 'Failed to send reset link.');
    }
  });
}

function _bindUpdatePasswordStep(container) {
  const submitBtn = container.querySelector('#auth-update-submit-btn');
  const passwordInput = container.querySelector('#auth-update-password');
  const errorEl = container.querySelector('#auth-update-error');
  const loader = container.querySelector('#auth-update-submit-loader');
  const btnText = container.querySelector('#auth-update-submit-text');

  submitBtn?.addEventListener('click', async () => {
    const password = passwordInput.value;
    if (!password || password.length < 6) {
      _showError(errorEl, 'Password must be at least 6 characters');
      return;
    }

    _showLoading(submitBtn, btnText, loader);
    errorEl.classList.add('hidden');

    try {
      const result = await updateUserPassword(password);
      _hideLoading(submitBtn, btnText, loader);
      if (_onAuthSuccess) _onAuthSuccess(result);
      hideAuthModal(container);
    } catch (err) {
      _hideLoading(submitBtn, btnText, loader);
      _showError(errorEl, err.message || 'Failed to update password.');
    }
  });
}
