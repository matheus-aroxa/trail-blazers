import { AuthGuard } from '@nestjs/passport';
import { GithubAuthGuard } from './github-auth.guard';

describe('GithubAuthGuard', () => {
  it('should be defined', () => {
    expect(new GithubAuthGuard()).toBeDefined();
  });

  it('estende o AuthGuard da strategy "github"', () => {
    expect(new GithubAuthGuard()).toBeInstanceOf(AuthGuard('github'));
  });
});
