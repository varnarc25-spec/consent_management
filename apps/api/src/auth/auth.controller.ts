import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  auth0CallbackSchema,
  forgotPasswordSchema,
  loginHistoryQuerySchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@cmp/validation';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ok } from '../common/utils/response';
import { AUTH0_CONFIG, AUTH_CONFIG, DOMAIN_CONFIG } from '@cmp/config';
import { Public } from './decorators/public.decorator';
import { CurrentUserDecorator } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: unknown) {
    return this.authService.register(body as Parameters<AuthService['register']>[0]).then(ok);
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) body: { token: string }) {
    return this.authService.verifyEmail(body.token).then(ok);
  }

  @Public()
  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string },
    @Req() req: Request,
  ) {
    return this.authService
      .login(body.email, body.password, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })
      .then(ok);
  }

  @Public()
  @Post('refresh')
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string },
    @Req() req: Request,
  ) {
    return this.authService
      .refresh(body.refreshToken, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })
      .then(ok);
  }

  @Post('logout')
  logout(@Body(new ZodValidationPipe(refreshTokenSchema)) body: { refreshToken: string }) {
    return this.authService.logout(body.refreshToken).then(ok);
  }

  @Post('logout-all')
  logoutAll(@CurrentUserDecorator() user: { id: string }) {
    return this.authService.logoutAll(user.id).then(ok);
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: { email: string }) {
    return this.authService.forgotPassword(body.email).then(ok);
  }

  @Public()
  @Post('reset-password')
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: { token: string; password: string },
  ) {
    return this.authService.resetPassword(body.token, body.password).then(ok);
  }

  @Public()
  @Post('auth0/callback')
  auth0Callback(
    @Body(new ZodValidationPipe(auth0CallbackSchema)) body: { idToken: string },
    @Req() req: Request,
  ) {
    return this.authService
      .loginWithAuth0(body.idToken, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })
      .then(ok);
  }

  @Public()
  @Get('config')
  config() {
    return ok({
      emailVerificationEnabled: AUTH_CONFIG.emailVerificationEnabled,
      auth0Enabled: AUTH0_CONFIG.enabled,
      domainAutoVerifyOnCreate: DOMAIN_CONFIG.autoVerifyOnCreate,
    });
  }

  @Get('me')
  me(@CurrentUserDecorator() user: unknown) {
    return ok(user);
  }

  @Get('login-history')
  async loginHistory(
    @CurrentUserDecorator() user: { id: string },
    @Query(new ZodValidationPipe(loginHistoryQuerySchema)) query: { limit: number },
  ) {
    const history = await this.authService.getLoginHistory(user.id, query.limit);
    return ok(history);
  }
}
