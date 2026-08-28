import { UserRepository } from '../Repositorie/UserRepository.js';
import { verifyPassword } from '../Security/password.js';
import { signToken } from '../Security/jwt.js';
import { AppError } from '../Utils/AppError.js';
import { requireEmail, requireString } from '../Utils/validation.js';

export class AuthService {
  constructor(private users = new UserRepository()) {}

  async login(body: unknown) {
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données de connexion invalides.');
    const input = body as Record<string, unknown>;
    const email = requireEmail(input.email);
    const password = requireString(input.password, 'Mot de passe');
    const user = await this.users.findByEmail(email);
    if (!user) throw new AppError(401, 'Email ou mot de passe incorrect.');
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Email ou mot de passe incorrect.');
   if (!user.active) throw new AppError(401, 'Account disabled');
    const token = signToken({
  userId: Number(user.id),
  role: user.role
});
    return {
      token,
     user: {
  id: Number(user.id),
  name: user.name,
  role: user.role
}
    };
  }
}
