import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_CONFIG } from '@cmp/config';
import type { CurrentUser } from '@cmp/types';
import { AuthService } from './auth.service';

interface JwtPayload {
  sub: string;
  email: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_CONFIG.accessSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Invalid token type' });
    }
    return this.authService.getCurrentUser(payload.sub);
  }
}
