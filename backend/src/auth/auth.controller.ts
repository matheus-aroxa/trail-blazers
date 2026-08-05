import { Controller, Get, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { GithubAuthGuard } from './github-auth.guard';
import { GithubUser } from './types/github-user';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('github')
  @UseGuards(GithubAuthGuard)
  async githubAuth() {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubAuthCallback(@Req() req: Request, @Res() res: Response) {
    const githubUser = req.user as GithubUser | undefined;

    if (!githubUser) {
      throw new UnauthorizedException('Falha na autenticação com o GitHub');
    }

    const { accessToken } = await this.authService.loginWithGithub(githubUser);
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    res.redirect(`${frontendUrl}/auth/success?token=${accessToken}`);
  }
}
