export const validation = {
  email: (email: string): { valid: boolean; error?: string } => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return { valid: false, error: 'Email es requerido' };
    if (!regex.test(email)) return { valid: false, error: 'Email inválido' };
    return { valid: true };
  },

  password: (password: string): { valid: boolean; error?: string } => {
    if (!password) return { valid: false, error: 'Contraseña es requerida' };
    if (password.length < 8) return { valid: false, error: 'Mínimo 8 caracteres' };
    return { valid: true };
  },

  username: (username: string): { valid: boolean; error?: string } => {
    if (!username) return { valid: false, error: 'Nombre de usuario es requerido' };
    if (username.length < 3) return { valid: false, error: 'Mínimo 3 caracteres' };
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Solo letras, números, _ y -' };
    }
    return { valid: true };
  },

  confirmPassword: (pw: string, confirmPw: string): { valid: boolean; error?: string } => {
    if (pw !== confirmPw) return { valid: false, error: 'Las contraseñas no coinciden' };
    return { valid: true };
  },
};
