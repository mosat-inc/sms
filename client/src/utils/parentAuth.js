export const PARENT_TOKEN_KEY = 'parent_token';
export const PARENT_MUST_CHANGE_KEY = 'parent_must_change_password';

export function setParentToken(token) {
  if (!token) return;
  localStorage.setItem(PARENT_TOKEN_KEY, token);
}

export function setParentMustChangePassword(value) {
  localStorage.setItem(PARENT_MUST_CHANGE_KEY, value ? '1' : '0');
}

export function getParentMustChangePassword() {
  return localStorage.getItem(PARENT_MUST_CHANGE_KEY) === '1';
}

export function getParentToken() {
  return localStorage.getItem(PARENT_TOKEN_KEY);
}

export function clearParentToken() {
  localStorage.removeItem(PARENT_TOKEN_KEY);
  localStorage.removeItem(PARENT_MUST_CHANGE_KEY);
}
