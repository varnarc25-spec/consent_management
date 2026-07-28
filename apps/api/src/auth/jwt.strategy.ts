import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { AUTH_ERROR_CODES } from '@cmp/auth';
import { JWT_CONFIG } from '@cmp/config';
import type { Auth0TokenClaims, CurrentUser } from '@cmp/types';
import { Auth0ConfigService } from './auth0-config.service';
import { AuthService } from './auth.service';

interface CmpJwtPayload {
  sub: string;
  email: string;
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly auth0Mode: boolean;

  constructor(
    private readonly auth0Config: Auth0ConfigService,
    private readonly authService: AuthService,
  ) {
    const config = auth0Config.getConfig();
    const auth0Mode = config.configured;

    super(
      auth0Mode
        ? {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            audience: config.audience,
            issuer: config.issuer,
            algorithms: ['RS256'],
            secretOrKeyProvider: passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 10,
              jwksUri: `https://${config.domain}/.well-known/jwks.json`,
            }),
          }
        : {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: JWT_CONFIG.accessSecret(),
            algorithms: ['HS256'],
          },
    );

    this.auth0Mode = auth0Mode;
  }

  async validate(payload: Auth0TokenClaims | CmpJwtPayload): Promise<CurrentUser> {
    if (this.auth0Mode) {
      if (!payload?.sub) {
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.TOKEN_INVALID,
          message: 'Authentication required.',
        });
      }
      return this.authService.ensureFromAuth0Claims(payload as Auth0TokenClaims);
    }

    const cmpPayload = payload as CmpJwtPayload;
    if (cmpPayload.type !== 'access') {
      throw new UnauthorizedException({ code: 'TOKEN_INVALID', message: 'Invalid token type' });
    }
    return this.authService.getCurrentUser(cmpPayload.sub);
  }
}
